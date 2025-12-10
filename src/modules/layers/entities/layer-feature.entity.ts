import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Layer } from './layer.entity';

@Entity('layer_feature')
@Index('idx_layer_feature_layer_id', ['layerId'])
@Index('idx_layer_feature_geometry', ['geometry'])
@Index('idx_layer_feature_properties', ['properties'])
@Index('idx_layer_feature_index', ['layerId', 'featureIndex'])
@Unique('unique_feature_per_layer', ['layerId', 'featureIndex'])
export class LayerFeature {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'layer_id', type: 'integer' })
  layerId: number;

  @ManyToOne(() => Layer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'layer_id' })
  layer: Layer;

  @Column({ name: 'feature_index', type: 'integer' })
  featureIndex: number;

  @Column({ name: 'geometry', type: 'geometry', spatialFeatureType: 'Geometry', srid: 4326 })
  geometry: string;

  @Column({ type: 'jsonb', default: '{}' })
  properties: object;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}