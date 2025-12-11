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
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SdkTokensService } from './sdk-tokens.service';
import { CreateSdkClientDto } from './dto/create-sdk-client.dto';
import { UpdateSdkClientDto } from './dto/update-sdk-client.dto';
import { CreateSdkTokenDto } from './dto/create-sdk-token.dto';
import { JwtAuthGuard } from 'src/common/guards/auth/jwt.guard';
import {
  SdkClientResponseDto,
  SdkClientWithTokensResponseDto,
  SdkTokenResponseDto,
} from './dto/sdk-token-response.dto';

@ApiTags('SDK Tokens')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('sdk-tokens')
export class SdkTokensController {
  constructor(private readonly sdkTokensService: SdkTokensService) {}

  @Post('clients')
  @ApiOperation({ summary: 'Crear un nuevo cliente SDK' })
  @ApiCreatedResponse({
    description: 'Cliente creado exitosamente',
    type: SdkClientResponseDto,
  })
  @ApiOkResponse({ status: 409, description: 'Cliente con ese nombre ya existe' })
  createClient(@Body() createSdkClientDto: CreateSdkClientDto) {
    return this.sdkTokensService.createClient(createSdkClientDto);
  }

  @Get('clients')
  @ApiOperation({ summary: 'Obtener todos los clientes SDK' })
  @ApiOkResponse({
    description: 'Lista de clientes',
    type: SdkClientResponseDto,
    isArray: true,
  })
  getAllClients() {
    return this.sdkTokensService.getAllClients();
  }

  @Get('clients/:id')
  @ApiOperation({ summary: 'Obtener cliente por ID con sus tokens' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiOkResponse({
    description: 'Detalles del cliente',
    type: SdkClientWithTokensResponseDto,
  })
  @ApiOkResponse({ status: 404, description: 'Cliente no encontrado' })
  getClientById(@Param('id', ParseIntPipe) id: number) {
    return this.sdkTokensService.getClientById(id);
  }

  @Patch('clients/:id')
  @ApiOperation({ summary: 'Actualizar cliente SDK' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiOkResponse({
    description: 'Cliente actualizado exitosamente',
    type: SdkClientResponseDto,
  })
  @ApiOkResponse({ status: 404, description: 'Cliente no encontrado' })
  updateClient(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSdkClientDto: UpdateSdkClientDto,
  ) {
    return this.sdkTokensService.updateClient(id, updateSdkClientDto);
  }

  @Delete('clients/:id')
  @ApiOperation({ summary: 'Eliminar cliente SDK (y sus tokens en cascada)' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiOkResponse({
    description: 'Cliente eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Cliente eliminado exitosamente' },
        id: { type: 'number', example: 1 },
      },
    },
  })
  @ApiOkResponse({ status: 404, description: 'Cliente no encontrado' })
  deleteClient(@Param('id', ParseIntPipe) id: number) {
    return this.sdkTokensService.deleteClient(id);
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Generar un nuevo token SDK',
    description:
      '⚠️ El token completo solo se muestra una vez. Guárdalo de forma segura.',
  })
  @ApiCreatedResponse({
    description: 'Token generado exitosamente',
    type: SdkTokenResponseDto,
  })
  @ApiOkResponse({ status: 404, description: 'Cliente no encontrado o inactivo' })
  generateToken(@Body() createSdkTokenDto: CreateSdkTokenDto) {
    return this.sdkTokensService.generateToken(createSdkTokenDto);
  }

  @Get('tokens/client/:clientId')
  @ApiOperation({ summary: 'Obtener todos los tokens de un cliente' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiOkResponse({
    description: 'Lista de tokens del cliente',
    type: SdkTokenResponseDto,
    isArray: true,
  })
  @ApiOkResponse({ status: 404, description: 'Cliente no encontrado' })
  getClientTokens(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.sdkTokensService.getClientTokens(clientId);
  }

  @Delete('tokens/:id')
  @ApiOperation({ summary: 'Revocar token (desactivar)' })
  @ApiParam({ name: 'id', description: 'Token ID' })
  @ApiOkResponse({
    description: 'Token revocado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Token revocado exitosamente' },
        id: { type: 'number', example: 1 },
        tokenPrefix: { type: 'string', example: 'znt_a1b2c3d4...' },
      },
    },
  })
  @ApiOkResponse({ status: 404, description: 'Token no encontrado' })
  revokeToken(@Param('id', ParseIntPipe) id: number) {
    return this.sdkTokensService.revokeToken(id);
  }
}
