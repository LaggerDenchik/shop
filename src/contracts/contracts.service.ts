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
import * as xlsx from 'xlsx'; // TODO: УДАЛИТЬ библиотеку
import axios from 'axios';
import { UpdateOrgContractDto } from './dto/update-org-contract.dto';
import { OrderFilesService } from 'order_files/order-files.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private repo: Repository<Contract>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly dataFilesService: OrderFilesService,
  ) { }

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

    contract.status = 'ready_for_sign';

    return this.repo.save(contract);
  }

  async updateOrg(id: string, dto: UpdateOrgContractDto) {
    const contract = await this.findOne(id);
    console.log(dto)

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

    if (dto.include_appendix !== undefined) {
      contract.include_appendix = dto.include_appendix;
    }

    if (dto?.orgData) {
      const data = dto.orgData;
      contract.orgName = data.name ?? contract.orgName;
      contract.orgUNP = data.unp ?? contract.orgUNP;
      contract.orgDirector = data.director ?? contract.orgDirector;
      contract.orgAddress = data.address ?? contract.orgAddress;
      contract.orgPhone = data.phone ?? contract.orgPhone;
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

    console.log(contract);
    return this.repo.save(contract);
  }

  buildPdfFileName(contract: Contract): string {
    const number = contract.contractNumber || 'contract';
    const date = contract.contractDate
      ? contract.contractDate.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const safeNumber = number.replace(/[^\w.-]+/g, '_');

    return `Dogovor_${safeNumber}_${date}.pdf`;
  }

  /* async generatePdf(id: string): Promise<string> {
    const contract = await this.findOne(id);
    if (!contract) throw new NotFoundException('Contract not found');

    const order = await this.orderRepo.findOne({
      where: { externalId: contract.orderId },
      relations: ['dealerOrganization'],
    });

    if (!order) throw new NotFoundException('Order not found');

    const org = order.dealerOrganization || {};

    const templateData = {
      contractNumber: contract.contractNumber || '—',
      buyerFullName: contract.buyerFullName || '—',
      buyerPassportSeries: contract.buyerPassportSeries || '—',
      buyerPassportNumber: contract.buyerPassportNumber || '—',
      buyerPassportIssuedBy: contract.buyerPassportIssuedBy || '—',
      buyerPassportIssueDate: contract.buyerPassportIssueDate
        ? new Date(contract.buyerPassportIssueDate).toLocaleDateString('ru-RU')
        : '—',
      buyerAddress: contract.buyerAddress || '—',
      buyerCity: contract.buyerCity || '—',
      buyerIndex: contract.buyerIndex || '—',
      buyerPhone: contract.buyerPhone || '—',
      orgName: contract.orgName || org.name || '—',
      orgLegalForm: contract.orgLegalForm || org.shortname || '—',
      orgUNP: contract.orgUNP || org.unp || '—',
      orgDirector: contract.orgDirector || org.ceo || '—',
      orgAddress: contract.orgAddress || org.address || '—',
      orgPhone: contract.orgPhone || org.phone || '—',
      price: Number(contract.price ?? order.totalPrice ?? 0),
      prepayment: Number(contract.prepayment ?? 0),
      remainder: Number(contract.remainder ?? (contract.price ?? order.totalPrice ?? 0) - (contract.prepayment ?? 0)),
    };

    const templatePath = path.join(__dirname, 'templates', 'contract-template.html');
    let templateHtml = fs.readFileSync(templatePath, 'utf-8');

    const data = {
      'НОМЕР': templateData.contractNumber,
      'ФИО_ФИЗ': templateData.buyerFullName,
      'СЕРИЯ_ФИЗ': templateData.buyerPassportSeries,
      'НОМЕР_ПАСПОРТА_ФИЗ': templateData.buyerPassportNumber,
      'КЕМ_ВЫДАН_ФИЗ': templateData.buyerPassportIssuedBy,
      'ДАТА_ВЫДАЧИ_ФИЗ': templateData.buyerPassportIssueDate,
      'АДРЕС_ФИЗ': templateData.buyerAddress,
      'ГОРОД_ФИЗ': templateData.buyerCity,
      'ИНДЕКС_ФИЗ': templateData.buyerIndex,
      'ТЕЛЕФОН_ФИЗ': templateData.buyerPhone,
      'НАЗВАНИЕ': templateData.orgName,
      'ЮР_ФОРМА': templateData.orgLegalForm,
      'УНП': templateData.orgUNP,
      'ДИРЕКТОР': templateData.orgDirector,
      'АДРЕС': templateData.orgAddress,
      'ТЕЛЕФОН': templateData.orgPhone,
      'ЦЕНА': templateData.price.toFixed(2),
      'ПРЕДОПЛАТА': templateData.prepayment.toFixed(2),
      'ОСТАТОК': templateData.remainder.toFixed(2),
      'ЧИСЛО': new Date().getDate(),
      'МЕСЯЦ': new Date().toLocaleString('ru-RU', { month: 'long' }),
      'ГОД': new Date().getFullYear(),
    };

    Object.keys(data).forEach((key) => {
      templateHtml = templateHtml.replace(new RegExp(`{${key}}`, 'g'), data[key]);
    });

    const pdfDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    const pdfPath = path.join(pdfDir, `contract-${id}.pdf`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(templateHtml, { waitUntil: 'networkidle0' });
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
    await browser.close();

    contract.pdfFile = pdfPath;
    await this.repo.save(contract);

    return pdfPath;
  } */

  async generatePdf(id: string): Promise<string> {
    const contract = await this.findOne(id);
    if (!contract) throw new NotFoundException('Contract not found');

    const order = await this.orderRepo.findOne({
      where: { externalId: contract.orderId },
      relations: ['dealerOrganization'],
    });

    if (!order) throw new NotFoundException('Order not found');

    const org = order.dealerOrganization || {};

    const templateData = {
      contractNumber: contract.contractNumber || '—',
      buyerFullName: contract.buyerFullName || '—',
      buyerPassportSeries: contract.buyerPassportSeries || '—',
      buyerPassportNumber: contract.buyerPassportNumber || '—',
      buyerPassportIssuedBy: contract.buyerPassportIssuedBy || '—',
      buyerPassportIssueDate: contract.buyerPassportIssueDate
        ? new Date(contract.buyerPassportIssueDate).toLocaleDateString('ru-RU')
        : '—',
      buyerAddress: contract.buyerAddress || '—',
      buyerCity: contract.buyerCity || '—',
      buyerIndex: contract.buyerIndex || '—',
      buyerPhone: contract.buyerPhone || '—',
      orgName: contract.orgName || org.name || '—',
      orgLegalForm: contract.orgLegalForm || org.shortname || '—',
      orgUNP: contract.orgUNP || org.unp || '—',
      orgDirector: contract.orgDirector || org.ceo || '—',
      orgAddress: contract.orgAddress || org.address || '—',
      orgPhone: contract.orgPhone || org.phone || '—',
      price: Number(contract.price ?? order.totalPrice ?? 0),
      prepayment: Number(contract.prepayment ?? 0),
      remainder: Number(contract.remainder ?? (contract.price ?? order.totalPrice ?? 0) - (contract.prepayment ?? 0)),
    };

    let templatePath = path.join(__dirname, 'templates', 'contract-template.html');
    let templateHtml = fs.readFileSync(templatePath, 'utf-8');

    const data = {
      'НОМЕР': templateData.contractNumber,
      'ФИО_ФИЗ': templateData.buyerFullName,
      'СЕРИЯ_ФИЗ': templateData.buyerPassportSeries,
      'НОМЕР_ПАСПОРТА_ФИЗ': templateData.buyerPassportNumber,
      'КЕМ_ВЫДАН_ФИЗ': templateData.buyerPassportIssuedBy,
      'ДАТА_ВЫДАЧИ_ФИЗ': templateData.buyerPassportIssueDate,
      'АДРЕС_ФИЗ': templateData.buyerAddress,
      'ГОРОД_ФИЗ': templateData.buyerCity,
      'ИНДЕКС_ФИЗ': templateData.buyerIndex,
      'ТЕЛЕФОН_ФИЗ': templateData.buyerPhone,
      'НАЗВАНИЕ': templateData.orgName,
      'ЮР_ФОРМА': templateData.orgLegalForm,
      'УНП': templateData.orgUNP,
      'ДИРЕКТОР': templateData.orgDirector,
      'АДРЕС': templateData.orgAddress,
      'ТЕЛЕФОН': templateData.orgPhone,
      'ЦЕНА': templateData.price.toFixed(2),
      'ПРЕДОПЛАТА': templateData.prepayment.toFixed(2),
      'ОСТАТОК': templateData.remainder.toFixed(2),
      'ЧИСЛО': new Date().getDate(),
      'МЕСЯЦ': new Date().toLocaleString('ru-RU', { month: 'long' }),
      'ГОД': new Date().getFullYear(),
    };

    Object.keys(data).forEach((key) => {
      templateHtml = templateHtml.replace(new RegExp(`{${key}}`, 'g'), data[key]);
    });

    const pdfDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    let pdfPath = path.join(pdfDir, `contract-${id}.pdf`);

    let browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    let page = await browser.newPage();
    await page.setContent(templateHtml, { waitUntil: 'networkidle0' });
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
    // await browser.close();
    // browser.close() вызовем в самом конце, чтобы переиспользовать для Excel

    let finalHtml;
    if (contract.include_appendix) {
      const dataFile = await this.dataFilesService.findOneByOrder(order.id, "spetification");
      if (!dataFile) {
        return ('Файл не найден в БД'); //FIXME:  new BadRequestException
      }

      const TOKEN = process.env.CLOUD_TOKEN;
      const cloudPath = `disk:/shop/orders/${dataFile.storagePath}/${dataFile.originalName}`;

      const { data: cloudData } = await axios.get(process.env.CLOUD_URL!, {
        params: { path: cloudPath },
        headers: { Authorization: `OAuth ${TOKEN}` }
      });

      const downloadUrl = cloudData.href || cloudData.file;
      if (!downloadUrl) throw new Error('Ссылка на скачивание не получена');
      if (!dataFile) throw new NotFoundException('Файл спецификации не найден');

      const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });

      const workbookJs = new ExcelJS.Workbook();
      await workbookJs.xlsx.load(response.data);

      let excelHtmlAppends = '';

      for (const worksheet of workbookJs.worksheets) {
        const images = worksheet.getImages().map(img => {
          const image = workbookJs.getImage(Number(img.imageId));
          const base64Data = image?.buffer ? Buffer.from(image.buffer).toString('base64') : '';
          // Определяем колонку и строку (поддержка разных версий ExcelJS)
          const tl = img.range.tl;
          const col = (tl as any).nativeCol ?? (tl as any).col;
          const row = (tl as any).nativeRow ?? (tl as any).row;

          return {
            base64: image ? `data:image/${image.extension};base64,${base64Data}` : '',
            col: Number(col) + 1,
            row: Number(row) + 1
          };
        });

        // 2. Определяем границы: учитываем и текст, и КАРТИНКИ
        /* let lastCol = 0;
        worksheet.eachRow({ includeEmpty: false }, (row) => {
          row.eachCell({ includeEmpty: false }, (cell) => {
            if (Number(cell.col) > lastCol) lastCol = Number(cell.col);
          });
        });
  
        // Если есть картинки дальше, чем текст — расширяем таблицу
        images.forEach(img => {
          if (img.col > lastCol) lastCol = img.col;
        });
   */
        const largeImageKeywords = ['вид', 'стена'];

        const isGeneralViewPage = largeImageKeywords.some(keyword =>
          worksheet.name.toLowerCase().includes(keyword)
        );

        if (isGeneralViewPage) {
          let imagesHtml = '';
          images.forEach(img => {
            imagesHtml += `
                <div style="width: 100%; margin-bottom: 20px; text-align: center;">
                    <img src="${img.base64}" style="max-width: 100%; height: auto; display: block; margin: 0 auto; max-height: 280mm;">
                </div>`;
          });

          excelHtmlAppends += `
        <div style="page-break-before: always; padding: 10mm;">
            <h2 style="text-align: center; font-family: Arial;">${worksheet.name}</h2>
            ${imagesHtml}
        </div>`;
          continue;
        }

        // 3. ЛОГИКА ДЛЯ ТАБЛИЦЫ (Снова работает для всех остальных листов)
        let lastCol = 0;
        worksheet.eachRow({ includeEmpty: false }, (row) => {
          row.eachCell({ includeEmpty: false }, (cell) => {
            if (Number(cell.col) > lastCol) lastCol = Number(cell.col);
          });
        });
        // Важно: проверяем и колонки картинок, чтобы таблица не была слишком узкой
        images.forEach(img => { if (img.col > lastCol) lastCol = img.col; });
        if (lastCol === 0) continue;

        // 3. Формируем таблицу с ФИКСИРОВАННОЙ шириной (как в Excel)
        let totalWidth = 0;
        let colGroupHtml = '<colgroup>';
        for (let i = 1; i <= lastCol; i++) {
          const w = (worksheet.getColumn(i).width || 9.5) * 7.5; // Коэффициент перевода в px
          totalWidth += w;
          colGroupHtml += `<col style="width: ${w}px;">`;
        }
        colGroupHtml += '</colgroup>';

        let tableHtml = `<table style="border-collapse: collapse; table-layout: fixed; width: ${totalWidth}px; font-family: Arial; background: white;">`;
        tableHtml += colGroupHtml;

        worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          tableHtml += `<tr style="height: auto;">`;

          for (let colNumber = 1; colNumber <= lastCol; colNumber++) {
            const cell = row.getCell(colNumber);

            // Обработка объединений (важно для заголовков)
            if (cell.isMerged && cell.address !== cell.master.address) continue;
            let rSpan = 1, cSpan = 1;
            if (cell.isMerged && (worksheet as any)._merges) {
              const m = (worksheet as any)._merges[cell.master.address];
              if (m) {
                rSpan = m.bottom - m.top + 1;
                cSpan = m.right - m.left + 1;
              }
            }

            let cellStyle = `border: none; padding: 0.5px; font-size: 8.5pt; vertical-align: middle; word-wrap: break-word; overflow: hidden; box-sizing: border-box;`;

            if (cell.alignment?.horizontal) cellStyle += `text-align: ${cell.alignment.horizontal};`;
            if (cell.font?.bold) cellStyle += `font-weight: bold;`;
            if (cell.fill && (cell.fill as any).fgColor?.argb) {
              cellStyle += `background-color: #${(cell.fill as any).fgColor.argb.substring(2)};`;
            }

            // Проверяем, есть ли картинка в этой ячейке
            const imgInCell = images.find(i => i.row === rowNumber && i.col === colNumber);
            const imgHtml = imgInCell ? `<img src="${imgInCell.base64}" style="width: 100%; height: auto; display: block; max-height: 250px; object-fit: contain;">` : '';

            let val = '';
            if (cell.value) {
              if (typeof cell.value === 'object' && 'result' in cell.value) val = cell.value.result?.toString() || '';
              else val = cell.value.toString();
            }

            tableHtml += `<td rowspan="${rSpan}" colspan="${cSpan}" style="${cellStyle}">${imgHtml}${val}</td>`;
          }
          tableHtml += `</tr>`;
        });
        tableHtml += `</table>`;

        // 4. Масштабируем, чтобы влезло в A4
        const scale = totalWidth > 750 ? (750 / totalWidth).toFixed(2) : '1';

        excelHtmlAppends += `
    <div style="page-break-before: always; padding: 10mm 5mm;">
        <div style="zoom: ${scale}; transform-origin: top center;">
            <h2 style="text-align: center;">${worksheet.name}</h2>
            ${tableHtml}
        </div>
    </div>`;
      }

      finalHtml = templateHtml.replace('</body>', `${excelHtmlAppends}</body>`);
    }


    // 4. Генерация PDF через Puppeteer - ОПТИМИЗИРОВАНО
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();

      // Увеличиваем таймаут до 60 секунд
      page.setDefaultNavigationTimeout(60000);

      // Используем 'domcontentloaded', так как картинки в Base64 не грузятся извне
      if (contract.include_appendix) {
        await page.setContent(finalHtml, {
          waitUntil: 'domcontentloaded'
        });
      } else {
        await page.setContent(templateHtml, {
          waitUntil: 'domcontentloaded'
        });
      }


      // Дополнительная небольшая пауза, чтобы тяжелый HTML отрендерился
      await new Promise(r => setTimeout(r, 1000));

      const pdfPath = path.join(pdfDir, `contract-${id}.pdf`);

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
        displayHeaderFooter: false
      });

      return pdfPath;
    } catch (error) {
      console.error('Ошибка генерации PDF:', error);
      throw error;
    } finally {
      // Важно закрывать браузер всегда, даже при ошибке
      await browser.close();
    }
  }






  async getTemplate(externalOrderId: string) {
    const order = await this.orderRepo.findOne({
      where: { externalId: externalOrderId },
      relations: ['dealerOrganization'],
    });

    if (!order) throw new NotFoundException('Order not found');

    let contract = await this.repo.findOne({
      where: { orderId: order.externalId },
    });

    /* const org = order.dealerOrganization
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
 */
    let org;

    if (contract && contract.status === 'org_confirmed') {
      org = {
        name: contract.orgName || '',
        unp: contract.orgUNP || '',
        director: contract.orgDirector || '',
        address: contract.orgAddress || '',
        phone: contract.orgPhone || '',
        legalForm: contract.orgLegalForm || 'ООО',
        city: contract.orgCity || '',
        index: contract.orgIndex || '',
      };
    }
    // Если контракта нет или статус не тот, берем данные из order (dealerOrganization)
    else if (order.dealerOrganization) {
      const dOrg = order.dealerOrganization;
      org = {
        name: dOrg.name || '',
        legalForm: dOrg.shortname || 'ООО',
        unp: dOrg.unp || '',
        director: dOrg.ceo || '',
        address: dOrg.address || '',
        city: '',
        index: '',
        phone: dOrg.phone || '',
      };
    }
    // Если и там пусто, отдаем пустые строки
    else {
      org = {
        name: '',
        legalForm: '',
        unp: '',
        director: '',
        address: '',
        city: '',
        index: '',
        phone: '',
      };
    }


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
          includeAppendix: contract.include_appendix,
        },
      },
    };
  }

  async uploadSignedFile(
    contractId: string,
    file: Express.Multer.File,
    role: 'buyer' | 'org',
    isOrgActingAsBuyer = false
  ) {
    const contract = await this.findOne(contractId);

    if (
      contract.status !== 'ready_for_sign' &&
      contract.status !== 'signed_by_org'
    ) {
      throw new BadRequestException('Договор не готов к подписанию');
    }

    if (role === 'org') {
      contract.signedOrgFile = file.path;

      if (isOrgActingAsBuyer) {
        // организация подписывает за себя и покупателя сразу
        contract.signedBuyerFile = file.path;
        contract.status = 'signed';
      } else {
        contract.status = 'signed_by_org';
      }
    }

    if (role === 'buyer') {
      if (contract.status !== 'signed_by_org') {
        throw new BadRequestException('Организация ещё не подписала');
      }
      contract.signedBuyerFile = file.path;
      contract.status = 'signed';
    }

    return this.repo.save(contract);
  }
}