import { IsEmail, IsOptional, IsString, IsIn, IsPhoneNumber } from 'class-validator';

export class RegisterDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsIn(['customer', 'staff', 'organization'])
  type?: 'customer' | 'staff' | 'organization';

  // поля для юрлица
  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  representative?: string;

  @IsOptional()
  @IsString()
  unp?: string;
}
