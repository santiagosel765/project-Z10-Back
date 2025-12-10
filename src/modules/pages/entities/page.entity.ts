import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  Check,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RolePage } from '../../roles/entities/role-page.entity';

@Entity('page')
@Index('idx_page_url', ['url'], { unique: true, where: 'is_active = true' })
@Index('idx_page_order', ['order', 'name'], { where: 'is_active = true' })
@Index('idx_page_is_active', ['isActive'])
@Index('idx_page_name', ['name'], { where: 'is_active = true' })
@Index('idx_page_created_at', ['createdAt'])
@Index('idx_page_created_by', ['createdBy'])
@Check('valid_url', "url ~ '^/[a-zA-Z0-9/_-]*$'")
@Check('valid_order', '"order" >= 0')
@Check('page_name_not_empty', 'LENGTH(TRIM(name)) > 0')
export class Page {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  url: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string;

  @Column({ name: 'order', type: 'integer', default: 0 })
  order: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'integer', nullable: true })
  createdBy: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'integer', nullable: true })
  updatedBy: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: User;

  // Relaciones
  @OneToMany(() => RolePage, (rolePage) => rolePage.page)
  rolePages: RolePage[];
}
