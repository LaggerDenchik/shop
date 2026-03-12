import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@auth/entities/user.entity';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {

  constructor(
    private configService: ConfigService,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {
    super({
      clientID: configService.getOrThrow('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {

    const email = profile.emails?.[0]?.value;
    const fullName = profile.displayName;

    let user = await this.usersRepository.findOne({
      where: { email }
    });

    if (!user) {

      user = this.usersRepository.create({
        email,
        fullName,
        provider: 'google',
        type: 'customer',
        isEmailVerified: true
      });

      user = await this.usersRepository.save(user);
    }

    return user;
  }
}