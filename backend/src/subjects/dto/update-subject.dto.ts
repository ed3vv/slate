import { IsBoolean, IsOptional, IsString, Length } from "class-validator";

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @IsOptional()
  @IsString()
  color?: string | null;

  @IsOptional()
  @IsBoolean()
  expanded?: boolean;
}
