import { Controller, Get, Post, Delete, Patch, Body, Param, Req, Request, Query, UseGuards, ParseUUIDPipe, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderFilesService } from "./order-files.service";
import { CreateFilesDto } from './dto/create-files.dto';

@Controller('order-files')
export class OrderFilesController {
    constructor(private readonly orderFilesService: OrderFilesService) { }

    @UseGuards(JwtAuthGuard)
    @Post('create')
    async createFileRecord(@Request() req, @Body() body: CreateFilesDto) {
        return this.orderFilesService.createFileRecord(req.user.id, body);
    }

    /* @Delete('delete') 
    async deleteFileRecord(@Body() body: CreateFilesDto) {
        return this.orderFilesService.deleteFileRecord(body);
    } */

    @Get(':orderId/files/:category') 
    async FileRecord(
        @Param('orderId') orderID: number,
        @Param('category') category: string
    ) {
        // Передаем оба параметра в сервис
        return this.orderFilesService.viewOrderFiles(orderID, category);
    }

}