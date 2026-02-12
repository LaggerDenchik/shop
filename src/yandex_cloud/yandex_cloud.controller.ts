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
        console.log(path)
        return this.yandexService.createRemoteFolderRecursive(`shop/users/${path}`);
    }

    /* @Post('load')
    @UseInterceptors(FileInterceptor('file'))
    async loadFile(@Body('userId') userId: string, @Body('orderId') id: string, @UploadedFile('file') file: Express.Multer.File) {
        console.log(file)
        if (!file) {
            throw new Error('Файл не получен');
        }
        const fixedFileName = Buffer
            .from(file.originalname, 'latin1')
            .toString('utf8');
        const path = `shop/users/${userId}/orders/${id}/${fixedFileName}`;
        return this.yandexService.uploadFileToYandexDisk(path, file.buffer);
    } */

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

        const fixedFileName = Buffer
            .from(file.originalname, 'latin1')
            .toString('utf8');

        const path = `shop/users/${userId}/orders/${orderId}/${type}/${fixedFileName}`;

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
        const path = `shop/users/${userId}/orders/${id}/${type}/${decodedFileName}`;
        console.log(path)
        return this.yandexService.deleteFileFromYandexDisk(path);
    }

    /* @Get('get-folder-files')
    async getFolderFiles(
        @Query('userId') userId: string,
        @Query('orderId') orderId: string
    ) {

        // Вызываем сервис для получения объекта с base64 файлами
        return await this.yandexService.getFilesFromFolder(userId, orderId);
    } */

    @Get('get-folder-files')
    async getFolderFiles(
        @Query('userId') userId: string,
        @Query('orderId') orderId: string,
        @Query('type') type: 'excel' | 'db'
    ) {
        return this.yandexService.getFilesFromFolder(userId, orderId, type);
    }


}