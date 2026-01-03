import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Priority } from "@prisma/client";
import { CreateTaskDto } from "./dto/create-task.dto";


@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateUser(firebaseUid: string, email?: string) {
    return this.prisma.user.upsert({
        where: { firebaseUid },
        update: { email: email ?? undefined },
        create: { firebaseUid, email: email ?? null },
    });
    }
    async createForFirebase(
      firebase: any,
      body: { title: string; subjectId: string; priority?: Priority; done?: boolean; dueDate?: string; pinned?: boolean }
    ) {
        const user = await this.getOrCreateUser(firebase.uid, firebase.email);
        return this.create(user.id, body);
    }

    async findOneForFirebase(firebase: any, taskId: string) {
        const user = await this.getOrCreateUser(firebase.uid, firebase.email);
        return this.findOne(user.id, taskId);
    }
    async findAllForFirebase(firebase: any) {
    const user = await this.getOrCreateUser(firebase.uid, firebase.email);
    return this.findAll(user.id);
    }

    async updateForFirebase(firebase: any, taskId: string, body: { title?: string; priority?: Priority; done?: boolean; dueDate?: string; pinned?: boolean }) {
        const user = await this.getOrCreateUser(firebase.uid, firebase.email);
        return this.update(user.id, taskId, body);
    }

    async removeForFirebase(firebase: any, taskId: string) {
        const user = await this.getOrCreateUser(firebase.uid, firebase.email);
        return this.remove(user.id, taskId);
    }
    async create(
        userId: string,
        body: CreateTaskDto,
    ) {

        await this.prisma.subject.findFirstOrThrow({
          where: { id: body.subjectId, userId },
        });
        return this.prisma.task.create({
        data: {
            userId,
            subjectId: body.subjectId,
            title: body.title,
            priority: body.priority ?? Priority.MEDIUM,
            done: body.done ?? false,
            ...(body.dueDate ? { dueDate: new Date(body.dueDate) } : {}),
            pinned: body.pinned ?? false,
        },
        });
  }

  async findAll(userId: string) {
    return this.prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) throw new NotFoundException("Task not found");
    return task;
  }

    async update(
    userId: string,
    taskId: string,
    body: { title?: string; priority?: Priority; done?: boolean; dueDate?: string; pinned?: boolean },
  ) {
    // ensures 404 instead of Prisma throwing
    await this.findOne(userId, taskId);

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.done !== undefined ? { done: body.done } : {}),
        ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}),
        ...(body.pinned !== undefined ? { pinned: body.pinned } : {}),
      },
    });
  }

  async remove(userId: string, taskId: string) {
    await this.findOne(userId, taskId);

    await this.prisma.task.delete({
      where: { id: taskId },
    });

    return { deleted: true };
  }
}
