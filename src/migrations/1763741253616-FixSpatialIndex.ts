import { MigrationInterface, QueryRunner } from "typeorm";

export class FixSpatialIndex1763741253616 implements MigrationInterface {
    name = 'FixSpatialIndex1763741253616'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Eliminar índice problemático
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_layer_feature_geometry;
    `);

    // 2. Opción A: Crear índice BRIN (recomendado para muchos features)
    await queryRunner.query(`
      CREATE INDEX idx_layer_feature_geometry_brin 
      ON public.layer_feature 
      USING BRIN (geometry);
    `);

    // 3. Opción B: O crear índice GIST con simplificación
    // Descomentar si prefieres GIST:
    /*
    await queryRunner.query(`
      CREATE INDEX idx_layer_feature_geometry_simplified 
      ON public.layer_feature 
      USING GIST (ST_SimplifyPreserveTopology(geometry, 0.0001));
    `);
    */

    // 4. Crear índice en layer_id para queries comunes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_layer_feature_layer_id 
      ON public.layer_feature (layer_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_layer_feature_geometry_brin;
    `);
    
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_layer_feature_geometry_simplified;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_layer_feature_layer_id;
    `);

    // Recrear índice original
    await queryRunner.query(`
      CREATE INDEX idx_layer_feature_geometry 
      ON public.layer_feature 
      USING GIST (geometry);
    `);
  }

}
