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

    async uploadFileToYandexDisk(pathfolder: string, fileBuffer: Buffer) {
        const url = `${process.env.CLOUD_URL}/upload`;

        try {
            // Получение URL для загрузки
            const uploadUrlResponse = await axios.get(url, {
                params: {
                    path: pathfolder,
                    overwrite: true
                },
                headers: {
                    Authorization: `OAuth ${process.env.CLOUD_TOKEN}`,
                }
            });

            const href = uploadUrlResponse.data.href;

            // Загрузка файла без лишних преобразований
            await axios.put(href, fileBuffer, {
                headers: {
                    'Content-Type': 'application/octet-stream'
                }
            });

            console.log('Файл успешно загружен:', pathfolder);

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

    async getFilesFromFolder(userId: string, orderId: string, type: 'excel' | 'db') {
        const TOKEN = process.env.CLOUD_TOKEN;
        const remotePath = `disk:/shop/orders/${orderId}/${type}`;
        const allowedExtensions = type === 'excel' ? ['.xlsx', '.csv'] : ['.dbx', '.json', '.dbs'];

        try {
            const { data } = await axios.get(process.env.CLOUD_URL!, {
                params: { path: remotePath, limit: 100 },
                headers: { Authorization: `OAuth ${TOKEN}` }
            });

            const items = data._embedded?.items || [];
            const result: Record<string, string> = {};

            for (const item of items) {
                if (item.type === 'file' && allowedExtensions.some(ext => item.name.toLowerCase().endsWith(ext))) {
                    // Возвращаем прямой URL для скачивания
                    // result[item.name] = item.file;
                    result[item.name] =
                        `${process.env.API_URL}/api/download-file?url=${encodeURIComponent(item.file)}`;
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

    // Метод для создания папок, если их нет
    async createRemoteFolderRecursive(remotePath) {
        const url = process.env.CLOUD_URL || 'noURL';
        const token = process.env.CLOUD_TOKEN;

        // Разбиваем путь на части, исключая пустые строки
        const folders = remotePath.split('/').filter(part => part.length > 0);
        let currentPath = '';

        for (const folder of folders) {
            // наращиваем путь
            currentPath += (currentPath ? '/' : '') + folder;

            if (currentPath === 'shop' || currentPath === 'shop/orders') {
                continue;
            }

            try {
                await axios.put(url, null, {
                    params: { path: currentPath },
                    headers: { Authorization: `OAuth ${token}` }
                });
                // console.log(`Папка "${currentPath}" успешно создана.`);
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    // 409 означает, что папка уже существует
                    if (error.response?.status === 409) {
                        console.log(`Папка "${currentPath}" уже существует.`);
                        continue;
                    }
                    console.error(`Ошибка при создании "${currentPath}":`, error.response?.data);
                    throw error;
                }
            }
        }
    }
}