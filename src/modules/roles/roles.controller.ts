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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(AuthGuard)
@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo rol',
    description:
      'Crea un rol con sus páginas asociadas. Base del sistema de permisos.',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    type: Number,
    description: 'ID del usuario que crea el rol',
    example: 1,
  })
  @ApiResponse({
    status: 201,
    description: 'Rol creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o páginas no existen',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un rol con ese nombre',
  })
  create(
    @Body() createRoleDto: CreateRoleDto,
    @GetUser() user?: any,
  ) {
    return this.rolesService.create(createRoleDto, user.userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los roles',
    description: 'Lista paginada de roles con filtros opcionales',
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
    description: 'Buscar por nombre de rol',
    example: 'admin',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de roles obtenida exitosamente',
  })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
  ) {
    return this.rolesService.findAll(page, limit, isActive, search);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de roles',
    description:
      'Retorna estadísticas: total, activos, inactivos, roles más asignados',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
  })
  getStats() {
    return this.rolesService.getStats();
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Obtener roles de un usuario',
    description: 'Lista todos los roles asignados a un usuario específico',
  })
  @ApiParam({
    name: 'userId',
    type: Number,
    description: 'ID del usuario',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Roles del usuario obtenidos exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  findRolesByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.rolesService.findRolesByUser(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un rol por ID',
    description: 'Retorna los detalles de un rol incluyendo sus páginas asociadas',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del rol',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Rol encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Rol no encontrado',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Post(':id/pages')
  @ApiOperation({
    summary: 'Asignar páginas a un rol',
    description:
      'Asigna o reemplaza las páginas asociadas a un rol. Útil para gestionar permisos.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del rol',
    example: 1,
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    type: Number,
    description: 'ID del usuario que asigna',
    example: 1,
  })
  @ApiQuery({
    name: 'replace',
    required: false,
    type: Boolean,
    description: 'Si true, reemplaza todas las páginas. Si false, agrega nuevas.',
    example: true,
  })
  @ApiBody({
    description: 'Array de IDs de páginas',
    schema: {
      type: 'object',
      properties: {
        pageIds: {
          type: 'array',
          items: { type: 'number' },
          example: [1, 2, 3],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Páginas asignadas exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Rol no encontrado',
  })
  assignPages(
    @Param('id', ParseIntPipe) id: number,
    @Body('pageIds') pageIds: number[],
    @Query('replace', new DefaultValuePipe(true)) replace: boolean,
    @GetUser() user?: any,
  ) {
    return this.rolesService.assignPages(id, pageIds, user.userId, replace);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar un rol',
    description: 'Actualiza los datos de un rol incluyendo sus páginas asociadas',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del rol',
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
    description: 'Rol actualizado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Rol no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Nombre ya existe en otro rol',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
    @GetUser() user?: any
  ) {
    return this.rolesService.update(id, updateRoleDto, user.userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar un rol (soft delete)',
    description:
      'Desactiva un rol cambiando su estado isActive a false. No elimina físicamente el registro.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del rol',
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
    description: 'Rol desactivado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Rol no encontrado',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user?: any
  ) {
    return this.rolesService.remove(id, user.userId);
  }
}
