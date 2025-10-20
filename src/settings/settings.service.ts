import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

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
}