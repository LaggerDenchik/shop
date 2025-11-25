import { 
  Controller, 
  Get, 
  Put, 
  Body, 
  UseInterceptors, 
  UploadedFile,
  UseGuards,
  Request,
  BadRequestException, 
  Post
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { multerConfig } from '../config/multer.config';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.settingsService.getUserProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateSettings(
    @Request() req,
    @Body() updateSettingsDto: UpdateSettingsDto
  ) {
    return this.settingsService.updateUserSettings(req.user.id, updateSettingsDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('avatar')
  @UseInterceptors(FileInterceptor('avatar', multerConfig))
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('Файл не был загружен');
    }
    
    return this.settingsService.uploadAvatar(req.user.id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Put('password')
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.settingsService.changePassword(req.user.id, changePasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('permissions')
  async getAllPermissions() {
    return this.settingsService.getAllPermissions();
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.settingsService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.settingsService.resetPassword(token, password);
  }
}
