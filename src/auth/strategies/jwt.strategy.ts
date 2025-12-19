import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { TokenPayload } from '../interfaces/token-payload.interface';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      // Пробуем взять токен из заголовка Authorization или из cookie "jwt"
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => req?.cookies?.jwt,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: TokenPayload) {
    const user = await this.authService.validateUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    // Возвращаем только нужные поля (Passport добавит их в req.user)
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      permissions: user.permissions,
      type: user.type,
      organizationId: user.organizationId,
    };
  }
}


// @Injectable()
// export class JwtStrategy extends PassportStrategy(Strategy) {
//   constructor(private authService: AuthService) {
//     super({
//       // 
//       // jwtFromRequest: ExtractJwt.fromExtractors([
//       //   (req: Request) => {
//       //     console.log('cookies:', req.cookies);
//       //     return req?.cookies?.jwt;
//       //   }
//       // ]),
//       jwtFromRequest: ExtractJwt.fromExtractors([
//         ExtractJwt.fromAuthHeaderAsBearerToken(),
//         (req: Request) => req?.cookies?.jwt,
//       ]),
//       // КОГДА ВЕРНЕМ КУКИ РАСКОМИТИТЬ ВЕРХНЮЮ ЧАСТЬ НИЖНЮЮ УДАЛИТЬ
//       ignoreExpiration: false,
//       secretOrKey: process.env.JWT_SECRET,
//     });
//   }

//   async validate(payload: TokenPayload) {
//     const user = await this.authService.validateUserById(payload.sub);

//     if (!user) {
//       throw new UnauthorizedException('Пользователь не найден');
//     }

//     // Возвращаем только нужные поля (Passport добавит их в req.user)
//     return {
//       id: user.id,
//       email: user.email,
//       fullName: user.fullName,
//       role: user.role,
//       permissions: user.permissions,
//       type: user.type,
//     };
//   }
// }
