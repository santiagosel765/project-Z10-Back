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
import { Layer } from '../../layers/entities/layer.entity';
import { UserRole } from './user-role.entity';

@Entity('user')
@Index('idx_user_email', ['email'], { where: 'is_active = true' })
@Index('idx_user_employee_code', ['employeeCode'], { where: 'is_active = true' })
@Index('idx_user_is_active', ['isActive'])
@Index('idx_user_created_at', ['createdAt'])
@Index('idx_user_created_by', ['createdBy'])
@Index('idx_user_full_name', ['firstName', 'lastName'])
@Index('idx_user_phone', ['phone'], { where: 'phone IS NOT NULL' })
@Check('valid_email', "email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'")
@Check('valid_phone', "phone IS NULL OR phone ~* '^\\+?[0-9\\s\\-()]{8,20}$'")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ name: 'employee_code', type: 'varchar', length: 50, unique: true })
  employeeCode: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'profile_photo_url', type: 'text', nullable: true })
  profilePhotoUrl: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'birthdate', type: 'timestamp', default: new Date() })
  birthdate: Date;

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

  @OneToMany(() => Layer, (layer) => layer.user)
  layers: Layer[];

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];
}
