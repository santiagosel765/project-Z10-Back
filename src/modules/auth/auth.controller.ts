import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { type Request, type Response } from 'express';
import { envs } from 'src/config/envs';
import { JwtAuthGuard } from 'src/common/guards/auth/jwt.guard';
import { GetUser } from './decorators/get-user.decorator';
import {
  LoginRequestDto,
  LoginResponseDto,
  MeResponseDto,
  RefreshResponseDto,
  ValidateResponseDto,
} from './dto/auth.dto';

import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

type RequestWithCookies = Request & { cookies: Record<string, string> };

const isProd = envs.nodeEnv === 'production';

const accessCookieName = isProd ? '__Host-access' : 'access_token';
const refreshCookieName = isProd ? '__Host-refresh' : 'refresh_token';

const baseCookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProd,
  path: '/',
};

const accessCookieOpts = baseCookieOpts;
const refreshCookieOpts = baseCookieOpts;

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user and issue access/refresh tokens.',
  })
  @ApiBody({ type: LoginRequestDto })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @Post('login')
  async login(
    @Body() loginUserDto: LoginRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const data = await this.authService.login(loginUserDto);

    res.cookie(accessCookieName, data.accessToken, {
      ...accessCookieOpts,
      maxAge: Number(envs.jwtAccessExpiration) * 1000,
    });
    res.cookie(refreshCookieName, data.refreshToken, {
      ...refreshCookieOpts,
      maxAge: Number(envs.jwtRefreshExpiration) * 1000,
    });

    return data;
  }

  @SkipThrottle()
  @ApiOperation({ summary: 'Refresh tokens' })
  @ApiOkResponse({ type: RefreshResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  @Post('refresh')
  async refresh(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponseDto> {
    const refreshToken =
      req.cookies[refreshCookieName] ||
      req.headers.authorization?.split(' ')?.[1];

    const tokens = await this.authService.refreshToken(refreshToken);

    res.cookie(accessCookieName, tokens.accessToken, {
      ...accessCookieOpts,
      maxAge: Number(envs.jwtAccessExpiration) * 1000,
    });
    res.cookie(refreshCookieName, tokens.refreshToken, {
      ...refreshCookieOpts,
      maxAge: Number(envs.jwtRefreshExpiration) * 1000,
    });

    return tokens;
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @Get('me')
  async me(@GetUser() user: any): Promise<MeResponseDto> {
    return {
      id: user?.userId ?? user?.sub,
      email: user?.email,
      roles: user?.roles ?? [],
      employeeCode: user?.employeeCode,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Validate current access token' })
  @ApiOkResponse({ type: ValidateResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @Get('validate')
  async validate(): Promise<ValidateResponseDto> {
    return { valid: true };
  }
}
