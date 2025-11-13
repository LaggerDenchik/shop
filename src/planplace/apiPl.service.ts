import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiPlService {
    constructor(private readonly httpService: HttpService) { }
    // URL: ОсновнойURL/api/get_items/materials
    // Рабочий: "https://planplace.ru/clients/138941121/config/index.php/api/get_items/materials?sync_key=RTsvAHK5AStl2" /api/${query}?sync_key=${this.sync_key}
    // https://planplace.ru/clients/138941121/config/index.php/api/get_items/materials?sync_key=RTsvAHK5AStl2
    API_HOST = "https://planplace.ru/clients/138941121/config/index.php";
    sync_key = "RTsvAHK5AStl2";

    async getData(query): Promise<any> {
        // const token = await this.getToken();
        console.log(`${this.API_HOST}/${query}?sync_key=${this.sync_key}`);
        try {
            const url = `${this.API_HOST}/${query}?sync_key=${this.sync_key}`;

            // Используем POST
            const response = await firstValueFrom(
                this.httpService.get(
                    url, {},
                ),
            );

            let data;
            try {
                data = JSON.parse(response.data[0]);
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
