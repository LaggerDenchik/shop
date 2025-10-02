import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus, Get, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Request() req) {
    // req.user содержит данные из JWT токена
    return this.authService.findUserById(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('test-protected')
  async testProtected(@Request() req) {
    return req.user;
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Инициирует аутентификацию через Google
  }
  
  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const token = await this.authService.login(req.user);
    res.redirect(`http://localhost:3000/login-success?token=${token.access_token}`);
  }
}