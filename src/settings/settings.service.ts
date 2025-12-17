import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Permission } from '../auth/entities/permission.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import * as nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,

    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepo: Repository<PasswordResetToken>,
  ) {}

  async getAllPermissions() {
      const permissions = await this.permissionsRepository.find({
        order: { groups: 'ASC', name: 'ASC' },
      });
  
      // Можно вернуть структурировано по группам
      const grouped = permissions.reduce((acc, perm) => {
        const group = perm.groups || 'general';
        if (!acc[group]) acc[group] = [];
        acc[group].push({
          id: perm.id,
          tag: perm.tag,
          name: perm.name,
        });
        return acc;
      }, {} as Record<string, any[]>);
  
      return grouped;
    }

  async updateUserSettings(userId: string, updateSettingsDto: UpdateSettingsDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Проверка текущего пароля при смене пароля
    if (updateSettingsDto.newPassword) {
      if (!updateSettingsDto.currentPassword) {
        throw new BadRequestException('Текущий пароль обязателен для смены пароля');
      }

      const isCurrentPasswordValid = await user.comparePassword(updateSettingsDto.currentPassword);
      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Неверный текущий пароль');
      }

      user.password = updateSettingsDto.newPassword;
    }

    // Обновление остальных полей
    if (updateSettingsDto.name !== undefined) {
      user.fullName = updateSettingsDto.name;
    }

    if (updateSettingsDto.avatar !== undefined) {
      user.avatar = updateSettingsDto.avatar;
    }

    if (updateSettingsDto.phone !== undefined) {
      user.phone = updateSettingsDto.phone;
    }

    return await this.usersRepository.save(user);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const filename = file.filename || file.originalname;
    const avatarUrl = `/uploads/avatars/${filename}`;
    
    user.avatar = avatarUrl;
    await this.usersRepository.save(user);

    return { avatarUrl };
  }

  async getUserProfile(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'fullName', 'avatar', 'phone', 'createdAt']
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }
  // async getUserProfile(userId: string) {
  //   const user = await this.usersRepository.findOne({
  //     where: { id: userId },
  //     relations: [
  //       'role',
  //       'role.permissions',
  //       'permissions',
  //       'organization'
  //     ]
  //   });

  //   if (!user) {
  //     throw new NotFoundException('Пользователь не найден');
  //   }

  //   return {
  //     id: user.id,
  //     email: user.email,
  //     fullName: user.fullName,
  //     phone: user.phone,
  //     avatar: user.avatar,
  //     createdAt: user.createdAt,

  //     type: user.type,
  //     roleName: user.role?.name ?? null,

  //     organizationId: user.organizationId ?? null,

  //     permissions: [
  //       ...(user.permissions?.map(p => p.tag) ?? []),
  //       ...(user.role?.permissions?.map(p => p.tag) ?? [])
  //     ]
  //   };
  // }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.usersRepository.findOne({ 
      where: { id: userId } 
    });
    
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Проверяем текущий пароль
    const isCurrentPasswordValid = await user.comparePassword(changePasswordDto.currentPassword);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Неверный текущий пароль');
    }

    // Новый пароль (автоматически хешируется благодаря @BeforeUpdate)
    user.password = changePasswordDto.newPassword;
    
    await this.usersRepository.save(user);

    return {
      message: 'Пароль успешно изменен',
      status: 'success'
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersRepository.findOne({ where: { email } });

    // Не выдаём, есть ли такой email
    if (!user) {
      return { message: "Если email существует — письмо отправлено" };
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 минут

    await this.resetTokenRepo.save({
      token,
      user,
      expiresAt,
    });

    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await this.sendResetPasswordEmail(email, link);

    return { message: "Ссылка на сброс пароля отправлена" };
  }

  private async sendResetPasswordEmail(email: string, link: string) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true', // true для SSL (465)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // ТОЛЬКО ПОКА НЕТ СЕРТИФИКАТА
      },
    });

    await transporter.sendMail({
      from: `"Monte Group" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Сброс пароля',
      text: `Для сброса пароля перейдите по ссылке: ${link}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Сброс пароля</h2>
          <p>Вы запросили восстановление доступа.</p>

          <p>Нажмите кнопку ниже, чтобы создать новый пароль:</p>

          <a href="${link}"
            style="
              display:inline-block;
              padding: 12px 20px;
              margin-top: 10px;
              background:#2a7ae2;
              color:#fff;
              text-decoration:none;
              border-radius:6px;
              font-weight:bold;">
            Сбросить пароль
          </a>

          <p style="margin-top:20px;">Ссылка действует 15 минут.</p>
          <p>Если вы не запрашивали сброс, просто игнорируйте это письмо.</p>
        </div>
      `,
    });
  }

  async resetPassword(token: string, password: string) {
    const record = await this.resetTokenRepo.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Неверный или просроченный токен');
    }

    const user = record.user;

    user.password = password;
    await this.usersRepository.save(user);

    record.used = true;
    await this.resetTokenRepo.save(record);

    return { message: "Пароль успешно обновлён" };
  }
}
