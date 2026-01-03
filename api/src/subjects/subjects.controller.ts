import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { SubjectsService } from "./subjects.service";
import { CreateSubjectDto } from "./dto/create-subject.dto";
import { UpdateSubjectDto } from "./dto/update-subject.dto";

@Controller("subjects")
@UseGuards(FirebaseAuthGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  list(@Req() req: any) {
    return this.subjectsService.listForFirebase(req.firebase);
  }

  @Post()
  create(@Req() req: any, @Body() body: CreateSubjectDto) {
    return this.subjectsService.createForFirebase(req.firebase, body);
  }

  @Patch(":subjectId")
  update(@Req() req: any, @Param("subjectId") subjectId: string, @Body() body: UpdateSubjectDto) {
    return this.subjectsService.updateForFirebase(req.firebase, subjectId, body);
  }

  @Delete(":subjectId")
  remove(@Req() req: any, @Param("subjectId") subjectId: string) {
    return this.subjectsService.deleteForFirebase(req.firebase, subjectId);
  }
}
