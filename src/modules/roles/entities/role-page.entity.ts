import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Role } from './role.entity';
import { Page } from '../../pages/entities/page.entity';
import { User } from '../../users/entities/user.entity';

@Entity('role_page')
@Index('idx_role_page_role_id', ['roleId'])
@Index('idx_role_page_page_id', ['pageId'])
@Index('idx_role_page_created_at', ['createdAt'])
@Index('idx_role_page_created_by', ['createdBy'])
export class RolePage {
  @PrimaryColumn({ name: 'role_id', type: 'integer' })
  roleId: number;

  @PrimaryColumn({ name: 'page_id', type: 'integer' })
  pageId: number;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Page, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'page_id' })
  page: Page;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'integer', nullable: true })
  createdBy: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;
}