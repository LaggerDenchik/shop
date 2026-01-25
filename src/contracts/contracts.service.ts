import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from './entities/contract.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateBuyerDto } from './dto/update-buyer.dto';
import { Order } from '../orders/entities/order.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { UpdateOrgContractDto } from './dto/update-org-contract.dto';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract) 
    private repo: Repository<Contract>,
  
    @InjectRepository(Order) 
    private readonly orderRepo: Repository<Order>
  ) {}

  async create(dto: CreateContractDto) {
    const contract = this.repo.create(dto);
    return this.repo.save(contract);
  }

  async findOne(id: string) {
    const contract = await this.repo.findOne({ where: { id } });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  async updateBuyer(id: string, dto: UpdateBuyerDto) {
    const contract = await this.findOne(id);

    contract.buyerFullName = dto.buyerFullName;
    contract.buyerPassportSeries = dto.buyerPassportSeries;
    contract.buyerPassportNumber = dto.buyerPassportNumber;
    contract.buyerPassportIssuedBy = dto.buyerPassportIssuedBy;
    contract.buyerPassportIssueDate = dto.buyerPassportIssueDate
      ? new Date(dto.buyerPassportIssueDate)
      : undefined;
    contract.buyerAddress = dto.buyerAddress;
    contract.buyerCity = dto.buyerCity;
    contract.buyerIndex = dto.buyerIndex;
    contract.buyerPhone = dto.buyerPhone;

    contract.status = 'buyer_confirmed';

    return this.repo.save(contract);
  }

  async updateOrg(id: string, dto: UpdateOrgContractDto) {
    const contract = await this.findOne(id);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (dto.contractNumber !== undefined) {
      contract.contractNumber = dto.contractNumber;
    }

    if (dto.prepayment !== undefined) {
      contract.prepayment = dto.prepayment;
    }

    if (dto.price !== undefined) {
      contract.price = dto.price;
    }

    if (dto.contractDate !== undefined) {
      contract.contractDate = new Date(dto.contractDate);
    }

    // пересчёт остатка 
    if (contract.price !== undefined && contract.prepayment !== undefined) {
      contract.remainder = contract.price - contract.prepayment;
    }

    if (dto.status === 'org_confirmed') {
      if (contract.status !== 'draft') {
        throw new BadRequestException(
          'Организация в текущем состоянии не может подтвердить заключение контракта'
        );
      }

      contract.status = 'org_confirmed';

      const order = await this.orderRepo.findOne({
        where: { externalId: contract.orderId },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      order.status = 'processing';
      await this.orderRepo.save(order);
    }

    return this.repo.save(contract);
  }

  async generatePdfFromHtml(id: string, html: string) {
    const contract = await this.findOne(id);

    const pdfDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
    }

    const pdfPath = path.join(pdfDir, `contract-${id}.pdf`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
    });

    await browser.close();

    contract.pdfFile = pdfPath;
    await this.repo.save(contract);

    return { pdfPath };
  }

  async generatePdf(id: string): Promise<string> {
    const contract = await this.findOne(id);

    // Путь к HTML-шаблону
    const templatePath = path.join(__dirname, 'templates', 'contract-template.html');
    let templateHtml = fs.readFileSync(templatePath, 'utf-8');

    // Данные для подстановки
    const data = {
      'НОМЕР': contract.contractNumber || '',
      'ФИО_ФИЗ': contract.buyerFullName || '',
      'СЕРИЯ_ФИЗ': contract.buyerPassportSeries || '',
      'НОМЕР_ПАСПОРТА_ФИЗ': contract.buyerPassportNumber || '',
      'КЕМ_ВЫДАН_ФИЗ': contract.buyerPassportIssuedBy || '',
      'ДАТА_ВЫДАЧИ_ФИЗ': contract.buyerPassportIssueDate
        ? new Date(contract.buyerPassportIssueDate).toLocaleDateString('ru-RU')
        : '',
      'АДРЕС_ФИЗ': contract.buyerAddress || '',
      'ГОРОД_ФИЗ': contract.buyerCity || '',
      'ИНДЕКС_ФИЗ': contract.buyerIndex || '',
      'ТЕЛЕФОН_ФИЗ': contract.buyerPhone || '',
      'НАЗВАНИЕ': contract.orgName || '',
      'ЮР_ФОРМА': contract.orgLegalForm || '',
      'УНП': contract.orgUNP || '',
      'ДИРЕКТОР': contract.orgDirector || '',
      'АДРЕС': contract.orgAddress || '',
      'ГОРОД': contract.orgCity || '',
      'ИНДЕКС': contract.orgIndex || '',
      'ТЕЛЕФОН': contract.orgPhone || '',
      'ЦЕНА': contract.price?.toFixed(2) || '',
      'ПРЕДОПЛАТА': contract.prepayment?.toFixed(2) || '',
      'ОСТАТОК': contract.remainder?.toFixed(2) || '',
      'ЧИСЛО': new Date().getDate(),
      'МЕСЯЦ': new Date().toLocaleString('ru-RU', { month: 'long' }),
      'ГОД': new Date().getFullYear()
    };

    // Подставляем данные в шаблон
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{${key}}`, 'g');
      templateHtml = templateHtml.replace(regex, data[key]);
    });

    // Путь для сохранения PDF
    const pdfDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
    const pdfPath = path.join(pdfDir, `contract-${id}.pdf`);

    // Генерация PDF через Puppeteer
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(templateHtml, { waitUntil: 'networkidle0' });
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
    await browser.close();

    // Сохраняем путь в контракте
    contract.pdfFile = pdfPath;
    await this.repo.save(contract);

    return pdfPath; // возвращаем путь к PDF
  }

  async signBuyer(id: string, filePath: string) {
    const contract = await this.findOne(id);
    contract.signedBuyerFile = filePath;
    contract.status = 'signed';
    return this.repo.save(contract);
  }

  async signOrg(id: string, filePath: string) {
    const contract = await this.findOne(id);
    contract.signedOrgFile = filePath;
    contract.status = 'completed';
    return this.repo.save(contract);
  }

  async getTemplate(externalOrderId: string) {
    const order = await this.orderRepo.findOne({
      where: { externalId: externalOrderId },
      relations: ['dealerOrganization'],
    });

    if (!order) throw new NotFoundException('Order not found');

    const org = order.dealerOrganization
      ? {
          name: order.dealerOrganization.name || '',
          legalForm: order.dealerOrganization.shortname || 'ООО',
          unp: order.dealerOrganization.unp || '',
          director: order.dealerOrganization.ceo || '',
          address: order.dealerOrganization.address || '',
          city: '', 
          index: '',
          phone: order.dealerOrganization.phone || '',
        }
      : {
          name: '',
          legalForm: '',
          unp: '',
          director: '',
          address: '',
          city: '',
          index: '',
          phone: '',
        };

    let contract = await this.repo.findOne({
      where: { orderId: order.externalId }, 
    });

    if (!contract) {
      contract = this.repo.create({
        orderId: order.externalId, 
        status: 'draft',
        orgName: org.name,
        orgLegalForm: org.legalForm,
        orgUNP: org.unp,
        orgDirector: org.director,
        orgAddress: org.address,
        orgCity: org.city,
        orgIndex: org.index,
        orgPhone: org.phone,
      });

      await this.repo.save(contract);
    }

    const templatePath = path.join(__dirname, 'templates', 'contract-template.html');
    const templateHtml = fs.readFileSync(templatePath, 'utf-8');

    return {
      contractId: contract.id,
      template: templateHtml,
      status: contract.status,
      data: {
        buyer: {
          fullName: contract.buyerFullName,
          passportSeries: contract.buyerPassportSeries,
          passportNumber: contract.buyerPassportNumber,
          issuedBy: contract.buyerPassportIssuedBy,
          issueDate: contract.buyerPassportIssueDate,
          address: contract.buyerAddress,
          city: contract.buyerCity,
          index: contract.buyerIndex,
          phone: contract.buyerPhone,
        },
        org,
        meta: {
          number: contract.contractNumber,
          price: contract.price,
          prepayment: contract.prepayment,
          remainder: contract.remainder,
        },
      },
    };
  }
}