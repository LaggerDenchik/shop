import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class VerifyCodeDto {
  @IsPhoneNumber('BY')
  phone: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
