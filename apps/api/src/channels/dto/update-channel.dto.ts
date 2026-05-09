import { IsBoolean } from 'class-validator';

export class UpdateChannelDto {
  @IsBoolean()
  isActive: boolean;
}
