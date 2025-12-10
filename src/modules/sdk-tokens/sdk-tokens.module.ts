import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SdkTokensService } from './sdk-tokens.service';
import { SdkTokensController } from './sdk-tokens.controller';
import { SdkClient } from './entities/sdk-client.entity';
import { SdkToken } from './entities/sdk-token.entity';
import { SdkAuthController } from './sdk-auth.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SdkClient, SdkToken])],
  controllers: [SdkTokensController, SdkAuthController],
  providers: [SdkTokensService],
  exports: [SdkTokensService],
})
export class SdkTokensModule {}
