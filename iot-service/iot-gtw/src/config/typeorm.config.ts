import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { IotLog } from '../entities';

config();

export const typeOrmConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [IotLog],
  migrations: ['dist/migrations/*.js'],
  synchronize: false, // Set to false in production, use migrations instead
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

// DataSource for TypeORM CLI
const dataSource = new DataSource(typeOrmConfig);

export default dataSource;
