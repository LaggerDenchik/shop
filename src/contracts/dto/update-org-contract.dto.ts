import { ContractStatus } from '../entities/contract.entity'; // или enum где у тебя

export class UpdateOrgContractDto {
  contractNumber?: string;
  prepayment?: number;
  contractDate?: string;
  price?: number;

  orgData?: {
    name?: string;
    director?: string;
    unp?: string;
    address?: string;
    phone?: string;
  };

  status?: ContractStatus; 
}