import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateRoleDto {
  @IsNotEmpty()
  @IsIn(['OWNER', 'ADMIN', 'MEMBER'])
  role: string;
}
