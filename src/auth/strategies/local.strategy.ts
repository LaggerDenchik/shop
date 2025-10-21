import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'login' }); // универсальное для email или phone
  }

  async validate(login: string, password: string) {
    const user = await this.authService.validateLogin(login, password);
    if (!user) {
      throw new UnauthorizedException('Неверные учетные данные');
    }
    return user;
  }
}