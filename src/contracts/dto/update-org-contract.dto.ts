import { ContractStatus } from '../entities/contract.entity'; // или enum где у тебя

export class UpdateOrgContractDto {
  contractNumber?: string;
  prepayment?: number;
  contractDate?: string;
  price?: number;

  status?: ContractStatus; 
}