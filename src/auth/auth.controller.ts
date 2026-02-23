import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Response } from 'express';
import { Res } from '@nestjs/common';
import { CabinetsService } from '../cabinets/cabinets.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  usersRepository: any;
  constructor(
    private authService: AuthService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req, @Res({ passthrough: true }) res: Response) {
    const { access_token, user } = await this.authService.login(req.user);

    // Сохраняем JWT в httpOnly cookie
    res.cookie('jwt', access_token, {
      httpOnly: true,
      secure: true, // true если https
      sameSite: 'none',
      domain: 'mgshop.by',
      path: '/',
      maxAge: 1000 * 60 * 60, // 1 час
    });

    return {
      message: 'Logged in',
      user,
    };
  }

  @Post('send-verification-code')
  async sendVerification(@Body('email') email: string) {
    await this.authService.sendVerificationCode(email);
    return { message: 'Код подтверждения отправлен на почту' };
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: { email: string; code: string }) {
    await this.authService.verifyEmailCode(body.email, body.code);
    return { message: 'Email успешно подтверждён' };
  }

  @Post('resend-verification')
  async resend(@Body('email') email: string) {
    await this.authService.resendVerificationCode(email);
    return { message: 'Код повторно отправлен' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    // Удаляем cookie
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: false,
      sameSite: 'none',
      domain: 'mgshop.by',
      path: '/',
    });

    return { message: 'Logged out' };
  }

  /** Silent check + создание guest, если нет пользователя */
  @Get('me')
  async getProfile(@Req() req) {
    const user = req.user;

    if (!user) {
      // Просто возвращаем "виртуального" гостя
      return {
        id: null,
        fullName: 'Гость',
        type: 'guest',
        roleName: null,
        permissions: [],
        guest: true,
      };
    }

    return {
      id: user.id,
      fullName: user.fullName,
      type: user.type,
      roleName: user.role?.name || user.role?.tag,
      permissions: user.permissions?.map(p => p.tag) || [],
      guest: false,
    };
  }

  // ============== endpoint'ы для гугла =================

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // redirect на Google автоматически через Passport
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const token = await this.authService.login(req.user); // JWT
    // редирект на фронт с токеном
    res.redirect(`https://mgshop.by/login-success?token=${token.access_token}`);
  }
}
