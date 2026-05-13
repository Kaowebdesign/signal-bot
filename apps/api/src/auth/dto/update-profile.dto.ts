import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @IsBoolean()
  @IsOptional()
  ttsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  showClearAlerts?: boolean;
}
