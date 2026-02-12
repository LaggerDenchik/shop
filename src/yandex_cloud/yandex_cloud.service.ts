import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { Request, Response } from 'express';


@Injectable()
export class YandexCloudService {

    async createFolderToYandexDisk(pathfolder: string) {
        const url = process.env.CLOUD_URL || 'noURL';
        try {
            const response = await axios.put(url, null, {
                params: { path: pathfolder },
                headers: {
                    Authorization: `OAuth ${process.env.CLOUD_TOKEN}`,
                }
            });
            console.log(`Папка "${pathfolder}" создана.\n Статус: ${response.status}`);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Ошибка создания папки:', error.response?.data);
            } else {
                console.error('Неизвестная ошибка:', error);
            }
        }
    }

    // через 30 минут ссылка перестанет работать и ее нужно будет запросить заново
    async uploadFileToYandexDisk(pathfolder: string, fileBuffer: Buffer) {
        const url = `${process.env.CLOUD_URL}/upload`;
        // const encodedPath = encodeURIComponent(pathfolder);
        try {
            // Получение URL для загрузки
            const uploadUrlResponse = await axios.get(url, {
                params: {
                    path: Buffer.from(pathfolder, 'utf8').toString(),
                    overwrite: true
                },
                headers: {
                    Authorization: `OAuth ${process.env.CLOUD_TOKEN}`,
                }
            });

            const href = uploadUrlResponse.data.href;

            // Загрузка файла
            await axios.put(href, fileBuffer, {
                headers: {
                    'Content-Type': 'application/octet-stream' // или тип файла
                }
            });

            console.log('Файл успешно загружен');
            console.log(`Запрос URL для загрузки "${pathfolder}".\n Статус: ${uploadUrlResponse.status}`);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Ошибка запроса URL:', error.response?.data);
            } else {
                console.error('Неизвестная ошибка:', error);
            }
        }
    }

    async deleteFileFromYandexDisk(remotePath: string) {
        const url = process.env.CLOUD_URL || 'noURL';

        try {
            await axios.delete(url, {
                params: {
                    path: remotePath,
                    permanently: true // true — удалить безвозвратно, false — поместить в корзину
                },
                headers: { Authorization: `OAuth ${process.env.CLOUD_TOKEN}` }
            });
            return { message: 'Файл успешно удален' };
        } catch (error) {
            console.error('Ошибка при удалении:', error.response?.data || error.message);
            throw error;
        }
    }

    /* async getFilesFromFolder(userId: string, orderId: string) {
        const TOKEN = process.env.CLOUD_TOKEN;
        const remotePath = `disk:/shop/users/${userId}/orders/${orderId}/excel`;

        const url = process.env.CLOUD_URL ? process.env.CLOUD_URL : 'noURL';

        try {
            const { data: folderInfo } = await axios.get(url, {
                params: {
                    path: remotePath,
                    limit: 100 // Чтобы точно подцепить все файлы в папке
                },
                headers: { Authorization: `OAuth ${TOKEN}` }
            });

            const items = folderInfo._embedded?.items || [];
            const result: Record<string, string> = {};

            for (const item of items) {
                // Проверяем, что это файл и он имеет расширение .xlsx
                if (item.type === 'file' && item.name.toLowerCase().endsWith('.xlsx')) {
                    // item.file — это уже готовая прямая ссылка на скачивание контента
                    const fileResponse = await axios.get(item.file, {
                        responseType: 'arraybuffer'
                    });

                    // Конвертируем Buffer в base64 для передачи в JSON
                    result[item.name] = Buffer.from(fileResponse.data).toString('base64');
                }
            }

            return result;
        } catch (e) {
            if (axios.isAxiosError(e)) {
                if (e.response?.status === 404) {
                    return {};
                }

                console.error('Ошибка Яндекс.Диска:', e.response?.data);
                throw new Error(
                    `Не удалось загрузить файлы: ${e.response?.data?.message || e.message}`
                );
            }

            throw e;
        }
    }  */

    async getFilesFromFolder(
        userId: string,
        orderId: string,
        type: 'excel' | 'db'
    ) {
        const TOKEN = process.env.CLOUD_TOKEN;

        const remotePath =
            `disk:/shop/users/${userId}/orders/${orderId}/${type}`;

        const allowedExtensions =
            type === 'excel'
                ? ['.xlsx', '.csv']
                : ['.dbx', '.json', '.dbs'];

        try {
            const { data } = await axios.get(process.env.CLOUD_URL!, {
                params: { path: remotePath, limit: 100 },
                headers: { Authorization: `OAuth ${TOKEN}` }
            });

            const items = data._embedded?.items || [];
            const result: Record<string, string> = {};

            for (const item of items) {
                if (
                    item.type === 'file' &&
                    allowedExtensions.some(ext =>
                        item.name.toLowerCase().endsWith(ext)
                    )
                ) {
                    const fileResponse = await axios.get(item.file, {
                        responseType: 'arraybuffer'
                    });

                    result[item.name] = Buffer
                        .from(fileResponse.data)
                        .toString('base64');
                }
            }

            return result;

        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 404) {
                return {};
            }

            throw e;
        }
    } 
    
    // TODO: Создавать при смене статуса с новый на просмотренный
    // Метод для создания папок, если их нет
    async createRemoteFolderRecursive(remotePath) {
        const url = process.env.CLOUD_URL || 'noURL';
        const token = process.env.CLOUD_TOKEN;

        // Разбиваем путь на части, исключая пустые строки
        const folders = remotePath.split('/').filter(part => part.length > 0);
        let currentPath = '';

        for (const folder of folders) {
            // Постепенно наращиваем путь: "folder1", затем "folder1/folder2" и т.д.
            currentPath += (currentPath ? '/' : '') + folder;

            try {
                await axios.put(url, null, {
                    params: { path: currentPath },
                    headers: { Authorization: `OAuth ${token}` }
                });
                // console.log(`Папка "${currentPath}" успешно создана.`);
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    // 409 означает, что папка уже существует. Это нам подходит, идем дальше.
                    if (error.response?.status === 409) {
                        console.log(`Папка "${currentPath}" уже существует.`);
                        continue;
                    }
                    console.error(`Ошибка при создании "${currentPath}":`, error.response?.data);
                    throw error; // Прекращаем, если возникла реальная ошибка
                }
            }
        }
    }


}