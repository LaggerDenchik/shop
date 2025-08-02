import { Injectable } from '@nestjs/common';

@Injectable()
export class CabinetsService {
    findAll() { 
        return [
            {
                name: 'WC',
                price: 350,
            },
            {
                name: 'WB',
                price: 320,
            }
        ]
    }
}
