import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const ATTACHMENTS_TABLE = 'attachments';

export class CreateAttachmentsTable1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: ATTACHMENTS_TABLE,
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
          },
          {
            name: 'attachable_type',
            type: 'varchar',
          },
          {
            name: 'attachable_id',
            type: 'int',
          },
          {
            name: 'url',
            type: 'varchar',
          },
          {
            name: 'file_name',
            type: 'varchar',
          },
          {
            name: 'file_type',
            type: 'varchar',
          },
          {
            name: 'file_size',
            type: 'bigint',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      ATTACHMENTS_TABLE,
      new TableIndex({
        name: 'idx_attachments_attachable',
        columnNames: ['attachable_type', 'attachable_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(ATTACHMENTS_TABLE);
  }
}

