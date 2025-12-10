import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { SdkClient } from './sdk-client.entity';

@Entity('sdk_token')
@Index('idx_sdk_token_client_id', ['clientId'])
@Index('idx_sdk_token_is_active', ['isActive'])
@Index('idx_sdk_token_expires_at', ['expiresAt'])
@Index('idx_sdk_token_prefix', ['tokenPrefix'])
@Index('idx_sdk_token_hash', ['tokenHash'])
@Check('rate_limit_positive', 'rate_limit > 0')
export class SdkToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'client_id', type: 'integer' })
  clientId: number;

  @Column({ name: 'token_hash', type: 'varchar', length: 255, unique: true })
  tokenHash: string;

  @Column({ name: 'token_prefix', type: 'varchar', length: 20 })
  tokenPrefix: string;

  @Column({ name: 'rate_limit', type: 'integer', default: 1000 })
  rateLimit: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'expires_at', type: 'timestamp with time zone', nullable: true })
  expiresAt: Date;

  @Column({ name: 'last_used_at', type: 'timestamp with time zone', nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => SdkClient, (client) => client.tokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: SdkClient;
}
