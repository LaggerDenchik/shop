import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class CatalogService {
  private readonly API_HOST = process.env.API_HOST_EP;
  data = { login: process.env.P_LOGIN, password: process.env.P_PASSWORD };
  constructor(private readonly httpService: HttpService) { }

  private API_TOKEN = '';
  private API_TOKEN_EXPIRES: number | null = null;

  async getToken(): Promise<string> {
    if (this.API_TOKEN && !this.isTokenExpired()) {
      return this.API_TOKEN;
    }
    const url = `${this.API_HOST}/api/token`;
    const body = {
      UserName: this.data['login'],
      Password: this.data['password'],
      locale: 'ru',
      source: 'client_app',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, body, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      // console.log('Ответ:', response.data.access_token);
      const token = response.data.access_token || response.data.token;
      this.API_TOKEN = token;

      // если это JWT → достанем exp (время жизни)
      if (token && this.isJwt(token)) {
        const decoded: any = jwt.decode(token);
        this.API_TOKEN_EXPIRES = decoded?.exp
          ? decoded.exp * 1000
          : Date.now() + 5 * 60 * 1000;
      }

      if (this.API_TOKEN_EXPIRES) {
        const diffMs = this.API_TOKEN_EXPIRES - Date.now();
        const diffMin = Math.round(diffMs / 1000 / 60);
        console.log(
          `EXPIRES: ${new Date(this.API_TOKEN_EXPIRES).toLocaleString('ru-RU')} (через ${diffMin} мин)`,
        );
      }
      // если сервер вернул expires_in
      if (response.data.expires_in) {
        this.API_TOKEN_EXPIRES = Date.now() + response.data.expires_in * 1000;
        console.log('Token:', this.API_TOKEN);
      }

      return response.data.access_token;
    } catch (error) {
      console.error(
        'Ошибка получения токена:',
        error.response?.status,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  private isTokenExpired(): boolean {
    if (!this.API_TOKEN_EXPIRES) return true;
    return Date.now() >= this.API_TOKEN_EXPIRES;
  }

  private isJwt(token: string): boolean {
    return token.split('.').length === 3;
  }

  async getData(query): Promise<any> {
    const token = await this.getToken();
    console.log(`${this.API_HOST}/api/catalog/${query}`);
    try {
      if (this.API_TOKEN == '') this.getToken();
      const url = `${this.API_HOST}/api/catalog/${query}`;
      // const url = `${this.API_HOST}/api/catalog/product/query?${query}`;
      //console.log(`${this.API_HOST}/api/catalog/${query}`);

      // Используем POST
      const response = await firstValueFrom(
        this.httpService.post(
          url, {},
          {
            headers: {
              Authorization: `Bearer ${this.API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            responseType: 'text',
          },
        ),
      );

      let data;
      try {
        data = JSON.parse(response.data);
      } catch {
        console.warn('Ответ не является JSON, возвращаем как текст');
        data = response.data;
      }

      return data;
    } catch (error: any) {
      console.error('Ошибка API:', error.response?.data || error.message);
      throw new Error(
        `Ошибка при вызове API: ${error.response?.data || error.message}`,
      );
    }
  }

  async getDataLookup(query): Promise<any> {
    const token = await this.getToken();

    try {
      if (this.API_TOKEN == '') this.getToken();
      const url = `${this.API_HOST}/api/catalog/${query}`;
      // const url = `${this.API_HOST}/api/catalog/product/query?${query}`;
      // console.log(`${this.API_HOST}/api/catalog/${query}`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${this.API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          responseType: 'text',
        }),
      );

      let data;
      try {
        data = JSON.parse(response.data);
      } catch {
        console.warn('Ответ не является JSON, возвращаем как текст');
        data = response.data;
      }

      return data;
    } catch (error: any) {
      console.error('Ошибка API:', error.response?.data || error.message);
      throw new Error(
        `Ошибка при вызове API: ${error.response?.data || error.message}`,
      );
    }
  }
}