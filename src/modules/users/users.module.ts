import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, UserRole } from 'src/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole])
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [ UsersService ],
})
export class UsersModule {}
