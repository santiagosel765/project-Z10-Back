import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MapLayersService } from './map-layers.service';
import { CreateMapLayerDto } from './dto/create-map-layer.dto';
import { UpdateMapLayerDto } from './dto/update-map-layer.dto';

@ApiTags('map-layers')
@Controller('map-layers')
export class MapLayersController {
  constructor(private readonly mapLayersService: MapLayersService) {}

  @Post()
  @ApiOperation({ summary: 'Add a layer to a map' })
  @ApiResponse({ status: 201, description: 'Layer added to map successfully' })
  @ApiResponse({ status: 404, description: 'Map or Layer not found' })
  @ApiResponse({ status: 409, description: 'Layer already added to map' })
  addLayerToMap(@Body() createMapLayerDto: CreateMapLayerDto) {
    return this.mapLayersService.addLayerToMap(createMapLayerDto);
  }

  @Get('map/:mapId')
  @ApiOperation({ summary: 'Get all layers for a specific map' })
  @ApiParam({ name: 'mapId', description: 'Map ID' })
  @ApiResponse({ status: 200, description: 'List of layers in the map' })
  @ApiResponse({ status: 404, description: 'Map not found' })
  getLayersByMap(@Param('mapId', ParseIntPipe) mapId: number) {
    return this.mapLayersService.getLayersByMap(mapId);
  }

  @Get('layer/:layerId')
  @ApiOperation({ summary: 'Get all maps that contain a specific layer' })
  @ApiParam({ name: 'layerId', description: 'Layer ID' })
  @ApiResponse({ status: 200, description: 'List of maps containing the layer' })
  @ApiResponse({ status: 404, description: 'Layer not found' })
  getMapsByLayer(@Param('layerId', ParseIntPipe) layerId: number) {
    return this.mapLayersService.getMapsByLayer(layerId);
  }

  @Patch(':mapId/:layerId')
  @ApiOperation({ summary: 'Update layer configuration in a map' })
  @ApiParam({ name: 'mapId', description: 'Map ID' })
  @ApiParam({ name: 'layerId', description: 'Layer ID' })
  @ApiResponse({ status: 200, description: 'Layer configuration updated' })
  @ApiResponse({ status: 404, description: 'Map or Layer not found' })
  updateMapLayer(
    @Param('mapId', ParseIntPipe) mapId: number,
    @Param('layerId', ParseIntPipe) layerId: number,
    @Body() updateMapLayerDto: UpdateMapLayerDto,
  ) {
    return this.mapLayersService.updateMapLayer(mapId, layerId, updateMapLayerDto);
  }

  @Delete(':mapId/:layerId')
  @ApiOperation({ summary: 'Remove a layer from a map' })
  @ApiParam({ name: 'mapId', description: 'Map ID' })
  @ApiParam({ name: 'layerId', description: 'Layer ID' })
  @ApiResponse({ status: 200, description: 'Layer removed from map' })
  @ApiResponse({ status: 404, description: 'Map or Layer not found' })
  removeLayerFromMap(
    @Param('mapId', ParseIntPipe) mapId: number,
    @Param('layerId', ParseIntPipe) layerId: number,
  ) {
    return this.mapLayersService.removeLayerFromMap(mapId, layerId);
  }

  @Patch('map/:mapId/reorder')
  @ApiOperation({ summary: 'Reorder layers in a map' })
  @ApiParam({ name: 'mapId', description: 'Map ID' })
  @ApiResponse({ status: 200, description: 'Layers reordered successfully' })
  @ApiResponse({ status: 404, description: 'Map not found' })
  reorderLayers(
    @Param('mapId', ParseIntPipe) mapId: number,
    @Body() body: { layers: { layerId: number; displayOrder: number }[] },
  ) {
    return this.mapLayersService.reorderLayers(mapId, body.layers);
  }
}
