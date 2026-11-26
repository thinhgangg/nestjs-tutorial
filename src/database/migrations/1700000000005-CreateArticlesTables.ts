import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

const ARTICLES_TABLE = 'articles';
const TAGS_TABLE = 'tags';
const ARTICLE_TAGS_TABLE = 'article_tags';
const ARTICLE_FAVORITES_TABLE = 'article_favorites';
const USERS_TABLE = 'users';

export class CreateArticlesTables1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: ARTICLES_TABLE,
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'slug',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'body',
            type: 'text',
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

    await queryRunner.createForeignKey(
      ARTICLES_TABLE,
      new TableForeignKey({
        columnNames: ['author_id'],
        referencedTableName: USERS_TABLE,
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndices(ARTICLES_TABLE, [
      new TableIndex({
        name: 'idx_articles_slug',
        columnNames: ['slug'],
      }),
      new TableIndex({
        name: 'idx_articles_author_id',
        columnNames: ['author_id'],
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: TAGS_TABLE,
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: ARTICLE_TAGS_TABLE,
        columns: [
          {
            name: 'article_id',
            type: 'int',
            isPrimary: true,
          },
          {
            name: 'tag_id',
            type: 'int',
            isPrimary: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys(ARTICLE_TAGS_TABLE, [
      new TableForeignKey({
        columnNames: ['article_id'],
        referencedTableName: ARTICLES_TABLE,
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['tag_id'],
        referencedTableName: TAGS_TABLE,
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: ARTICLE_FAVORITES_TABLE,
        columns: [
          {
            name: 'article_id',
            type: 'int',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'int',
            isPrimary: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys(ARTICLE_FAVORITES_TABLE, [
      new TableForeignKey({
        columnNames: ['article_id'],
        referencedTableName: ARTICLES_TABLE,
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: USERS_TABLE,
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(ARTICLE_FAVORITES_TABLE, true, true, true);
    await queryRunner.dropTable(ARTICLE_TAGS_TABLE, true, true, true);
    await queryRunner.dropTable(TAGS_TABLE, true, true, true);
    await queryRunner.dropTable(ARTICLES_TABLE, true, true, true);
  }
}

