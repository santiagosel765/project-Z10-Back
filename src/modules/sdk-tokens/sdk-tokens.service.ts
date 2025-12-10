import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SdkClient } from './entities/sdk-client.entity';
import { SdkToken } from './entities/sdk-token.entity';
import { CreateSdkClientDto } from './dto/create-sdk-client.dto';
import { UpdateSdkClientDto } from './dto/update-sdk-client.dto';
import { CreateSdkTokenDto } from './dto/create-sdk-token.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SdkTokensService {
  private readonly logger = new Logger(SdkTokensService.name);

  constructor(
    @InjectRepository(SdkClient)
    private sdkClientRepository: Repository<SdkClient>,

    @InjectRepository(SdkToken)
    private sdkTokenRepository: Repository<SdkToken>,
  ) {}

  /**
   * Crear un nuevo SDK client
   */
  async createClient(dto: CreateSdkClientDto) {
    const existingClient = await this.sdkClientRepository.findOne({
      where: { name: dto.name },
    });

    if (existingClient) {
      throw new ConflictException(
        `Cliente con nombre "${dto.name}" ya existe`,
      );
    }

    const client = this.sdkClientRepository.create({
      name: dto.name,
      description: dto.description,
      email: dto.email,
      isActive: true,
    });

    await this.sdkClientRepository.save(client);

    return {
      id: client.id,
      name: client.name,
      description: client.description,
      email: client.email,
      isActive: client.isActive,
      createdAt: client.createdAt,
    };
  }

  /**
   * Obtener todos los clientes
   */
  async getAllClients() {
    const clients = await this.sdkClientRepository.find({
      order: { createdAt: 'DESC' },
    });

    return clients.map((client) => ({
      id: client.id,
      name: client.name,
      description: client.description,
      email: client.email,
      isActive: client.isActive,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    }));
  }

  /**
   * Obtener cliente por ID
   */
  async getClientById(id: number) {
    const client = await this.sdkClientRepository.findOne({
      where: { id },
      relations: ['tokens'],
    });

    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return {
      id: client.id,
      name: client.name,
      description: client.description,
      email: client.email,
      isActive: client.isActive,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      tokens: client.tokens.map((token) => ({
        id: token.id,
        tokenPrefix: token.tokenPrefix,
        rateLimit: token.rateLimit,
        isActive: token.isActive,
        expiresAt: token.expiresAt,
        lastUsedAt: token.lastUsedAt,
        createdAt: token.createdAt,
      })),
    };
  }

  /**
   * Actualizar cliente
   */
  async updateClient(id: number, dto: UpdateSdkClientDto) {
    const client = await this.sdkClientRepository.findOne({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    if (dto.name && dto.name !== client.name) {
      const existingClient = await this.sdkClientRepository.findOne({
        where: { name: dto.name },
      });

      if (existingClient) {
        throw new ConflictException(
          `Cliente con nombre "${dto.name}" ya existe`,
        );
      }
      client.name = dto.name;
    }

    if (dto.description !== undefined) {
      client.description = dto.description;
    }

    if (dto.email !== undefined) {
      client.email = dto.email;
    }

    if (dto.isActive !== undefined) {
      client.isActive = dto.isActive;
    }

    await this.sdkClientRepository.save(client);

    return {
      id: client.id,
      name: client.name,
      description: client.description,
      email: client.email,
      isActive: client.isActive,
      updatedAt: client.updatedAt,
    };
  }

  /**
   * Generar un nuevo token SDK
   */
  async generateToken(dto: CreateSdkTokenDto) {
    const client = await this.sdkClientRepository.findOne({
      where: { id: dto.clientId, isActive: true },
    });

    if (!client) {
      throw new NotFoundException(
        `Cliente con ID ${dto.clientId} no encontrado o inactivo`,
      );
    }

    // Generar token único: znt_<random_string>
    const randomString = crypto.randomBytes(32).toString('hex');
    const token = `znt_${randomString}`;

    // Hash del token para almacenar en BD
    const tokenHash = await bcrypt.hash(token, 10);

    // Guardar prefijo para mostrar (primeros 12 caracteres)
    const tokenPrefix = token.substring(0, 12) + '...';

    const sdkToken = this.sdkTokenRepository.create({
      clientId: dto.clientId,
      tokenHash: tokenHash,
      tokenPrefix: tokenPrefix,
      rateLimit: dto.rateLimit || 1000,
      isActive: true,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    await this.sdkTokenRepository.save(sdkToken);

    this.logger.log(
      `Token generado para cliente ${client.name} (ID: ${client.id})`,
    );

    // Retornar el token en texto plano SOLO esta vez
    return {
      id: sdkToken.id,
      token: token, // ⚠️ Solo se muestra aquí, nunca más
      tokenPrefix: sdkToken.tokenPrefix,
      clientId: client.id,
      clientName: client.name,
      rateLimit: sdkToken.rateLimit,
      expiresAt: sdkToken.expiresAt,
      createdAt: sdkToken.createdAt,
      warning:
        'Guarda este token de forma segura. No podrás verlo de nuevo.',
    };
  }

  /**
   * Validar token SDK
   */
  async validateToken(token: string): Promise<SdkToken | null> {
    if (!token || !token.startsWith('znt_')) {
      throw new UnauthorizedException('Token inválido');
    }

    // Buscar todos los tokens activos
    const tokens = await this.sdkTokenRepository.find({
      where: { isActive: true },
      relations: ['client'],
    });

    // Comparar con bcrypt
    for (const sdkToken of tokens) {
      const isMatch = await bcrypt.compare(token, sdkToken.tokenHash);

      if (isMatch) {
        // Verificar si el cliente está activo
        if (!sdkToken.client.isActive) {
          throw new UnauthorizedException(
            'Cliente asociado al token está inactivo',
          );
        }

        // Verificar expiración
        if (sdkToken.expiresAt && new Date() > sdkToken.expiresAt) {
          throw new UnauthorizedException('Token expirado');
        }

        // Actualizar last_used_at
        sdkToken.lastUsedAt = new Date();
        await this.sdkTokenRepository.save(sdkToken);

        return sdkToken;
      }
    }

    throw new UnauthorizedException('Token inválido');
  }

  /**
   * Revocar token (desactivar)
   */
  async revokeToken(id: number) {
    const token = await this.sdkTokenRepository.findOne({
      where: { id },
    });

    if (!token) {
      throw new NotFoundException(`Token con ID ${id} no encontrado`);
    }

    token.isActive = false;
    await this.sdkTokenRepository.save(token);

    return {
      message: 'Token revocado exitosamente',
      id: token.id,
      tokenPrefix: token.tokenPrefix,
    };
  }

  /**
   * Obtener todos los tokens de un cliente
   */
  async getClientTokens(clientId: number) {
    const client = await this.sdkClientRepository.findOne({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Cliente con ID ${clientId} no encontrado`);
    }

    const tokens = await this.sdkTokenRepository.find({
      where: { clientId },
      order: { createdAt: 'DESC' },
    });

    return tokens.map((token) => ({
      id: token.id,
      tokenPrefix: token.tokenPrefix,
      rateLimit: token.rateLimit,
      isActive: token.isActive,
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
      createdAt: token.createdAt,
    }));
  }

  /**
   * Verificar rate limit (implementación básica)
   */
  async checkRateLimit(tokenId: number): Promise<boolean> {
    const token = await this.sdkTokenRepository.findOne({
      where: { id: tokenId, isActive: true },
    });

    if (!token) {
      return false;
    }

    // TODO: Implementar lógica de rate limiting con Redis o similar
    // Por ahora solo retorna true
    this.logger.debug(
      `Rate limit check for token ${token.tokenPrefix}: ${token.rateLimit} req/hour`,
    );

    return true;
  }

  /**
   * Eliminar cliente (y sus tokens en cascada)
   */
  async deleteClient(id: number) {
    const client = await this.sdkClientRepository.findOne({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    await this.sdkClientRepository.remove(client);

    return {
      message: 'Cliente eliminado exitosamente',
      id: id,
    };
  }
}
