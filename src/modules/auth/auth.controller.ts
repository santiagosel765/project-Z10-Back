import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { type Response } from 'express';
import { envs } from 'src/config/envs';

import { SkipThrottle } from '@nestjs/throttler';

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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
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
  @Post('refresh')
  async refresh(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies[refreshCookieName];

    const tokens = await this.authService.refreshToken(refreshToken);

    res.cookie(accessCookieName, tokens.accessToken, {
      ...accessCookieOpts,
      maxAge: Number(envs.jwtAccessExpiration) * 1000,
    });
    res.cookie(refreshCookieName, tokens.refreshToken, {
      ...refreshCookieOpts,
      maxAge: Number(envs.jwtRefreshExpiration) * 1000,
    });

    return { ok: true };
  }
}
