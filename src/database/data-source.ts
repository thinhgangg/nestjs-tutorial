import 'dotenv/config';
import * as path from 'path';
import { DataSource } from 'typeorm';

const DEFAULT_DB_PORT = 5432;

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || DEFAULT_DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, './migrations/*{.ts,.js}')],
  synchronize: false,
});
