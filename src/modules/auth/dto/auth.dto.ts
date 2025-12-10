import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoginUserDto } from './login-user.dto';

export class LoginRequestDto extends LoginUserDto {}

export class UserSummaryDto {
  @ApiProperty({ description: 'User identifier', example: 1 })
  id: number;

  @ApiProperty({ description: 'Email address', example: 'user@example.com' })
  email: string;

  @ApiProperty({
    description: 'Roles associated to the user',
    type: [String],
    example: ['admin'],
  })
  roles: any[];

  @ApiPropertyOptional({ description: 'Employee code if available' })
  employeeCode?: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Access token (JWT)', example: 'jwt.token' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token (JWT)', example: 'jwt.refresh' })
  refreshToken: string;

  @ApiProperty({ description: 'Authenticated user data', type: UserSummaryDto })
  user: UserSummaryDto;
}

export class RefreshResponseDto {
  @ApiProperty({ description: 'Access token (JWT)', example: 'jwt.token' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token (JWT)', example: 'jwt.refresh' })
  refreshToken: string;
}

export class MeResponseDto extends UserSummaryDto {}

export class ValidateResponseDto {
  @ApiProperty({ description: 'Indicates if the access token is valid' })
  valid: boolean;
}

export class RefreshRequestDto {
  @ApiPropertyOptional({ description: 'Refresh token', example: 'jwt.refresh' })
  refresh_token?: string;

  @ApiPropertyOptional({ description: 'Refresh token', example: 'jwt.refresh' })
  refreshToken?: string;
}
