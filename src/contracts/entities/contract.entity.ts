import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export type ContractStatus = 
  | 'draft'                 // заполнение
  | 'buyer_confirmed'       // физик подтвердил
  | 'org_confirmed'         // юрик подтвердил
  | 'ready_for_sign'        // оба подтвердили
  | 'signed_by_org'         // юрик загрузил подписанный
  | 'signed'                // физик загрузил подписанный
  | 'completed';               
@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'integer', unique: true })
  orderId: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'draft' })
  status: ContractStatus;

  @Column({ name: 'buyer_full_name', type: 'varchar', length: 255, nullable: true })
  buyerFullName?: string;

  @Column({ name: 'buyer_passport_series', type: 'varchar', length: 50, nullable: true })
  buyerPassportSeries?: string;

  @Column({ name: 'buyer_passport_number', type: 'varchar', length: 50, nullable: true })
  buyerPassportNumber?: string;

  @Column({ name: 'buyer_passport_issued_by', type: 'varchar', length: 255, nullable: true })
  buyerPassportIssuedBy?: string;

  @Column({ name: 'buyer_passport_issue_date', type: 'date', nullable: true })
  buyerPassportIssueDate?: Date;

  @Column({ name: 'buyer_address', type: 'varchar', length: 255, nullable: true })
  buyerAddress?: string;

  @Column({ name: 'buyer_city', type: 'varchar', length: 100, nullable: true })
  buyerCity?: string;

  @Column({ name: 'buyer_index', type: 'varchar', length: 20, nullable: true })
  buyerIndex?: string;

  @Column({ name: 'buyer_phone', type: 'varchar', length: 50, nullable: true })
  buyerPhone?: string;

  @Column({ name: 'org_legal_form', type: 'varchar', length: 100, nullable: true })
  orgLegalForm?: string;

  @Column({ name: 'org_name', type: 'varchar', length: 255, nullable: true })
  orgName?: string;

  @Column({ name: 'org_unp', type: 'varchar', length: 50, nullable: true })
  orgUNP?: string;

  @Column({ name: 'org_director', type: 'varchar', length: 255, nullable: true })
  orgDirector?: string;

  @Column({ name: 'org_address', type: 'varchar', length: 255, nullable: true })
  orgAddress?: string;

  @Column({ name: 'org_city', type: 'varchar', length: 100, nullable: true })
  orgCity?: string;

  @Column({ name: 'org_index', type: 'varchar', length: 20, nullable: true })
  orgIndex?: string;

  @Column({ name: 'org_phone', type: 'varchar', length: 50, nullable: true })
  orgPhone?: string;

  @Column({ name: 'contract_number', type: 'varchar', length: 50, nullable: true })
  contractNumber?: string;

  @Column({ name: 'contract_date', type: 'date', nullable: true })
  contractDate?: Date;

  @Column({ name: 'price', type: 'numeric', nullable: true })
  price?: number;

  @Column({ name: 'prepayment', type: 'numeric', nullable: true })
  prepayment?: number;

  @Column({ name: 'remainder', type: 'numeric', nullable: true })
  remainder?: number;

  @Column({ name: 'specification_number', type: 'varchar', length: 50, nullable: true })
  specificationNumber?: string;

  // PDF and signed files
  @Column({ name: 'pdf_file', type: 'varchar', length: 255, nullable: true })
  pdfFile?: string;

  @Column({ name: 'signed_buyer_file', type: 'varchar', length: 255, nullable: true })
  signedBuyerFile?: string;

  @Column({ name: 'signed_org_file', type: 'varchar', length: 255, nullable: true })
  signedOrgFile?: string;
  lastSignedFile: string;
}