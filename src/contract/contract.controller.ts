import {
  Controller,
  Post,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Body,
  Res
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ContractService, ContractData } from './contract.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as fs from 'fs';

@Controller('contract')
@UseGuards(JwtAuthGuard)
export class ContractController {
  constructor(private readonly contractService: ContractService) { }

  @Post('fill')
@UseInterceptors(FileInterceptor('file'))
async fillContract(
  @UploadedFile() file: Express.Multer.File,
  @Body('data') data: string,
  @Res() res: Response
) {
  if (!file) {
    return res.status(400).json({ message: 'Файл договора не передан' });
  }

  const parsedData: ContractData = JSON.parse(data);

  const buffer = this.contractService.fillContractFromBuffer(
    file.buffer,
    parsedData
  );

  res.setHeader(
    'Content-Disposition',
    'attachment; filename=contract-filled.docx'
  );
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );

  res.send(buffer);
}

}
