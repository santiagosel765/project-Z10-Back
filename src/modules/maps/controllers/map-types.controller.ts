import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MapType } from '../entities/map-type.entity';

@ApiTags('Map Types')
@Controller('map-types')
export class MapTypesController {
  constructor(
    @InjectRepository(MapType)
    private mapTypeRepository: Repository<MapType>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all available map types' })
  @ApiResponse({
    status: 200,
    description: 'List of map types',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          code: { type: 'string', example: 'arcgis' },
          name: { type: 'string', example: 'ArcGIS Web Map' },
          description: {
            type: 'string',
            example: 'Mapas creados con ArcGIS Online',
          },
          isActive: { type: 'boolean', example: true },
        },
      },
    },
  })
  async findAll() {
    const mapTypes = await this.mapTypeRepository.find({
      where: { isActive: true },
      select: ['id', 'code', 'name', 'description', 'isActive'],
      order: { id: 'ASC' },
    });

    return mapTypes;
  }
}
