import { IsOptional, IsString, Length } from "class-validator";

export class CreateSubjectDto {
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  color?: string; // e.g. your 'bg-[hsl(...)]' string
}
