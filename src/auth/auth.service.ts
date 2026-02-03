import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
// import { TokenPayload } from './interfaces/token-payload.interface';

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

    const existing = await this.usersRepository.findOne({
      where: [{ email }, { phone }],
    });
    if (existing) throw new ConflictException('Пользователь уже существует');

    let organizationId: string | null = null;
    let role: Role | undefined;

    if (type === 'organization') {
      if (!organizationName) {
        throw new BadRequestException('Не указано название организации');
      }

      const org = this.orgRepository.create({
        name: organizationName,
        representative: representative ?? fullName,
        unp,
        email,
        phone,
      });

      const savedOrg = await this.orgRepository.save(org);
      organizationId = savedOrg.id;

      role = await this.rolesRepository.findOne({
        where: { name: 'org_admin' },
      }) ?? undefined;
    } else {
      role = await this.rolesRepository.findOne({
        where: { name: 'customer' },
      }) ?? undefined;
    }

    if (!role) {
      throw new InternalServerErrorException('Роль не найдена');
    }

    const user = this.usersRepository.create({
      email,
      phone,
      password,
      fullName,
      type,
      organizationId,
      role,
      isEmailVerified: false,
      isVerified: false,
    });

    await this.usersRepository.save(user);

    await this.sendVerificationCode(user.email);

    return {
      message: 'Регистрация успешна. Подтвердите email, код отправлен на почту.',
    };
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

  // async validateLogin(login: string, password: string): Promise<User | null> {
  //   const user = await this.usersRepository
  //     .createQueryBuilder('user')
  //     .leftJoinAndSelect('user.role', 'role')
  //     .leftJoinAndSelect('role.permissions', 'rolePermissions')
  //     .leftJoinAndSelect('user.permissions', 'userPermissions')
  //     .where('user.email = :login OR user.phone = :login', { login })
  //     .getOne();

  //   if (!user) return null;

  //   const isMatch = await bcrypt.compare(password, user.password);
  //   return isMatch ? user : null;
  // }

  async validateUserById(userId: string) {
    return this.usersRepository.findOne({ where: { id: userId } });
  }

  // async validateUserById(userId: string): Promise<User | null> {
  //   const user = await this.usersRepository.findOne({
  //     where: { id: userId },
  //     relations: ['role', 'role.permissions', 'permissions'],
  //   });
  //   return user;
  // }
  
  async login(user: User) {
    const userWithRelations = await this.usersRepository.findOne({
      where: { id: user.id },
      relations: ['role', 'role.permissions'], 
    });
    

    if (!userWithRelations) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (!userWithRelations.isEmailVerified) {
      throw new ForbiddenException('Email не подтверждён');
    }

    let userType = 'customer';

    if (
      userWithRelations.role?.name === 'org_admin' ||
      userWithRelations.role?.name === 'org_user'
    ) {
      userType = 'organization';
    } else if (userWithRelations.role?.name?.includes('admin')) {
      userType = 'admin';
    }

    const permissions =
      userWithRelations.role?.permissions?.map(p => p.tag) ?? [];
    userWithRelations.permissions =userWithRelations.role?.permissions ?? [];

    const payload = {
      sub: userWithRelations.id,
      email: userWithRelations.email,
      type: userType,
      name: userWithRelations.fullName,
      role: userWithRelations.role?.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: userWithRelations.id,
        email: userWithRelations.email,
        fullName: userWithRelations.fullName,
        phone: userWithRelations.phone,
        roleId: userWithRelations.role?.id,
        roleName: userWithRelations.role?.name,
        permissions,
        createdAt: userWithRelations.createdAt,
        type: userType,
      },
    };
  }

  // async login(user: User) {
  //   const role = user.roleId
  //     ? await this.rolesRepository.findOne({
  //         where: { id: user.roleId },
  //         relations: ['permissions'],
  //       })
  //     : null;

  //   const userWithPermissions = await this.usersRepository.findOne({
  //     where: { id: user.id },
  //     relations: ['role', 'role.permissions', 'permissions'],
  //   });

  //   if (!userWithPermissions) throw new NotFoundException('Пользователь не найден');
  //   if (!userWithPermissions.isEmailVerified) throw new ForbiddenException('Email не подтверждён');

  //   const userType = role?.name === 'org_admin' || role?.name === 'org_user'
  //     ? 'organization'
  //     : role?.name?.includes('admin')
  //       ? 'admin'
  //       : 'customer';

  //   const rolePerms = role?.permissions?.map(p => p.tag) || [];
  //   const userPerms = userWithPermissions.permissions?.map(p => p.tag) || [];
  //   const mergedPermissions = Array.from(new Set([...rolePerms, ...userPerms]));

  //   const payload: TokenPayload = {
  //     sub: user.id,
  //     email: user.email,
  //     type: userType,
  //     name: user.fullName,
  //   };

  //   return {
  //     access_token: this.jwtService.sign(payload),
  //     user: {
  //       id: user.id,
  //       email: user.email,
  //       fullName: user.fullName,
  //       phone: user.phone,
  //       roleId: role?.id || null,
  //       roleName: role?.name || null,
  //       permissions: mergedPermissions,
  //       createdAt: user.createdAt,
  //       type: userType,
  //     },
  //   };
  // }

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

    if (!fullUser) throw new NotFoundException('Пользователь не найден');

    return fullUser;
  }

  /** Создать guest-пользователя */
  // async createGuestUser(): Promise<Partial<User>> {
  //   return {
  //     id: 'guest',
  //     fullName: 'Гость',
  //     type: 'guest',
  //     permissions: [],
  //   };
  // }

  /** Генерация JWT */
  generateJwt(user: User): string {
    return this.jwtService.sign({ sub: user.id });
  }

  /** Обновление профиля текущего пользователя */
  async getUserById(id: string, relations: string[] = []): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations,
    });
    if (!user) throw new NotFoundException('Пользователь не найден'); // теперь TS понимает, что user не null
    return user;
  }
}