import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MapsService } from './maps.service';
import { CreateMapDto } from './dto/create-map.dto';
import { UpdateMapDto } from './dto/update-map.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';


@ApiTags('maps')
@Controller('maps')
export class MapsController {

  private logger = new Logger(MapsController.name);

  constructor(private readonly mapsService: MapsService) {}
  @UseGuards(AuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create a new map' })
  @ApiResponse({ status: 201, description: 'Map created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(
    @Body() createMapDto: CreateMapDto,
    @GetUser() user?: any,
  ) {
    this.logger.log({user})
    const userId = user.userId;
    return this.mapsService.create(createMapDto, userId);
  }

  @UseGuards(AuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all maps with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'List of maps' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.mapsService.findAll(page, limit);
  }

  @UseGuards(AuthGuard)
  @Get('default')
  @ApiOperation({ summary: 'Get the default map' })
  @ApiResponse({ status: 200, description: 'Default map' })
  @ApiResponse({ status: 404, description: 'No default map configured' })
  getDefault() {
    return this.mapsService.getDefaultMap();
  }

  @UseGuards(AuthGuard)
  @Get('search')
  @ApiOperation({ summary: 'Search maps by name or description' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'mapType', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Search results' })
  search(
    @Query('q') query: string,
    @Query('mapType') mapType?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.mapsService.searchMaps(query, mapType, page, limit);
  }

  @UseGuards(AuthGuard)
  @Get('stats')
  @ApiOperation({ summary: 'Get map statistics' })
  @ApiResponse({ status: 200, description: 'Map statistics' })
  getStats() {
    return this.mapsService.getMapStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a map by ID' })
  @ApiParam({ name: 'id', description: 'Map ID' })
  @ApiQuery({ name: 'includeLayers', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Map details' })
  @ApiResponse({ status: 404, description: 'Map not found' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeLayers') includeLayers?: boolean,
  ) {
    return this.mapsService.findOne(id, includeLayers);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a map' })
  @ApiParam({ name: 'id', description: 'Map ID' })
  @ApiResponse({ status: 200, description: 'Map updated successfully' })
  @ApiResponse({ status: 404, description: 'Map not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMapDto: UpdateMapDto,
    @GetUser() user?: any,
  ) {
    return this.mapsService.update(id, updateMapDto, user.id);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a map (soft delete)' })
  @ApiParam({ name: 'id', description: 'Map ID' })
  @ApiResponse({ status: 200, description: 'Map deleted successfully' })
  @ApiResponse({ status: 404, description: 'Map not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete default map' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user?: any,
  ) {
    return this.mapsService.remove(id, user.id);
  }

  @Public()
  @Get('public/all')
  @ApiOperation({ summary: 'Get all public maps (no authentication required)' })
  @ApiResponse({ status: 200, description: 'List of public maps with embed URLs' })
  findAllPublic() {
    return this.mapsService.findAllPublicMaps();
  }

  @Public()
  @Get('public/:id')
  @ApiOperation({ summary: 'Get a public map by ID (no authentication required)' })
  @ApiParam({ name: 'id', description: 'Map ID' })
  @ApiQuery({ name: 'includeLayers', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Public map details with embed URL' })
  @ApiResponse({ status: 404, description: 'Public map not found' })
  findOnePublic(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeLayers') includeLayers?: boolean,
  ) {
    return this.mapsService.findPublicMap(id, includeLayers);
  }
}
