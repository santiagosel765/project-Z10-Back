import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SdkTokensService } from './sdk-tokens.service';
import { SdkTokensController } from './sdk-tokens.controller';
import { SdkClient } from './entities/sdk-client.entity';
import { SdkToken } from './entities/sdk-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SdkClient, SdkToken])],
  controllers: [SdkTokensController],
  providers: [SdkTokensService],
  exports: [SdkTokensService],
})
export class SdkTokensModule {}
