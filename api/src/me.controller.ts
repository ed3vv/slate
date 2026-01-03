import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { FirebaseAuthGuard } from "./auth/firebase-auth.guard";
import { PrismaService } from "./prisma/prisma.service";

@Controller("me")
@UseGuards(FirebaseAuthGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getMe(@Req() req: any) {
    const firebaseUid = req.firebase.uid;
    const email = req.firebase.email;

    const user = await this.prisma.user.upsert({
      where: { firebaseUid },
      update: { email: email ?? undefined },
      create: { firebaseUid, email: email ?? null },
      select: { id: true, firebaseUid: true, email: true, createdAt: true },
    });

    return user;
  }
}
