import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  config: any;
  constructor(
    private authService: AuthService,
    private configService: ConfigService
  ) {
    super({
      clientID: configService.getOrThrow('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow('GOOGLE_CLIENT_SECRET'),
      callbackURL: 'http://194.62.19.106:3000/api/auth/google/redirect',
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });

    console.log('Google strategy config:', {
      clientID: this.config.clientID,
      callbackURL: this.config.callbackURL
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any
  ) {
     return {
      email: profile.emails[0].value,
      name: profile.displayName,
      provider: 'google'
    };

    

  }
  
}