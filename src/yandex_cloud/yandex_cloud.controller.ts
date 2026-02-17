import { Controller, Put, Get, Post, Res, Delete, Query, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { YandexCloudService } from './yandex_cloud.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

@Controller('cloud')
export class YandexCloudController {
    constructor(private yandexService: YandexCloudService) { }

    @Put('create')
    async createFolder() {
        return this.yandexService.createFolderToYandexDisk("shop");
    }

    @Put('create-folders')
    async createFolderPatch(@Query('path') path: string) {
        const sanitizedPath = path.replace(/\.\.\//g, '').replace(/\/+/g, '/');
        console.log(path)
        return this.yandexService.createRemoteFolderRecursive(`shop/orders/${path}`);
    }

    @Post('load')
    @UseInterceptors(FileInterceptor('file'))
    async loadFile(
        @Body('userId') userId: string,
        @Body('orderId') orderId: string,
        @Body('type') type: 'excel' | 'db',
        @UploadedFile() file: Express.Multer.File
    ) {
        if (!file) {
            throw new Error('Файл не получен');
        }

        const fixedFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');

        const path = `shop/orders/${orderId}/${type}/${fixedFileName}`;

        // Передаем бинарный буфер напрямую
        return this.yandexService.uploadFileToYandexDisk(path, file.buffer);
    }

    @Delete('delete')
    async removeFile(
        @Query('userId') userId: string,
        @Query('orderId') id: string,
        @Query('type') type: 'excel' | 'db',
        @Query('fileName') fileName: string
    ) {
        const decodedFileName = decodeURIComponent(fileName);
        const path = `shop/orders/${id}/${type}/${decodedFileName}`;
        console.log(path)
        return this.yandexService.deleteFileFromYandexDisk(path);
    }

    @Get('get-folder-files')
    async getFolderFiles(
        @Query('userId') userId: string,
        @Query('orderId') orderId: string,
        @Query('type') type: 'excel' | 'db'
    ) {
        return this.yandexService.getFilesFromFolder(userId, orderId, type);
    }
}