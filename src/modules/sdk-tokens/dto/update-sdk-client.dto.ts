import { PartialType } from '@nestjs/swagger';
import { CreateSdkClientDto } from './create-sdk-client.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSdkClientDto extends PartialType(CreateSdkClientDto) {
  @ApiPropertyOptional({
    description: 'Whether the client is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
