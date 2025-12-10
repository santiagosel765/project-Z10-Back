import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTokenSDK1764777217549 implements MigrationInterface {
    name = 'AddTokenSDK1764777217549'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "map" DROP CONSTRAINT "fk_map_map_type"`);
        await queryRunner.query(`DROP INDEX "public"."idx_layer_feature_geometry"`);
        await queryRunner.query(`DROP INDEX "public"."idx_map_type_code"`);
        await queryRunner.query(`DROP INDEX "public"."idx_map_is_public"`);
        await queryRunner.query(`COMMENT ON TABLE "map_types" IS NULL`);
        await queryRunner.query(`CREATE TABLE "sdk_token" ("id" SERIAL NOT NULL, "client_id" integer NOT NULL, "token_hash" character varying(255) NOT NULL, "token_prefix" character varying(20) NOT NULL, "rate_limit" integer NOT NULL DEFAULT '1000', "is_active" boolean NOT NULL DEFAULT true, "expires_at" TIMESTAMP WITH TIME ZONE, "last_used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_4cfc0ca9128ce21bc2481098e43" UNIQUE ("token_hash"), CONSTRAINT "rate_limit_positive" CHECK (rate_limit > 0), CONSTRAINT "PK_de23759408c13577f59df2b21e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_sdk_token_hash" ON "sdk_token" ("token_hash") `);
        await queryRunner.query(`CREATE INDEX "idx_sdk_token_prefix" ON "sdk_token" ("token_prefix") `);
        await queryRunner.query(`CREATE INDEX "idx_sdk_token_expires_at" ON "sdk_token" ("expires_at") `);
        await queryRunner.query(`CREATE INDEX "idx_sdk_token_is_active" ON "sdk_token" ("is_active") `);
        await queryRunner.query(`CREATE INDEX "idx_sdk_token_client_id" ON "sdk_token" ("client_id") `);
        await queryRunner.query(`CREATE TABLE "sdk_client" ("id" SERIAL NOT NULL, "name" character varying(200) NOT NULL, "description" text, "email" character varying(255), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_eeaa1ec3671c1fdff6155a6f711" UNIQUE ("name"), CONSTRAINT "valid_email" CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'), CONSTRAINT "PK_ec6d580e209060531b48bc4140f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_sdk_client_email" ON "sdk_client" ("email") `);
        await queryRunner.query(`CREATE INDEX "idx_sdk_client_is_active" ON "sdk_client" ("is_active") `);
        await queryRunner.query(`COMMENT ON COLUMN "map_types"."code" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "map_types"."name" IS NULL`);
        await queryRunner.query(`ALTER TABLE "map_types" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "map_types" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`COMMENT ON COLUMN "map"."webmap_item_id" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "map"."map_type_id" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "map"."is_public" IS NULL`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "birthdate"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "birthdate" TIMESTAMP NOT NULL DEFAULT '"2025-12-03T15:53:38.227Z"'`);
        await queryRunner.query(`CREATE INDEX "idx_layer_feature_geometry" ON "layer_feature" USING GiST ("geometry")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_map_type_code" ON "map_types" ("code") `);
        await queryRunner.query(`CREATE INDEX "idx_map_is_public" ON "map" ("is_public") WHERE ((is_active = true) AND (is_public = true))`);
        await queryRunner.query(`ALTER TABLE "sdk_token" ADD CONSTRAINT "FK_7e2a0144dee45296d8b7beba006" FOREIGN KEY ("client_id") REFERENCES "sdk_client"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "map" ADD CONSTRAINT "FK_2a5d563bb0e7e92c11e8208df00" FOREIGN KEY ("map_type_id") REFERENCES "map_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "map" DROP CONSTRAINT "FK_2a5d563bb0e7e92c11e8208df00"`);
        await queryRunner.query(`ALTER TABLE "sdk_token" DROP CONSTRAINT "FK_7e2a0144dee45296d8b7beba006"`);
        await queryRunner.query(`DROP INDEX "public"."idx_map_type_code"`);
        await queryRunner.query(`DROP INDEX "public"."idx_layer_feature_geometry"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "birthdate"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "birthdate" date`);
        await queryRunner.query(`COMMENT ON COLUMN "map"."is_public" IS 'Indica si el mapa puede ser visualizado públicamente sin autenticación (para embeds)'`);
        await queryRunner.query(`COMMENT ON COLUMN "map"."map_type_id" IS 'Tipo de mapa asociado (arcgis o general)'`);
        await queryRunner.query(`COMMENT ON COLUMN "map"."webmap_item_id" IS 'Web Map Item ID de ArcGIS (solo requerido para mapas tipo arcgis)'`);
        await queryRunner.query(`ALTER TABLE "map_types" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "map_types" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`COMMENT ON COLUMN "map_types"."name" IS 'Nombre descriptivo del tipo de mapa'`);
        await queryRunner.query(`COMMENT ON COLUMN "map_types"."code" IS 'Código único del tipo de mapa (arcgis, general)'`);
        await queryRunner.query(`DROP INDEX "public"."idx_sdk_client_is_active"`);
        await queryRunner.query(`DROP INDEX "public"."idx_sdk_client_email"`);
        await queryRunner.query(`DROP TABLE "sdk_client"`);
        await queryRunner.query(`DROP INDEX "public"."idx_sdk_token_client_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_sdk_token_is_active"`);
        await queryRunner.query(`DROP INDEX "public"."idx_sdk_token_expires_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_sdk_token_prefix"`);
        await queryRunner.query(`DROP INDEX "public"."idx_sdk_token_hash"`);
        await queryRunner.query(`DROP TABLE "sdk_token"`);
        await queryRunner.query(`COMMENT ON TABLE "map_types" IS 'Tipos de mapas disponibles en el sistema (ArcGIS, General, etc.)'`);
        await queryRunner.query(`CREATE INDEX "idx_map_is_public" ON "map" ("is_public") WHERE ((is_active = true) AND (is_public = true))`);
        await queryRunner.query(`CREATE INDEX "idx_map_type_code" ON "map_types" ("code") `);
        await queryRunner.query(`CREATE INDEX "idx_layer_feature_geometry" ON "layer_feature" USING GiST ("geometry") `);
        await queryRunner.query(`ALTER TABLE "map" ADD CONSTRAINT "fk_map_map_type" FOREIGN KEY ("map_type_id") REFERENCES "map_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

}
