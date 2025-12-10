import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
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

@ApiTags('SDK Auth')
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
  @Throttle(30, 60)
  @ApiOperation({
    summary: 'Validar token SDK',
    description:
      'Pensado para ser llamado por zenit-sdk. Valida el token usando el prefijo y bcrypt.',
  })
  @ApiBody({ type: SdkTokenValidateRequestDto })
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
  @Throttle(20, 60)
  @ApiOperation({
    summary: 'Intercambiar token SDK por un JWT corto',
    description:
      'Endpoint pensado para zenit-sdk. Devuelve un JWT de corta duración si el token SDK es válido.',
  })
  @ApiBody({ type: SdkTokenExchangeRequestDto })
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
