import { IsString, IsOptional, IsEmail, MinLength, Matches } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Имя должно содержать минимум 2 символа' })
  name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { 
    message: 'Номер телефона должен быть в международном формате' 
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  newPassword?: string;
}