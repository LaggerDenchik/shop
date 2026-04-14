import { Controller, Put, Get, Post, Res, Delete, Query, Param, Body, Request, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { YandexCloudService } from './yandex_cloud.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import axios from 'axios';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFilesDto } from '../order_files/dto/create-files.dto';
import { DeleteFilesDto } from 'order_files/dto/delete-files.dto';
import { OrderFilesService } from 'order_files/order-files.service';

@Controller('cloud')
export class YandexCloudController {
    constructor(private yandexService: YandexCloudService,
        private readonly dataFilesService: OrderFilesService,
    ) { }

    @Put('create-folders')
    async createFolderPatch(@Query('path') path: string) {
        const sanitizedPath = path.replace(/\.\.\//g, '').replace(/\/+/g, '/');
        console.log(path)
        return this.yandexService.createRemoteFolderRecursive(`shop/orders/${path}`);
    }

    @UseGuards(JwtAuthGuard)
    @Post('load')
    @UseInterceptors(FileInterceptor('file'))
    async loadFile(
        @UploadedFile() file: Express.Multer.File,
        @Body('folderNameOrder') folderNameOrder: string,
        @Body('category') category: string,
        @Body('dto') dtoRaw: string, // Получаем как строку
        @Request() req
    ) {

        if (!file) {
            throw new Error('Файл не получен');
        }
        const dto: CreateFilesDto = JSON.parse(dtoRaw);
        const fixedFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const path = `shop/orders/${folderNameOrder}/${category}/${fixedFileName}`;

        return this.yandexService.uploadFileToYandexDisk(path, file.buffer, req.user.id, dto);
    }

    @Delete('delete/:idDataFile')
    async removeFile(
        @Param('idDataFile') idDataFile: string,
    ) {
        const dataFile = await this.dataFilesService.findOne(idDataFile);
            if (!dataFile) {
                return;
            }
            console.log(dataFile);
             const path = `shop/orders/${dataFile.storagePath}`;

        const dto: DeleteFilesDto = {
            id: dataFile.id,
            originalName: dataFile.originalName,
            storagePath: path,
        }
        return this.yandexService.deleteFileFromYandexDisk(path, dto);
    }

    @Get('download/:idDataFile')
    async download(@Param('idDataFile') idDataFile: string, @Res() res: Response) {
        try {
            const dataFile = await this.dataFilesService.findOne(idDataFile);
            if (!dataFile) {
                return res.status(404).send('Файл не найден в БД');
            }
            // console.log(dataFile)
            const TOKEN = process.env.CLOUD_TOKEN;
            let path = `disk:/shop/orders/${dataFile.storagePath}/${dataFile.originalName}`;
            const { data } = await axios.get(process.env.CLOUD_URL!, {
                params: { path },
                headers: { Authorization: `OAuth ${TOKEN}` }
            });
            // console.log(data)

            const downloadUrl = data.file || data.href;

            if (!downloadUrl) {
                throw new Error('Ссылка на скачивание не получена от API');
            }

            const file = await axios.get(downloadUrl, { responseType: 'stream' });

            // Берем заголовки напрямую из ответа Яндекса или из БД
            const contentType = file.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            const contentLength = file.headers['content-length'];

            res.set({
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${encodeURIComponent(dataFile.originalName)}"`,
                'Content-Length': contentLength,
                'Cache-Control': 'no-cache',
            });

            file.data.pipe(res);
        } catch (e: any) {
            console.error('Детали ошибки:', e.response?.data || e.message);
            res.status(500).json({ message: 'Ошибка загрузки', details: e.message });
        }
    }
}