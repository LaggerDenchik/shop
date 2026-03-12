import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Organization } from './entities/organization.entity';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { EmailVerification } from './entities/email-verification.entity';
import * as nodemailer from 'nodemailer';
import { TokenPayload } from './interfaces/token-payload.interface';
import { DataSource } from 'typeorm';

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
    private dataSource: DataSource,
  ) { }

  async sendVerificationCode(email: string, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(EmailVerification) : this.verificationRepository;

    const existing = await repo.findOne({
      where: { email },
      order: { createdAt: 'DESC' },
    });

    if (existing && existing.expiresAt > new Date()) {
      throw new BadRequestException('Код уже был отправлен, попробуйте позже');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const record = repo.create({ email, code, expiresAt });
    await repo.save(record);

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

  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  private async sendEmail(email: string, code: string) {
    await this.transporter.sendMail({
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

    if (existing) {
      throw new ConflictException('Пользователь уже существует');
    }

    return this.dataSource.transaction(async (manager) => {
      let organizationId: string | null = null;

      let role: Role | null = null;

      if (type === 'organization') {
        if (!organizationName) {
          throw new BadRequestException('Не указано название организации');
        }

        const org = manager.create(Organization, {
          name: organizationName,
          representative: representative ?? fullName,
          unp,
          email,
          phone,
        });

        const savedOrg = await manager.save(org);
        organizationId = savedOrg.id;

        role = await manager.findOne(Role, {
          where: { name: 'org_admin' },
        });
      } else {
        role = await manager.findOne(Role, {
          where: { name: 'customer' },
        });
      }

      if (!role) {
        throw new InternalServerErrorException('Роль не найдена');
      }

      const user = manager.create(User, {
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

      await manager.save(user);

      if (email) {
        await this.sendVerificationCode(email, manager);
      }

      return {
        message: 'Регистрация успешна. Подтвердите email, код отправлен на почту.',
      };
    });
  }

  async validateLogin(login: string, password: string): Promise<User | null> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'rolePermissions')
      .leftJoinAndSelect('user.permissions', 'userPermissions')
      .where('user.email = :login OR user.phone = :login', { login })
      .getOne();

    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch ? user : null;
  }

  async validateUserById(userId: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['role', 'role.permissions', 'permissions'],
    });
    return user;
  }

  async login(user: User) {
    const userWithPermissions = await this.usersRepository.findOne({
      where: { id: user.id },
      relations: ['role', 'role.permissions', 'permissions'],
    });

    if (!userWithPermissions) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (!userWithPermissions.isEmailVerified) {
      throw new ForbiddenException('Email не подтверждён');
    }

    const role = userWithPermissions.role;

    const userType =
      role?.name === 'org_admin' || role?.name === 'org_user'
        ? 'organization'
        : role?.name?.includes('admin')
          ? 'admin'
          : 'customer';

    const rolePerms = role?.permissions?.map((p) => p.tag) ?? [];
    const userPerms = userWithPermissions.permissions?.map((p) => p.tag) ?? [];

    const mergedPermissions = [...new Set([...rolePerms, ...userPerms])];

    const payload: TokenPayload = {
      sub: userWithPermissions.id,
      email: userWithPermissions.email,
      type: userType,
      name: userWithPermissions.fullName,
      role: role?.name ?? null,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      user: {
        id: userWithPermissions.id,
        email: userWithPermissions.email,
        fullName: userWithPermissions.fullName,
        phone: userWithPermissions.phone,
        roleId: role?.id ?? null,
        roleName: role?.name ?? null,
        permissions: mergedPermissions,
        createdAt: userWithPermissions.createdAt,
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