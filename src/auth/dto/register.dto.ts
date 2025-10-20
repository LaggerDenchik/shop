import { IsEmail, IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsIn(['staff', 'customer'])
  @IsOptional()
  type?: 'staff' | 'customer';
}
