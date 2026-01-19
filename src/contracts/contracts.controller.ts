import { Controller, Get, Post, Body, Param, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateBuyerDto } from './dto/update-buyer.dto';
import { UpdateOrgDto } from './dto/update-org.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { UpdateOrgContractDto } from './dto/update-org-contract.dto';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  create(@Body() dto: CreateContractDto) {
    return this.contractsService.create(dto);
  }

  @Get(':id/template')
  getTemplate(@Param('id') id: string) {
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
  generatePdf(
    @Param('id') id: string,
    @Body() body: { html: string }
  ) {
    return this.contractsService.generatePdfFromHtml(id, body.html);
  }

  @Post(':id/sign/buyer')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => cb(null, `buyer-${Date.now()}-${file.originalname}`)
    })
  }))
  signBuyer(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.contractsService.signBuyer(id, file.path);
  }

  @Post(':id/sign/org')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => cb(null, `org-${Date.now()}-${file.originalname}`)
    })
  }))
  signOrg(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.contractsService.signOrg(id, file.path);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }
}