import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';  
import { Role } from './entities/role.entity';
import { Organization } from './entities/organization.entity';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
// import { EmailVerification } from './entities/email-verification.entity';
// import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  async findUserById(id: string, relations: string[] = []) {
    return this.usersRepository.findOne({
      where: { id },
      relations
    });
  }
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,

    private readonly jwtService: JwtService,
    // @InjectRepository(EmailVerification)
    // private readonly verificationRepository: Repository<EmailVerification>,
  ) {}

  // времено отключил верификацию почты

  // async sendVerificationCode(email: string): Promise<void> {
  //   const user = await this.usersRepository.findOne({ where: { email } });
  //   if (!user) throw new BadRequestException('Пользователь не найден');

  //   if (user.is_email_verified) {
  //     throw new BadRequestException('Email уже подтвержден');
  //   }

  //   const code = Math.floor(100000 + Math.random() * 900000).toString();
  //   const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

  //   const record = this.verificationRepository.create({ email, code, expiresAt });
  //   await this.verificationRepository.save(record);

  //   await this.sendEmail(email, code);
  // }

  // async verifyEmailCode(email: string, code: string): Promise<void> {
  //   const record = await this.verificationRepository.findOne({
  //     where: { email, code },
  //     order: { created_at: 'DESC' },
  //   });

  //   if (!record) throw new BadRequestException('Неверный код');
  //   if (record.expiresAt < new Date()) throw new BadRequestException('Код истёк');

  //   const user = await this.usersRepository.findOne({ where: { email } });
  //   if (!user) throw new BadRequestException('Пользователь не найден');

  //   user.is_email_verified = true;
  //   await this.usersRepository.save(user);

  //   await this.verificationRepository.delete({ email }); // очищаем старые коды
  // }

  // async resendVerificationCode(email: string): Promise<void> {
  //   const user = await this.usersRepository.findOne({ where: { email } });
  //   if (!user) throw new BadRequestException('Пользователь не найден');
  //   if (user.is_email_verified) throw new BadRequestException('Email уже подтвержден');

  //   await this.sendVerificationCode(email);
  // }

  // private async sendEmail(email: string, code: string) {
  //   const transporter = nodemailer.createTransport({
  //     host: process.env.SMTP_HOST,
  //     port: Number(process.env.SMTP_PORT),
  //     secure: process.env.SMTP_SECURE === 'true', // true для SSL (465)
  //     auth: {
  //       user: process.env.SMTP_USER,
  //       pass: process.env.SMTP_PASS,
  //     },
  //   });

  //   await transporter.sendMail({
  //     from: `"MonteGroup" <${process.env.SMTP_USER}>`,
  //     to: email,
  //     subject: 'Подтверждение электронной почты',
  //     text: `Ваш код подтверждения: ${code}`,
  //     html: `
  //       <div style="font-family: sans-serif; padding: 20px;">
  //         <h2>Подтверждение регистрации</h2>
  //         <p>Ваш код подтверждения:</p>
  //         <h1 style="color: #2a7ae2;">${code}</h1>
  //         <p>Он действителен 15 минут.</p>
  //       </div>
  //     `,
  //   });
  // }


  async register(dto: RegisterDto) {
    const { email, phone, password, fullName, type, organizationName, representative, unp } = dto;

    if (!email && !phone) {
      throw new BadRequestException('Укажите email или телефон');
    }

    const existing = await this.usersRepository.findOne({
      where: [{ email }, { phone }],
    });

    if (existing) {
      throw new ConflictException('Пользователь с таким email или телефоном уже существует');
    }

    // роль по умолчанию — customer
    let role = await this.rolesRepository.findOne({ where: { name: 'customer' } });
    let organizationId: string | null = null;

    // если это организация
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

      // назначаем роль org_admin
      role = await this.rolesRepository.findOne({ where: { name: 'org_admin' } });
    }

    const user = this.usersRepository.create({
      email,
      phone,
      password,
      fullName,
      type: 'customer',
      ...(organizationId ? { organizationId } : {}), // ✅ добавляем только если есть
      roleId: role?.id,
      isVerified: true,
      isEmailVerified: true,
    });


    await this.usersRepository.save(user);

    return this.generateToken(user);
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

  async login(user: any) {
    // По умолчанию — физлицо
    let userType = 'customer';

    // Проверяем role_id
    if (
      user.roleId === 'b305b4e2-f078-4a27-90fd-cb3322cf7d1e' || // org_admin
      user.roleId === '7fc971b0-50b4-4b00-be6b-bba457656160'    // org_user
    ) {
      userType = 'organization';
    }

    const payload = {
      sub: user.id,
      email: user.email,
      type: userType,
      name: user.fullName,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        roleId: user.roleId,
        createdAt: user.createdAt,
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

  private async generateToken(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      type: user.type,
      name: user.fullName,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        type: user.type,
        createdAt: user.createdAt,
      },
    };
  }
}