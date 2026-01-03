import { IsBoolean, IsEnum, IsOptional, IsString, Length, IsDateString } from "class-validator";
import { Priority } from "@prisma/client";

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}
