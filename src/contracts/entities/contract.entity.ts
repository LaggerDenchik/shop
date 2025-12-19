import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export type ContractStatus = 
  'draft' |
  'waitingOrg' |
  'waitingBuyer' |
  'signedBuyer' |
  'signedOrg' |
  'completed';

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: ContractStatus;

  // Buyer
  @Column({ type: 'varchar', length: 255, nullable: true })
  buyerFullName?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  buyerPassportSeries?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  buyerPassportNumber?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  buyerPassportIssuedBy?: string;

  @Column({ type: 'date', nullable: true })
  buyerPassportIssueDate?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  buyerAddress?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  buyerCity?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  buyerIndex?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  buyerPhone?: string;

  // Organization
  @Column({ type: 'varchar', length: 100, nullable: true })
  orgLegalForm?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  orgName?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  orgUNP?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  orgDirector?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  orgAddress?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  orgCity?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  orgIndex?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  orgPhone?: string;

  // Contract data
  @Column({ type: 'varchar', length: 50, nullable: true })
  contractNumber?: string;

  @Column({ type: 'date', nullable: true })
  contractDate?: Date;

  @Column({ type: 'numeric', nullable: true })
  price?: number;

  @Column({ type: 'numeric', nullable: true })
  prepayment?: number;

  @Column({ type: 'numeric', nullable: true })
  remainder?: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  specificationNumber?: string;

  // PDF and signed files
  @Column({ type: 'varchar', length: 255, nullable: true })
  pdfFile?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  signedBuyerFile?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  signedOrgFile?: string;
}