import { Injectable } from '@nestjs/common';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export interface ContractData {
    contractNumber: string;
    clientName: string;
    date: string;
    amount: string;
}

@Injectable()
export class ContractService {
    fillContractFromBuffer(
        fileBuffer: Buffer,
        data: ContractData
    ): Buffer {
        const zip = new PizZip(fileBuffer);

        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{{', end: '}}' }
        });

        try {
            doc.render(data);
        } catch (error: any) {
            console.error('🔥 DOCX TEMPLATE ERRORS:', error.properties?.errors);
            throw error;
        }

        return doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE'
        });
    }
}
