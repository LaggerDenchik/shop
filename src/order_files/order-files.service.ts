import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderFiles } from './entities/order-files.entity';
import { CreateFilesDto } from './dto/create-files.dto';
import { Order } from '../orders/entities/order.entity';
import { User } from '../auth/entities/user.entity';
import { DeleteFilesDto } from './dto/delete-files.dto';

@Injectable()
export class OrderFilesService {
  constructor(
    @InjectRepository(OrderFiles)
    private readonly filesRepo: Repository<OrderFiles>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) { }

  async createFileRecord(userId: string, dto: CreateFilesDto) {
    // console.log('createFileRecord dto:', dto);

    const now = new Date();

    const newEntryFiles = this.filesRepo.create({
      orderId: dto.orderId,
      originalName: dto.originalName,
      storagePath: dto.storagePath,
      extension: dto.extension,
      category: dto.category,
      size: dto.size,
      meta_data: dto.meta_data,
      createdBy: userId,
      createdAt: dto.createdAt || now,
    });

    // console.log(newEntryFiles)
    return await this.filesRepo.save(newEntryFiles);
  }

  /* async deleteFileRecord(id: string) {
    console.log('deleteFileRecord dto:', id);

    const fileRecord = await this.filesRepo.findOne({
      where: {
        id: id,
      },
    });

    if (!fileRecord) {
      console.log(id)
      throw new NotFoundException('Файл с такими параметрами не найден');
    }

    // remove() работает с сущностью, delete() — по ID
    return await this.filesRepo.delete(id);
  } */

  async deleteFileRecord(dto: DeleteFilesDto) {
    // console.log('deleteFileRecord dto:', dto);

    const fileRecord = await this.filesRepo.findOne({
      where: {
        id: dto.id,
        originalName: dto.originalName,
      },
    });

    if (!fileRecord) {
      // console.log(dto)
      throw new NotFoundException('Файл с такими параметрами не найден');
    }

    // remove() работает с сущностью, delete() — по ID
    return await this.filesRepo.remove(fileRecord);
  }

  async viewOrderFiles(orderId: number, category: string) {

    const whereCondition: any = {
      orderId: orderId,
      category: category,
    };

    const [items, total] = await this.filesRepo.findAndCount({
      where: whereCondition,
      select: {
        id: true,
        orderId: true,
        originalName: true,
        storagePath: true,
        extension: true,
        category: true,
        size: true,
        meta_data: true,
        createdBy: true,
        createdAt: true,
      },
    });

    return {
      items,
      total,
    };
  }

  async findOne(id: string) {
    const dataFiles = await this.filesRepo.findOne({ where: { id } });
    if (!dataFiles) throw new NotFoundException('DataFilesOrder not found');
    return dataFiles;
  }

  async findOneByOrder(orderId: number, category: string) {
    return await this.filesRepo.findOne({
      where: {
        orderId: orderId,
        category: category
      }
    });
  }

  async findAllByOrder(orderId: number, category: string) {
    return await this.filesRepo.find({
      where: {
        orderId: orderId,
        category: category
      }
    });
  }



}