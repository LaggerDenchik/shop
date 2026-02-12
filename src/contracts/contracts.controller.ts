import { Controller, Get, Post, Body, Param, Put, UploadedFile, UseInterceptors, Req, Res, NotFoundException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateBuyerDto } from './dto/update-buyer.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { UpdateOrgContractDto } from './dto/update-org-contract.dto';
import { Response } from 'express';
import path from 'path';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) { }

  @Post()
  create(@Body() dto: CreateContractDto) {
    return this.contractsService.create(dto);
  }

  @Get(':id/template')
  async getTemplate(@Param('id') id: string) {
    return this.contractsService.getTemplate(id);
  }

  @Put(':id/buyer')
  updateBuyer(@Param('id') id: string, @Body() dto: UpdateBuyerDto) {
    return this.contractsService.updateBuyer(id, dto);
  }

  @Put(':id/org')
  updateOrg(@Param('id') id: string, @Body() dto: UpdateOrgContractDto) {
    return this.contractsService.updateOrg(id, dto);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const contract = await this.contractsService.findOne(id);

    let filePath: string;

    if (contract.status === 'signed' && contract.buyerSignedFile) {
      filePath = contract.buyerSignedFile;
    } else if (contract.status === 'signed_by_org' && contract.orgSignedFile) {
      filePath = contract.orgSignedFile;
    } else {
      filePath = await this.contractsService.generatePdf(id);
    }

    // Преобразуем в абсолютный путь
    const absolutePath = path.resolve(filePath);

    console.log('Absolute path to send:', absolutePath);
    console.log('fs.existsSync:', fs.existsSync(absolutePath));

    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('PDF файл не найден на сервере');
    }

    const fileName = this.contractsService.buildPdfFileName(contract);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    res.sendFile(absolutePath, (err) => {
      if (err) console.error('sendFile error:', err);
      else console.log('PDF sent successfully');
    });
  }

  @Post(':id/signed-file')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const contractId = req.params.id;
        const dir = `./uploads/contracts/${contractId}`;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/\s+/g, '_');
        cb(null, `${timestamp}-${safeName}`);
      },
    }),
  }))
  uploadSignedFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('role') role: 'buyer' | 'org',
    @Body('isOrgActingAsBuyer') isOrgActingAsBuyer?: string,
  ) {
    const actingAsBuyer = isOrgActingAsBuyer === 'true';
    return this.contractsService.uploadSignedFile(id, file, role, actingAsBuyer);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }
}