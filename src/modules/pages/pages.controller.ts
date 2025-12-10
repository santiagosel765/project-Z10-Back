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
  ParseBoolPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';

@UseGuards(AuthGuard)
@ApiTags('Pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una nueva página',
    description:
      'Crea una página con sus roles asociados. Útil para el dinamismo del sistema de permisos.',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    type: Number,
    description: 'ID del usuario que crea la página',
    example: 1,
  })
  @ApiResponse({
    status: 201,
    description: 'Página creada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o roles no existen',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe una página con esa URL',
  })
  create(
    @Body() createPageDto: CreatePageDto,
    @GetUser() user: any,
  ) {
    return this.pagesService.create(createPageDto, user.userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las páginas',
    description: 'Lista paginada de páginas con filtros opcionales',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Cantidad de resultados por página',
    example: 10,
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrar por estado activo/inactivo',
    example: true,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Buscar por nombre de página',
    example: 'dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de páginas obtenida exitosamente',
  })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
  ) {
    return this.pagesService.findAll(page, limit, isActive, search);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de páginas',
    description:
      'Retorna estadísticas generales: total, activas, inactivas, páginas más asociadas a roles',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
  })
  getStats() {
    return this.pagesService.getStats();
  }

  @Get('role/:roleId')
  @ApiOperation({
    summary: 'Obtener páginas por rol',
    description: 'Lista todas las páginas asociadas a un rol específico',
  })
  @ApiParam({
    name: 'roleId',
    type: Number,
    description: 'ID del rol',
    example: 1,
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrar por páginas activas',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Páginas del rol obtenidas exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Rol no encontrado',
  })
  findPagesByRole(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Query('isActive', new DefaultValuePipe(true), ParseBoolPipe)
    isActive: boolean,
  ) {
    return this.pagesService.findPagesByRole(roleId, isActive);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una página por ID',
    description: 'Retorna los detalles de una página incluyendo sus roles asociados',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID de la página',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Página encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Página no encontrada',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pagesService.findOne(id);
  }

  @Patch('reorder')
  @ApiOperation({
    summary: 'Reordenar páginas',
    description:
      'Actualiza el orden de visualización de múltiples páginas a la vez',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    type: Number,
    description: 'ID del usuario que reordena',
    example: 1,
  })
  @ApiBody({
    description: 'Array de objetos con id y nuevo order',
    schema: {
      type: 'object',
      properties: {
        pages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              order: { type: 'number', example: 5 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Páginas reordenadas exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Una o más páginas no encontradas',
  })
  reorder(
    @Body('pages') pages: Array<{ id: number; order: number }>,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.pagesService.reorderPages(pages, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar una página',
    description:
      'Actualiza los datos de una página incluyendo sus roles asociados',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID de la página',
    example: 1,
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    type: Number,
    description: 'ID del usuario que actualiza',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Página actualizada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Página no encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'URL ya existe en otra página',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePageDto: UpdatePageDto,
    @GetUser() user?: any,
  ) {
    return this.pagesService.update(id, updatePageDto, user.userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una página (soft delete)',
    description:
      'Desactiva una página cambiando su estado isActive a false. No elimina físicamente el registro.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID de la página',
    example: 1,
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    type: Number,
    description: 'ID del usuario que elimina',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Página desactivada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Página no encontrada',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user?: any,
  ) {
    return this.pagesService.remove(id, user.userId);
  }
}
