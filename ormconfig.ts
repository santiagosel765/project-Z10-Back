import { DataSource } from 'typeorm';
import { envs } from './src/config/envs';

import {
  User,
  Role,
  Page,
  Map,
  Layer,
  UserRole,
  RolePage,
  LayerFeature,
  MapLayer,
  MapType,
  SdkClient,
    SdkToken,
} from './src/entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: envs.dbHost,
  port: envs.dbPort,
  username: envs.dbUser,
  password: envs.dbPassword,
  database: envs.dbName,
  entities: [
    User,
    Role,
    Page,
    Map,
    MapType,
    Layer,
    UserRole,
    RolePage,
    LayerFeature,
    MapLayer,
    SdkClient,
    SdkToken,
  ],
  migrations: ['src/migrations/**/*.ts'],
  synchronize: false,
  logging: ['query', 'error', 'schema', 'warn'],
  migrationsRun: false,
  migrationsTableName: 'migrations',
  migrationsTransactionMode: 'all',
  dropSchema: false,
  cache: false,
  extra: {
    max: 20,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
});
