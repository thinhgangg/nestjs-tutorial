import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const USERS_TABLE = 'users';
const BIO_COLUMN = 'bio';

export class AddBioToUsersTable1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      USERS_TABLE,
      new TableColumn({
        name: BIO_COLUMN,
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(USERS_TABLE, BIO_COLUMN);
  }
}

