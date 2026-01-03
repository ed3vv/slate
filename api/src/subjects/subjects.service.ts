import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSubjectDto } from "./dto/create-subject.dto";
import { UpdateSubjectDto } from "./dto/update-subject.dto";

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateUser(firebaseUid: string, email?: string) {
    return this.prisma.user.upsert({
      where: { firebaseUid },
      update: { email: email ?? undefined },
      create: { firebaseUid, email: email ?? null },
    });
  }

  async listForFirebase(firebase: any) {
    const user = await this.getOrCreateUser(firebase.uid, firebase.email);
    return this.prisma.subject.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: { tasks: { orderBy: { createdAt: "desc" } } },
    });
  }

  async createForFirebase(firebase: any, dto: CreateSubjectDto) {
    const user = await this.getOrCreateUser(firebase.uid, firebase.email);
    return this.prisma.subject.create({
      data: { userId: user.id, name: dto.name, color: dto.color ?? null },
    });
  }

  async deleteForFirebase(firebase: any, subjectId: string) {
    const user = await this.getOrCreateUser(firebase.uid, firebase.email);
    // ensure ownership
    await this.prisma.subject.findFirstOrThrow({ where: { id: subjectId, userId: user.id } });
    await this.prisma.subject.delete({ where: { id: subjectId } });
    return { deleted: true };
  }

  async updateForFirebase(firebase: any, subjectId: string, dto: UpdateSubjectDto) {
    const user = await this.getOrCreateUser(firebase.uid, firebase.email);
    // ensure ownership
    await this.prisma.subject.findFirstOrThrow({ where: { id: subjectId, userId: user.id } });

    return this.prisma.subject.update({
      where: { id: subjectId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.expanded !== undefined ? { expanded: dto.expanded } : {}),
      },
      include: { tasks: { orderBy: { createdAt: "desc" } } },
    });
  }
}
