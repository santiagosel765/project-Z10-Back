import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { envs } from 'src/config/envs';
import { SdkTokensService } from './sdk-tokens.service';
import {
  SdkTokenExchangeRequestDto,
  SdkTokenExchangeResponseDto,
  SdkTokenValidateRequestDto,
  SdkTokenValidateResponseDto,
} from './dto/sdk-token-validate.dto';

@ApiTags('Auth – SDK')
@Controller('sdk-auth')
export class SdkAuthController {
  constructor(
    private readonly sdkTokensService: SdkTokensService,
    private readonly jwtService: JwtService,
  ) {}

  private pickToken(
    body: SdkTokenValidateRequestDto,
    headerToken?: string,
  ): string {
    const rawToken = body.token?.trim() || headerToken?.trim();

    if (!rawToken) {
      throw new UnauthorizedException('SDK_TOKEN_REQUIRED');
    }

    return rawToken;
  }

  @Post('validate')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  @ApiOperation({
    summary: 'Validar token SDK',
    description:
      'Valida un token SDK (en header x-sdk-token o body) y devuelve información del cliente asociado.',
  })
  @ApiHeader({
    name: 'x-sdk-token',
    required: false,
    description: 'Token SDK en cabecera alternativa al body.',
  })
  @ApiBody({ type: SdkTokenValidateRequestDto, required: false })
  @ApiOkResponse({ type: SdkTokenValidateResponseDto })
  @ApiUnauthorizedResponse({ description: 'SDK token invalid or expired' })
  async validateToken(
    @Body() body: SdkTokenValidateRequestDto,
    @Headers('x-sdk-token') headerToken?: string,
  ): Promise<SdkTokenValidateResponseDto> {
    const token = this.pickToken(body, headerToken);
    const validationResult = await this.sdkTokensService.validateRawToken(token);

    if (!validationResult.valid) {
      throw new UnauthorizedException(
        validationResult.reason || 'SDK_TOKEN_INVALID',
      );
    }

    return {
      valid: true,
      clientId: validationResult.clientId!,
      clientName: validationResult.clientName,
      scopes: validationResult.scopes || [],
    };
  }

  @Post('exchange')
  @Throttle({ default: { limit: 20, ttl: 60 } })
  @ApiOperation({
    summary: 'Intercambiar token SDK por JWT',
    description:
      'Intercambia un token SDK válido por un accessToken JWT corto pensado para el SDK.',
  })
  @ApiHeader({
    name: 'x-sdk-token',
    required: false,
    description: 'Token SDK en cabecera alternativa al body.',
  })
  @ApiBody({ type: SdkTokenExchangeRequestDto, required: false })
  @ApiOkResponse({ type: SdkTokenExchangeResponseDto })
  @ApiUnauthorizedResponse({ description: 'SDK token invalid or expired' })
  async exchangeToken(
    @Body() body: SdkTokenExchangeRequestDto,
    @Headers('x-sdk-token') headerToken?: string,
  ): Promise<SdkTokenExchangeResponseDto> {
    const token = this.pickToken(body, headerToken);
    const validationResult = await this.sdkTokensService.validateRawToken(token);

    if (!validationResult.valid) {
      throw new UnauthorizedException(
        validationResult.reason || 'SDK_TOKEN_INVALID',
      );
    }

    const expiresIn = 15 * 60; // 15 minutos
    const payload = {
      sub: validationResult.clientId,
      clientId: validationResult.clientId,
      clientName: validationResult.clientName,
      type: 'sdk',
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: `${expiresIn}s`,
      secret: envs.jwtAccessSecret,
    });

    return {
      accessToken,
      expiresIn,
      tokenType: 'Bearer',
    };
  }
}
