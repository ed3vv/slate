import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";



@Controller("tasks")
@UseGuards(FirebaseAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Req() req: any, @Body() body: CreateTaskDto) {
    return this.tasksService.createForFirebase(req.firebase, body);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.tasksService.findAllForFirebase(req.firebase);
  }

  @Get(":taskId")
  findOne(@Req() req: any, @Param("taskId") taskId: string) {
    return this.tasksService.findOneForFirebase(req.firebase, taskId);
  }

  @Patch(":taskId")
  update(
    @Req() req: any,
    @Param("taskId") taskId: string,
    @Body() body: UpdateTaskDto
  ) {
    return this.tasksService.updateForFirebase(req.firebase, taskId, body);
  }

  @Delete(":taskId")
  remove(@Req() req: any, @Param("taskId") taskId: string) {
    return this.tasksService.removeForFirebase(req.firebase, taskId);
  }
}
