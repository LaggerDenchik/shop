import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';  
import { Role } from './entities/role.entity';
import { Organization } from './entities/organization.entity';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { EmailVerification } from './entities/email-verification.entity';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    
    @InjectRepository(EmailVerification)
    private readonly verificationRepository: Repository<EmailVerification>,

    private readonly jwtService: JwtService,
  ) {}

  async sendVerificationCode(email: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) throw new BadRequestException('Пользователь не найден');
    if (user.isEmailVerified) throw new BadRequestException('Email уже подтверждён');

    // Проверка на существующий код
    const existing = await this.verificationRepository.findOne({
      where: { email },
      order: { createdAt: 'DESC' },
    });

    if (existing && existing.expiresAt > new Date()) {
      throw new BadRequestException('Код уже был отправлен, попробуйте позже');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const record = this.verificationRepository.create({ email, code, expiresAt });
    await this.verificationRepository.save(record);

    await this.sendEmail(email, code);
  }

  async verifyEmailCode(email: string, code: string): Promise<void> {
    const record = await this.verificationRepository.findOne({
      where: { email, code },
      order: { createdAt: 'DESC' },
    });

    if (!record) throw new BadRequestException('Неверный код подтверждения');
    if (record.expiresAt < new Date()) {
      await this.verificationRepository.delete({ email });
      throw new BadRequestException('Код истёк, запросите новый');
    }

    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) throw new BadRequestException('Пользователь не найден');

    user.isEmailVerified = true;
    await this.usersRepository.save(user);
    await this.verificationRepository.delete({ email });
  }

  async resendVerificationCode(email: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) throw new BadRequestException('Пользователь не найден');
    if (user.isEmailVerified) throw new BadRequestException('Email уже подтвержден');

    await this.sendVerificationCode(email);
  }

  private async sendEmail(email: string, code: string) {
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
      subject: 'Подтверждение электронной почты',
      text: `Ваш код подтверждения: ${code}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Подтверждение регистрации</h2>
          <p>Ваш код подтверждения:</p>
          <h1 style="color: #2a7ae2;">${code}</h1>
          <p>Он действителен 15 минут.</p>
        </div>
      `,
    });
  }

  async register(dto: RegisterDto) {
    const { email, phone, password, fullName, type, organizationName, representative, unp } = dto;

    if (!email && !phone) {
      throw new BadRequestException('Укажите email или телефон');
    }

    const existing = await this.usersRepository.findOne({ where: [{ email }, { phone }] });
    if (existing) throw new ConflictException('Пользователь уже существует');

    let organizationId: string | null = null;
    let role: Role | null = null;

    if (type === 'organization') {
      if (!organizationName) throw new BadRequestException('Не указано название организации');
      const org = this.orgRepository.create({
        name: organizationName,
        representative: representative ?? fullName,
        unp,
        email,
        phone,
      });
      const savedOrg = await this.orgRepository.save(org);
      organizationId = savedOrg.id;

      role = await this.rolesRepository.findOne({ where: { name: 'org_admin' }, relations: ['permissions'] });
    } else {
      role = await this.rolesRepository.findOne({ where: { name: 'customer' }, relations: ['permissions'] });
    }

    const user = this.usersRepository.create({
      email,
      phone,
      password,
      fullName,
      type,
      organizationId,
      roleId: role?.id,
      isEmailVerified: false,
      isVerified: false,
    });

    await this.usersRepository.save(user);

    // Сразу отправляем код подтверждения
    await this.sendVerificationCode(user.email);

    return { message: 'Регистрация успешна. Подтвердите email, код отправлен на почту.' };
  }

  async validateLogin(login: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: [{ email: login }, { phone: login }],
      select: ['id', 'email', 'phone', 'password', 'fullName', 'type', 'createdAt', 'roleId'],
    });

    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch ? user : null;
  }

  async validateUserById(userId: string) {
    return this.usersRepository.findOne({ where: { id: userId } });
  }

  async login(user: User) {
    // Загружаем пользователя со связями role и permissions
    const userWithRelations = await this.usersRepository.findOne({
      where: { id: user.id },
      relations: ['role', 'role.permissions', 'permissions'], // важно!
    });
    
    if (!userWithRelations) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (!userWithRelations.isEmailVerified) {
      throw new ForbiddenException('Email не подтверждён');
    }

    // Определяем тип пользователя (для маршрутизации фронта)
    let userType = 'customer';
    if (
      userWithRelations.role?.name === 'org_admin' ||
      userWithRelations.role?.name === 'org_user'
    ) {
      userType = 'organization';
    } else if (userWithRelations.role?.name?.includes('admin')) {
      userType = 'admin';
    }

    // Объединяем права из роли и персональные
    const rolePerms = userWithRelations.role?.permissions?.map(p => p.tag) || [];
    const userPerms = userWithRelations.permissions?.map(p => p.tag) || [];

    // Убираем дубликаты
    const mergedPermissions = Array.from(new Set([...rolePerms, ...userPerms]));

    const payload = {
      sub: userWithRelations.id,
      email: userWithRelations.email,
      type: userType,
      name: userWithRelations.fullName,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: userWithRelations.id,
        email: userWithRelations.email,
        fullName: userWithRelations.fullName,
        phone: userWithRelations.phone,
        roleId: userWithRelations.roleId,
        roleName: userWithRelations.role?.name,
        permissions: mergedPermissions,
        createdAt: userWithRelations.createdAt,
        type: userType,
      },
    };
  }

  async validateOrCreateUser(profile: {
    email: string;
    fullName: string;
    provider?: string;
  }) {
    let user = await this.usersRepository.findOne({ where: { email: profile.email } });

    if (!user) {
      user = this.usersRepository.create({
        email: profile.email,
        fullName: profile.fullName,
        isVerified: true,
        isEmailVerified: true,
        provider: profile.provider ?? 'google',
        password: await bcrypt.hash(Math.random().toString(36), 10),
      });
      console.log('Создаём пользователя:', user);
      await this.usersRepository.save(user);
      console.log('Пользователь сохранён');
    }

    const fullUser = await this.usersRepository.findOne({
      where: { id: user.id },
      select: ['id', 'email', 'fullName', 'phone', 'type', 'createdAt'],
    });

    return fullUser;
  }

}