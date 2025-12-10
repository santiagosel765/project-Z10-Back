import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Map } from './map.entity';
import { Layer } from '../../layers/entities/layer.entity';
import { User } from '../../users/entities/user.entity';

@Entity('map_layer')
@Index('idx_map_layer_map_id', ['mapId'])
@Index('idx_map_layer_layer_id', ['layerId'])
@Index('idx_map_layer_is_visible', ['isVisible'])
@Index('idx_map_layer_display_order', ['mapId', 'displayOrder'])
@Index('idx_map_layer_created_at', ['createdAt'])
@Check('valid_opacity', 'opacity >= 0 AND opacity <= 1')
@Check('valid_display_order', 'display_order >= 0')
export class MapLayer {
  @PrimaryColumn({ name: 'map_id', type: 'integer' })
  mapId: number;

  @PrimaryColumn({ name: 'layer_id', type: 'integer' })
  layerId: number;

  @ManyToOne(() => Map, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'map_id' })
  map: Map;

  @ManyToOne(() => Layer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'layer_id' })
  layer: Layer;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  opacity: number;

  @Column({ type: 'jsonb', nullable: true })
  layerConfig: object;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'integer', nullable: true })
  createdBy: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;
}
