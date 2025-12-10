export class MeResponseDto {
  id: number;
  email: string;
  roles: any[];
  employeeCode?: string;
}

export class ValidateResponseDto {
  valid: boolean;
}
