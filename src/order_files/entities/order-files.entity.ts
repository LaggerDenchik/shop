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

import { Order } from 'orders/entities/order.entity';

@Entity('order_files')
export class OrderFiles {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'original_name' })
  originalName: string;
  @Column({ name: 'storage_path' })
  storagePath: string;
  @Column({ name: 'extension' })
  extension: string;
  @Column({ name: 'mime_type', nullable: true  })
  mime_type: string;

  @Column({ name: 'size', type: 'bigint' })
  size: string;

  @Column({ name: 'meta_data', type: 'jsonb',  })
  meta_data: any;

  @Column({ name: 'width', type: 'int', nullable: true  })
  width: number;

  @Column({ name: 'height', type: 'int', nullable: true  })
  height: number;
  
  @Column({ name: 'pages_count', nullable: true  })
  pages_count: number;

  @Column({ name: 'checksum', nullable: true  })
  checksum: string;

  @Column({ name: 'category' })
  category: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;


  @Column({ name: 'order_id' })
  @Index()
  orderId: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id'})
  order: Order;

  // --- Таймстампы ---
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /* @UpdateDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date; */

}
