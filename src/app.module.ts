import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envs } from './config/envs';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { LayersModule } from './modules/layers/layers.module';
import { MapsModule } from './modules/maps/maps.module';
import { PagesModule } from './modules/pages/pages.module';
import { RolesModule } from './modules/roles/roles.module';
import { SdkTokensModule } from './modules/sdk-tokens/sdk-tokens.module';

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
} from './entities';
import { MapType } from './modules/maps/entities/map-type.entity';
import { SdkClient } from './modules/sdk-tokens/entities/sdk-client.entity';
import { SdkToken } from './modules/sdk-tokens/entities/sdk-token.entity';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AiService } from './modules/ai/ai.service';
import { GeoJsonService } from './modules/geojson/geojson.service';
import { GeoJsonModule } from './modules/geojson/geojson.module';
import { MapLayersModule } from './modules/map-layers/map-layers.module';
import { AwsService } from './modules/aws/aws.service';
import { AwsModule } from './modules/aws/aws.module';


@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
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
      synchronize: false,
      retryAttempts: 10,
      retryDelay: 3000,
      migrationsRun: true,
      logging: true,
    }),
    UsersModule,
    AuthModule,
    LayersModule,
    MapsModule,
    MapLayersModule,
    PagesModule,
    RolesModule,
    SdkTokensModule,
    GeoJsonModule,
    AwsModule,
  ],
  controllers: [AppController],
  providers: [AppService, GeoJsonService, AwsService],
})
export class AppModule {}
