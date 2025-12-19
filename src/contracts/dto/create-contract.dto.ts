export class CreateContractDto {
  buyerFullName?: string;
  buyerPassportSeries?: string;
  buyerPassportNumber?: string;
  orgName?: string;
  orgUNP?: string;
  contractNumber?: string;
  contractDate?: string;
  price?: number;
  prepayment?: number;
  remainder?: number;
  specificationNumber?: string;
}