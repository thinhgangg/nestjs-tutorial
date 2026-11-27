import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

process.env.NODE_ENV = 'test';

const envTestPath = path.resolve(__dirname, '../.env.test');
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath, override: true });
}

