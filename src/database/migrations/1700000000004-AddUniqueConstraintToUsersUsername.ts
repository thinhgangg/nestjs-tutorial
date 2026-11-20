import { MigrationInterface, QueryRunner, TableUnique } from 'typeorm';

const USERS_TABLE = 'users';
const USERNAME_UNIQUE_CONSTRAINT = 'UQ_users_username';

export class AddUniqueConstraintToUsersUsername1700000000004
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createUniqueConstraint(
      USERS_TABLE,
      new TableUnique({
        name: USERNAME_UNIQUE_CONSTRAINT,
        columnNames: ['username'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropUniqueConstraint(
      USERS_TABLE,
      USERNAME_UNIQUE_CONSTRAINT,
    );
  }
}

