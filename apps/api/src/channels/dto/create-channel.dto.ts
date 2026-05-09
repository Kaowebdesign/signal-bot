import { IsString, IsNotEmpty } from 'class-validator';

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  channelUsername: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
