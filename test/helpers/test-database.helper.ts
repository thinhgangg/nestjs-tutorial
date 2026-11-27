import Redis from 'ioredis';
import { DataSource } from 'typeorm';

export function assertTestDatabase(dataSource: DataSource): void {
  const dbName = String(dataSource.options.database ?? '');
  if (!dbName.toLowerCase().includes('test')) {
    throw new Error(
      `Refusing to run E2E database cleanup on non-test database "${dbName}". Ensure .env.test points DB_NAME to a dedicated test database.`,
    );
  }
}

export async function truncateDatabase(dataSource: DataSource): Promise<void> {
  assertTestDatabase(dataSource);

  const tableNames = dataSource.entityMetadatas
    .map((metadata) => `"${metadata.tableName}"`)
    .join(', ');

  if (tableNames.length > 0) {
    await dataSource.query(
      `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`,
    );
  }
}

export async function clearTestRedis(redis: Redis): Promise<void> {
  if (typeof redis.options.db === 'number' && redis.options.db > 0) {
    await redis.flushdb();
    return;
  }

  const keys = await redis.keys('blacklist:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

