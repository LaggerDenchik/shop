import { ContractStatus } from '../entities/contract.entity'; // или enum где у тебя

export class UpdateOrgContractDto {
  contractNumber?: string;
  prepayment?: number;
  contractDate?: string;
  price?: number;
  include_appendix?: boolean;

  orgData?: {
    name?: string;
    director?: string;
    unp?: string;
    address?: string;
    phone?: string;
  };

  status?: ContractStatus; 
}