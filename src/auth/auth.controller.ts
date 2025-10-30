import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus, Get, Req, Res, NotFoundException, Put, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Request() req) {
    // req.user содержит данные из JWT токена
    return this.authService.findUserById(req.user.id);
  }
  
  @UseGuards(JwtAuthGuard)
  @Get('organization')
  async getMyOrganization(@Request() req) {
    const user = await this.authService.findUserById(req.user.id, ['organization']);

    if (!user?.organization) {
      throw new NotFoundException('Организация не найдена для данного пользователя');
    }

    const org = user.organization;

    return {
      ...org,
      avatar: user.avatar
        ? `${user.avatar}`
        : null
    };
  }

  
  @UseGuards(JwtAuthGuard)
  @Put('organization')
  async updateMyOrganization(@Request() req, @Body() body) {
    if (!req.user?.id) {
      throw new NotFoundException('Пользователь не найден');
    }

    const user = await this.authService.findUserById(req.user.id);
    if (!user?.organizationId) {
      throw new NotFoundException('Организация не найдена');
    }

    return this.authService.updateOrganization(user.organizationId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('employees')
  async getOrganizationEmployees(@Request() req) {
    return this.authService.getOrganizationEmployees(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('employees')
  async createEmployee(@Request() req, @Body() body) {
    return this.authService.createEmployee(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Put('employees/:id')
  async updateEmployee(@Request() req, @Param('id') id: string, @Body() body) {
    return this.authService.updateEmployee(req.user.id, id, body);
  }
  
  // @Post('test-login')
  // async testLogin(@Body() body) {
  //   return this.authService.validateLogin(body.login, body.password);
  // }

  // ============== endpoint'ы для верификации почты, пока не используем, поскольку нет SSL сертификата ===============


  // @Post('send-verification-code')
  // async sendVerification(@Body('email') email: string) {
  //   await this.authService.sendVerificationCode(email);
  //   return { message: 'Код подтверждения отправлен на почту' };
  // }

  // @Post('verify-email')
  // async verifyEmail(@Body() body: { email: string; code: string }) {
  //   await this.authService.verifyEmailCode(body.email, body.code);
  //   return { message: 'Email успешно подтверждён' };
  // }

  // @Post('resend-verification')
  // async resend(@Body('email') email: string) {
  //   await this.authService.resendVerificationCode(email);
  //   return { message: 'Код повторно отправлен' };
  // }
  

  
  // ============== endpoint'ы для гугла =================

  
  // @Get('google')
  // @UseGuards(AuthGuard('google'))
  // async googleAuth() {
  //   // Инициирует аутентификацию через Google
  // }
  
  // @Get('google/redirect')
  // @UseGuards(AuthGuard('google'))
  // async googleAuthRedirect(@Req() req, @Res() res) {
  //   const token = await this.authService.login(req.user);
  //   res.redirect(`http://localhost:3000/login-success?token=${token.access_token}`);
  // }
}