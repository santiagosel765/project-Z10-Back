import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { BcryptAdapter } from 'src/common/adapters/bcrypt.adapter';
import { User } from 'src/entities';
import { envs } from 'src/config/envs';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(loginUserDto: LoginUserDto) {
    
    const dbUser = await this.userService.findUserByEmail(loginUserDto.email);
    
    try {
      if (
        !BcryptAdapter.comparePassword(
          dbUser.user.password,
          loginUserDto.password,
        )
      ) {
        throw new UnauthorizedException('INVALID_CREDENTIALS');
      }

      const { password, ...user } = dbUser.user;

      const { accessToken, refreshToken } = await this.generateTokens(
        dbUser.user,
        dbUser.roles,
      );
      return {
        accessToken,
        refreshToken,
        user: {
          ...user,
          roles: dbUser.roles,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken)
      throw new UnauthorizedException('REFRESH_TOKEN_INVALID');

    const payload = await this.jwtService.verifyAsync(refreshToken, {
      secret: envs.jwtRefreshSecret,
    });
    const dbUser = await this.userService.findUserByEmail(payload.email);

    if (!payload?.sub)
      throw new UnauthorizedException('TOKEN_INVALID');

    if (payload?.type !== 'refresh')
      throw new UnauthorizedException('TOKEN_INVALID');


    if (!dbUser.user || dbUser.user.isActive === false) {
      throw new UnauthorizedException('USER_INACTIVE');
    }

    return this.generateTokens(dbUser.user, dbUser.roles);
  }

  async generateTokens(user: User, roles) {
    const accessPayload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      employeeCode: user.employeeCode,
      roles,
      type: 'access',
    };


    const refreshPayload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: envs.jwtAccessSecret,
      expiresIn: `${envs.jwtAccessExpiration || 3600}s`,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: envs.jwtRefreshSecret,
      expiresIn: `${envs.jwtRefreshExpiration || 604800}s`,
    });


    return {
      accessToken,
      refreshToken,
    };
  }
}
