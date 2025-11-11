import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';

const sslEnabled =
  process.env.DB_SSL === 'true' || process.env.DATABASE_URL?.includes('sslmode=require');

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST || 'localhost',
  port: process.env.DATABASE_URL
    ? undefined
    : Number(process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432),
  username: process.env.DATABASE_URL ? undefined : process.env.DB_USERNAME || 'postgres',
  password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD || 'postgres',
  database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME || 'postgres',
  ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  logging: false,
  synchronize: false,
  entities: [__dirname + '/../entities/**/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
};

const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;
