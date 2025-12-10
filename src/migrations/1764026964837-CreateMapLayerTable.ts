import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMapLayerTable1764026964837 implements MigrationInterface {
    name = 'CreateMapLayerTable1764026964837'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop old BRIN index if exists
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_layer_feature_geometry_brin"`);
        
        // Create map_layer table
        await queryRunner.query(`CREATE TABLE "map_layer" ("map_id" integer NOT NULL, "layer_id" integer NOT NULL, "display_order" integer NOT NULL DEFAULT '0', "is_visible" boolean NOT NULL DEFAULT true, "opacity" numeric(3,2) NOT NULL DEFAULT '1', "layerConfig" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" integer, CONSTRAINT "valid_display_order" CHECK (display_order >= 0), CONSTRAINT "valid_opacity" CHECK (opacity >= 0 AND opacity <= 1), CONSTRAINT "PK_21e0ee7712865366dbc960a2eae" PRIMARY KEY ("map_id", "layer_id"))`);
        
        // Create indexes for map_layer
        await queryRunner.query(`CREATE INDEX "idx_map_layer_created_at" ON "map_layer" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_map_layer_display_order" ON "map_layer" ("map_id", "display_order") `);
        await queryRunner.query(`CREATE INDEX "idx_map_layer_is_visible" ON "map_layer" ("is_visible") `);
        await queryRunner.query(`CREATE INDEX "idx_map_layer_layer_id" ON "map_layer" ("layer_id") `);
        await queryRunner.query(`CREATE INDEX "idx_map_layer_map_id" ON "map_layer" ("map_id") `);
        
        // Update user birthdate column (keep it simple)
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "birthdate"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "birthdate" DATE`);
        
        // Create spatial GIST index for layer_feature geometry (not regular B-tree)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_layer_feature_geometry" ON "layer_feature" USING GIST ("geometry")`);
        
        // Add foreign keys
        await queryRunner.query(`ALTER TABLE "map_layer" ADD CONSTRAINT "FK_4d0b77cac777c220a06ac26dd5a" FOREIGN KEY ("map_id") REFERENCES "map"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "map_layer" ADD CONSTRAINT "FK_8369376bc423767390028549abf" FOREIGN KEY ("layer_id") REFERENCES "layer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "map_layer" ADD CONSTRAINT "FK_2a7db596a5cc725fa1d641f6e9c" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "map_layer" DROP CONSTRAINT "FK_2a7db596a5cc725fa1d641f6e9c"`);
        await queryRunner.query(`ALTER TABLE "map_layer" DROP CONSTRAINT "FK_8369376bc423767390028549abf"`);
        await queryRunner.query(`ALTER TABLE "map_layer" DROP CONSTRAINT "FK_4d0b77cac777c220a06ac26dd5a"`);
        await queryRunner.query(`DROP INDEX "public"."idx_layer_feature_geometry"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "birthdate"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "birthdate" date`);
        await queryRunner.query(`DROP INDEX "public"."idx_map_layer_map_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_map_layer_layer_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_map_layer_is_visible"`);
        await queryRunner.query(`DROP INDEX "public"."idx_map_layer_display_order"`);
        await queryRunner.query(`DROP INDEX "public"."idx_map_layer_created_at"`);
        await queryRunner.query(`DROP TABLE "map_layer"`);
        await queryRunner.query(`CREATE INDEX "idx_layer_feature_geometry_brin" ON "layer_feature" ("geometry") `);
    }

}
