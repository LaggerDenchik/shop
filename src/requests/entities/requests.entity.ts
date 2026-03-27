import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { User } from '@auth/entities/user.entity';
import { Organization } from '@auth/entities/organization.entity';
import { Order } from 'orders/entities/order.entity';

export enum RequestStatus {
  PENDING = "pending",
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
}

export enum ConfirmedStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  EXPIRED = "expired",
}

export enum CreatorType {
  USER = 'user',
  ORGANIZATION = 'organization',
}
@Entity()
@Index(['orderId'], {
  unique: true,
  where: `"status" = 'pending'`,
})

@Entity('requests')
export class Requests {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING,
  })
  status: RequestStatus;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'cause' })
  cause: string;

  // --- Подтверждения сторон ---
   @Column({
    type: 'enum',
    enum: ConfirmedStatus,
    default: ConfirmedStatus.PENDING,
  })
  user_confirmed: ConfirmedStatus;

  @Column({
    type: 'enum',
    enum: ConfirmedStatus,
    default: ConfirmedStatus.PENDING,
  })
  org_confirmed: ConfirmedStatus;

  @Column({ name: 'user_confirmed_at', type: 'timestamptz', nullable: true })
  userConfirmedAt: Date | null;

  @Column({ name: 'org_confirmed_at', type: 'timestamptz', nullable: true })
  orgConfirmedAt: Date | null;

  // --- Срок годности ---
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;


  // --- Связь с заказом (по external_id) ---
  @Column({ name: 'order_id' })
  @Index()
  orderId: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id', referencedColumnName: 'id' })
  order: Order;

  // --- Связь с пользователем ---
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // --- Связь с организацией ---
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @ManyToOne(() => Organization, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'org_id' })
  organization: Organization;

  // --- Таймстампы ---
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

}
