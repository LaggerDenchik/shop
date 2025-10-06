import { 
  Controller, 
  Get, 
  Put, 
  Body, 
  UseInterceptors, 
  UploadedFile,
  UseGuards,
  Request 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    return this.settingsService.getUserProfile(req.user.id);
  }

  @Put('profile')
  async updateSettings(
    @Request() req,
    @Body() updateSettingsDto: UpdateSettingsDto
  ) {
    return this.settingsService.updateUserSettings(req.user.id, updateSettingsDto);
  }

  @Put('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.settingsService.uploadAvatar(req.user.id, file);
  }

  @Put('password')
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.settingsService.changePassword(req.user.id, changePasswordDto);
  }
}