import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    // console.log(`Auth attempt: ${email}`); это был дебаг, пытался понять что не так
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      console.log('Invalid credentials for:', email);
      throw new UnauthorizedException('Неверные учетные данные');
    }
    // console.log('Auth success:', user.email);
    return user;
  }
}