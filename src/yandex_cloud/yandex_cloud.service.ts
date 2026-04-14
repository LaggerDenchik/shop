import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { Request, Response } from 'express';

import { OrderFilesService } from 'order_files/order-files.service';
import { CreateFilesDto } from '../order_files/dto/create-files.dto';
import { DeleteFilesDto } from 'order_files/dto/delete-files.dto';


@Injectable()
export class YandexCloudService {

    constructor(private readonly dataFiles: OrderFilesService,
    ) { }

    async createFolderToYandexDisk(pathfolder: string) {
        const url = process.env.CLOUD_URL || 'noURL';
        try {
            await axios.put(url, null, {
                params: { path: pathfolder },
                headers: { Authorization: `OAuth ${process.env.CLOUD_TOKEN}` }
            });
        } catch (error) {
            if (axios.isAxiosError(error)) {
                // 409 — "Conflict" (папка уже существует)
                if (error.response?.status === 409) {
                    return;
                }
                console.error('Ошибка создания папки:', error.response?.data);
            }
        }
    }

    async uploadFileToYandexDisk(pathfolder: string, fileBuffer: Buffer, userId: string, dto: CreateFilesDto) {
        const folderPath = pathfolder.substring(0, pathfolder.lastIndexOf('/'));
        await this.createRemoteFolderRecursive(folderPath);
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

            const savedFile = await this.dataFiles.createFileRecord(userId, dto);
            console.log('Файл успешно загружен:', pathfolder);
            return savedFile;
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                console.error('Ошибка Яндекса:', error.response?.data || error.message);
            } else {
                // Обработка обычных ошибок (не сетевых)
                console.error('Неизвестная ошибка:', error);
            }
            throw error;
        }
    }

    async deleteFileFromYandexDisk(remotePath: string, dto: DeleteFilesDto) {
        const url = process.env.CLOUD_URL;
        if (!url) throw new Error('CLOUD_URL не настроен в .env');

        try {
            // 1. Пытаемся удалить файл из облака
            await axios.delete(url, {
                params: { path: remotePath, permanently: true },
                headers: { Authorization: `OAuth ${process.env.CLOUD_TOKEN}` }
            });
            // console.log(`Файл удален с Диска: ${remotePath}`);
        } catch (error: any) {
            const status = error.response?.status;

            if (status === 404) {
                // Файла уже нет в облаке
                console.warn(`Файл ${remotePath} уже отсутствует на Диске.`);
            } else {
                console.error('Ошибка API Яндекса:', error.response?.data || error.message);
                throw error;
            }
        }

        try {
            await this.dataFiles.deleteFileRecord(dto);
            // console.log(`Запись о файле удалена из БД (ID: ${dto.originalName})`);
            return { success: true };
        } catch (dbError) {
            console.error('Ошибка при удалении из БД:', dbError);
            throw new Error('Файл удален из облака, но не удалось очистить БД');
        }
    }

    async getFilesFromFolder(orderId: string, category: string) {
        const TOKEN = process.env.CLOUD_TOKEN;
        const remotePath = `disk:/shop/orders/${orderId}/${category}`;
        const allowedExtensions = category === 'spetification' ? ['.xlsx', '.csv'] : ['.dbx', '.json', '.dbs'];

        try {
            const { data } = await axios.get(process.env.CLOUD_URL!, {
                params: { path: remotePath, limit: 100 },
                headers: { Authorization: `OAuth ${TOKEN}` }
            });

            const items = data._embedded?.items || [];
            const result: Record<string, string> = {};

            for (const item of items) {
                if (item.type === 'file' && allowedExtensions.some(ext => item.name.toLowerCase().endsWith(ext))) {
                    result[item.name] = `api/cloud/download-file?url=${encodeURIComponent(item.file)}`;
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