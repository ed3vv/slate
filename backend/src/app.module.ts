import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { TasksModule } from "./tasks/tasks.module";
import { MeController } from "./me.controller";
import { SubjectsModule } from "./subjects/subjects.module"



@Module({
  imports: [PrismaModule, TasksModule, SubjectsModule],
  controllers: [AppController, MeController],
  providers: [AppService],
})
export class AppModule {}
