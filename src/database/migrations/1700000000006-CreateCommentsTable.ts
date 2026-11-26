import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

const COMMENTS_TABLE = 'comments';
const ARTICLES_TABLE = 'articles';
const USERS_TABLE = 'users';

export class CreateCommentsTable1700000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: COMMENTS_TABLE,
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'body',
            type: 'text',
          },
          {
            name: 'article_id',
            type: 'int',
          },
          {
            name: 'author_id',
            type: 'int',
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

    await queryRunner.createForeignKeys(COMMENTS_TABLE, [
      new TableForeignKey({
        columnNames: ['article_id'],
        referencedTableName: ARTICLES_TABLE,
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['author_id'],
        referencedTableName: USERS_TABLE,
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndices(COMMENTS_TABLE, [
      new TableIndex({
        name: 'idx_comments_article_id',
        columnNames: ['article_id'],
      }),
      new TableIndex({
        name: 'idx_comments_author_id',
        columnNames: ['author_id'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(COMMENTS_TABLE, true, true, true);
  }
}

