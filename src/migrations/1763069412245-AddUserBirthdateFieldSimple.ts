import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserBirthdateFieldSimple1763069412245 implements MigrationInterface {
    name = 'AddUserBirthdateFieldSimple1763069412245'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Solo agregar la columna birthdate a la tabla user
        await queryRunner.query(`
            ALTER TABLE "user" 
            ADD COLUMN "birthdate" DATE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir: eliminar la columna birthdate
        await queryRunner.query(`
            ALTER TABLE "user" 
            DROP COLUMN "birthdate"
        `);
    }
}