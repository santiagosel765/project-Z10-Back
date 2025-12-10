import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SdkTokensService } from './sdk-tokens.service';
import { CreateSdkClientDto } from './dto/create-sdk-client.dto';
import { UpdateSdkClientDto } from './dto/update-sdk-client.dto';
import { CreateSdkTokenDto } from './dto/create-sdk-token.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';

@ApiTags('sdk-tokens')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('sdk-tokens')
export class SdkTokensController {
  constructor(private readonly sdkTokensService: SdkTokensService) {}

  @Post('clients')
  @ApiOperation({ summary: 'Crear un nuevo cliente SDK' })
  @ApiResponse({ status: 201, description: 'Cliente creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Cliente con ese nombre ya existe' })
  createClient(@Body() createSdkClientDto: CreateSdkClientDto) {
    return this.sdkTokensService.createClient(createSdkClientDto);
  }

  @Get('clients')
  @ApiOperation({ summary: 'Obtener todos los clientes SDK' })
  @ApiResponse({ status: 200, description: 'Lista de clientes' })
  getAllClients() {
    return this.sdkTokensService.getAllClients();
  }

  @Get('clients/:id')
  @ApiOperation({ summary: 'Obtener cliente por ID con sus tokens' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Detalles del cliente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  getClientById(@Param('id', ParseIntPipe) id: number) {
    return this.sdkTokensService.getClientById(id);
  }

  @Patch('clients/:id')
  @ApiOperation({ summary: 'Actualizar cliente SDK' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Cliente actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  updateClient(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSdkClientDto: UpdateSdkClientDto,
  ) {
    return this.sdkTokensService.updateClient(id, updateSdkClientDto);
  }

  @Delete('clients/:id')
  @ApiOperation({ summary: 'Eliminar cliente SDK (y sus tokens en cascada)' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Cliente eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  deleteClient(@Param('id', ParseIntPipe) id: number) {
    return this.sdkTokensService.deleteClient(id);
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Generar un nuevo token SDK',
    description:
      '⚠️ El token completo solo se muestra una vez. Guárdalo de forma segura.',
  })
  @ApiResponse({
    status: 201,
    description: 'Token generado exitosamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        token: {
          type: 'string',
          example: 'znt_a1b2c3d4e5f6...',
          description: '⚠️ Solo se muestra una vez',
        },
        tokenPrefix: { type: 'string', example: 'znt_a1b2c3d4...' },
        clientId: { type: 'number', example: 1 },
        clientName: { type: 'string', example: 'Mobile App Client' },
        rateLimit: { type: 'number', example: 1000 },
        expiresAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        createdAt: { type: 'string', format: 'date-time' },
        warning: {
          type: 'string',
          example: 'Guarda este token de forma segura. No podrás verlo de nuevo.',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado o inactivo' })
  generateToken(@Body() createSdkTokenDto: CreateSdkTokenDto) {
    return this.sdkTokensService.generateToken(createSdkTokenDto);
  }

  @Get('tokens/client/:clientId')
  @ApiOperation({ summary: 'Obtener todos los tokens de un cliente' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Lista de tokens del cliente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  getClientTokens(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.sdkTokensService.getClientTokens(clientId);
  }

  @Delete('tokens/:id')
  @ApiOperation({ summary: 'Revocar token (desactivar)' })
  @ApiParam({ name: 'id', description: 'Token ID' })
  @ApiResponse({ status: 200, description: 'Token revocado exitosamente' })
  @ApiResponse({ status: 404, description: 'Token no encontrado' })
  revokeToken(@Param('id', ParseIntPipe) id: number) {
    return this.sdkTokensService.revokeToken(id);
  }
}
