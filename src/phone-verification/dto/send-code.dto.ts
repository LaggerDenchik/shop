import { IsPhoneNumber } from 'class-validator';

export class SendCodeDto {
  @IsPhoneNumber('BY')
  phone: string;
}
