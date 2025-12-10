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
import { MapLayer } from './map-layer.entity';
import { MapType } from './map-type.entity';

@Entity('map')
@Index('idx_map_is_active', ['isActive'])
@Index('idx_map_is_default', ['isDefault'], { where: 'is_default = true' })
@Index('idx_map_type_id', ['mapTypeId'], { where: 'is_active = true' })
@Index('idx_map_item_id', ['webmapItemId'])
@Index('idx_map_created_at', ['createdAt'])
@Index('idx_map_settings', ['settings'])
@Check('map_name_not_empty', 'LENGTH(TRIM(name)) > 0')
export class Map {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'webmap_item_id', type: 'varchar', length: 100, nullable: true })
  webmapItemId: string;

  @Column({ name: 'map_type_id', type: 'integer' })
  mapTypeId: number;

  @ManyToOne(() => MapType, (mapType) => mapType.maps, { nullable: false })
  @JoinColumn({ name: 'map_type_id' })
  mapType: MapType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  settings: object;

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

  @OneToMany(() => MapLayer, (mapLayer) => mapLayer.map)
  mapLayers: MapLayer[];
}
