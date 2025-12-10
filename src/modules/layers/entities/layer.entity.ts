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
import { LayerFeature } from './layer-feature.entity';

@Entity('layer')
@Index('idx_layer_user_id', ['userId'], { where: 'is_active = true' })
@Index('idx_layer_is_public', ['isPublic'], { where: 'is_public = true AND is_active = true' })
@Index('idx_layer_is_active', ['isActive'])
@Index('idx_layer_type', ['layerType'], { where: 'is_active = true' })
@Index('idx_layer_bbox', ['bboxGeometry'])
@Index('idx_layer_shared_with', ['sharedWith'])
@Index('idx_layer_created_at', ['createdAt'])
@Index('idx_layer_style', ['style'])
@Check('layer_name_not_empty', 'LENGTH(TRIM(name)) > 0')
@Check('valid_layer_type', "layer_type IN ('point', 'linestring', 'polygon', 'multipoint', 'multilinestring', 'multipolygon', 'mixed')")
@Check('valid_total_features', 'total_features >= 0')

export class Layer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'layer_type', type: 'varchar', length: 50 })
  layerType: 'point' | 'linestring' | 'polygon' | 'multipoint' | 'multilinestring' | 'multipolygon' | 'mixed';

  @Column({ name: 'total_features', type: 'integer', default: 0 })
  totalFeatures: number;

  @Column({ name: 'bbox_geometry', type: 'geometry', spatialFeatureType: 'Polygon', srid: 4326, nullable: true })
  bboxGeometry: string;

@Column({ 
    type: 'jsonb', 
    default: {
      fillColor: '#3388ff',
      fillOpacity: 0.5,
      strokeColor: '#0066cc',
      strokeWidth: 2,
      iconUrl: null
    }
  })
  style: object;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ name: 'shared_with', type: 'integer', array: true, nullable: true })
  sharedWith: number[];

  @Column({ name: 'original_filename', type: 'varchar', length: 255, nullable: true })
  originalFilename: string;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: number;

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

  @OneToMany(() => LayerFeature, (layerFeature) => layerFeature.layer)
  features: LayerFeature[];

  @OneToMany(() => MapLayer, (mapLayer) => mapLayer.layer)
  mapLayers: MapLayer[];
}

// Importar MapLayer después de la definición de la clase para evitar dependencias circulares
import { MapLayer } from '../../maps/entities/map-layer.entity';
