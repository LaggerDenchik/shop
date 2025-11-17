import { Controller, Post, Body } from '@nestjs/common';
import { PhoneVerificationService } from './phone-verification.service';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';

@Controller('phone')
export class PhoneVerificationController {
  constructor(private readonly service: PhoneVerificationService) {}

  @Post('send-code')
  sendCode(@Body() dto: SendCodeDto) {
    return this.service.sendCode(dto.phone);
  }

  @Post('verify')
  verify(@Body() dto: VerifyCodeDto) {
    return this.service.verify(dto.phone, dto.code);
  }
}
