import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Response } from 'express';
import { Res } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  usersRepository: any;
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Request() req,
    @Res({ passthrough: true }) res: Response
  ) {
    const { access_token, user } = await this.authService.login(req.user);

    // Сохраняем JWT в httpOnly cookie
    res.cookie('jwt', access_token, {
      httpOnly: true,
      // secure: true, для продакшена
      sameSite: 'lax', // или 'none' если фронт на другом домене с HTTPS
      maxAge: 60 * 60 * 1000, // 1 час
    });

    return { message: 'Logged in', user };
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
      // secure: true, для продакшена
      sameSite: 'lax',
    });

    return { message: 'Logged out' };
  }

  
  // ============== endpoint'ы для гугла =================

  
//   @Get('google')
//   @UseGuards(AuthGuard('google'))
//   async googleAuth() {
//     // Инициирует аутентификацию через Google
//   }
  
//   @Get('google/redirect')
//   @UseGuards(AuthGuard('google'))
//   async googleAuthRedirect(@Req() req, @Res() res) {
//     const token = await this.authService.login(req.user);
//     res.redirect(`http://localhost:3000/login-success?token=${token.access_token}`);
//   }
}