import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ApiPlService {
    constructor(private readonly httpService: HttpService) { }
    // URL: ОсновнойURL/api/get_items/materials
    API_HOST = process.env.API_HOST_PL;
    sync_key = process.env.SYNC_KEY;

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

    async saveProject(filename: string): Promise<Buffer> {

        const API_HOST = process.env.API_HOST_SAVE_PROJECT;
        const url = `${API_HOST}/clients_orders/${filename}`;

        const response = await axios.get(url, {
            responseType: 'json',
        });

        const jsonString = JSON.stringify(response.data);

        const archiver = require('archiver');
        const { PassThrough } = require('stream');

        const archive = archiver('zip', { zlib: { level: 9 } });
        const stream = new PassThrough();

        archive.pipe(stream);
        archive.append(jsonString, { name: filename });
        /*
        archive.append(jsonString, {
            name: filename.replace('.dbs', '.dbx'),
        }); */

        archive.append(
            jsonString,
            { name: filename.replace('.dbs', '.json') }
        );

        await archive.finalize();

        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        return Buffer.concat(chunks);

    }
}
