import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { User } from '@auth/entities/user.entity';
import { Organization } from '@auth/entities/organization.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'external_id', unique: true })
  externalId: string;

  @Column({ name: 'planplace_date', type: 'timestamp', nullable: true })
  planplaceDate: Date;

  @Column({ name: 'total_price', type: 'decimal', nullable: true })
  totalPrice: number;

  @Column({ name: 'order_number', nullable: true })
  orderNumber: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  comments: string;

  @Column({ name: 'project_file', nullable: true })
  projectFile: string;

  /* Владелец заказа (клиент) */
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  /* Дилер (организация) */
  @Column({ name: 'dealer_org_id', type: 'uuid', nullable: true })
  dealerOrgId: string | null;

  @ManyToOne(() => Organization, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'dealer_org_id' })
  dealerOrganization: Organization;

  @Column({ type: 'varchar', nullable: true })
  name?: string;

  @Column({ type: 'varchar', default: 'new' })
  status: string;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
