import { IsBoolean, IsEnum, IsOptional, IsString, Length, IsUUID, IsDateString } from "class-validator";
import { Priority } from "@prisma/client";

export class CreateTaskDto {
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsUUID()
  subjectId!: string;

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
