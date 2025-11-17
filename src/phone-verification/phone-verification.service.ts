import { Injectable, BadRequestException } from '@nestjs/common';

const store = new Map<string, { code: string; expires: number }>();

@Injectable()
export class PhoneVerificationService {
  async sendCode(phone: string) {
    const code = this.generateCode();
    const expires = Date.now() + 5 * 60 * 1000; // 5 min

    store.set(phone, { code, expires });

    // отправка SMS через SMS-шлюз (SMS Aero, Twilio, etc.)
    console.log(`SMS to ${phone}: code = ${code}`);

    return { success: true };
  }

  async verify(phone: string, code: string) {
    const record = store.get(phone);

    if (!record) {
      throw new BadRequestException('Код не запрашивался');
    }

    if (record.expires < Date.now()) {
      throw new BadRequestException('Код истёк');
    }

    if (record.code !== code) {
      throw new BadRequestException('Неверный код');
    }

    // код успешен → удалить
    store.delete(phone);

    // отметить телефон как подтверждённый в базе
    return { success: true };
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
