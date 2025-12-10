import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  Check,
} from 'typeorm';
import { Map } from './map.entity';

@Entity('map_types')
@Index('idx_map_type_code', ['code'], { unique: true })
@Index('idx_map_type_is_active', ['isActive'])
@Check('map_type_name_not_empty', 'LENGTH(TRIM(name)) > 0')
@Check('map_type_code_not_empty', 'LENGTH(TRIM(code)) > 0')
@Check('map_type_code_format', "code ~ '^[a-z]+$'")
export class MapType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => Map, (map) => map.mapType)
  maps: Map[];
}
