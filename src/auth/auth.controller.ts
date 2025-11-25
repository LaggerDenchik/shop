import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
// import { AuthGuard } from '@nestjs/passport';

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
  @HttpCode(HttpStatus.OK) // Явно указываем статус 200
  async login(@Request() req) {
    return this.authService.login(req.user);
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