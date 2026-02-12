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

    @Post('load')
    @UseInterceptors(FileInterceptor('file'))
    async loadFile(@Body('userId') userId: string, @Body('orderId') id: string, @UploadedFile('file') file: Express.Multer.File) {
        console.log(file)
        if (!file) {
            throw new Error('Файл не получен');
        }
        const path = `shop/users/${userId}/orders/${id}/${file.originalname}`;
        return this.yandexService.uploadFileToYandexDisk(path, file.buffer);
    }

    @Delete('delete')
    async removeFile(
        @Query('userId') userId: string,
        @Query('orderId') id: string,
        @Query('fileName') fileName: string
    ) {
        const path = `shop/users/${userId}/orders/${id}/${fileName}`;
        console.log(path)
        return this.yandexService.deleteFileFromYandexDisk(path);
    }

    @Get('get-folder-files')
    async getFolderFiles(
        @Query('userId') userId: string,
        @Query('orderId') orderId: string
    ) {

        // Вызываем сервис для получения объекта с base64 файлами
        return await this.yandexService.getFilesFromFolder(userId, orderId);
    }


}