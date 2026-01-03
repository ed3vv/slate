import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { getFirebaseAdmin } from "./firebase-admin";

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) throw new UnauthorizedException("Missing token");

    const token = header.slice("Bearer ".length);
    try {
      const decoded = await getFirebaseAdmin().auth().verifyIdToken(token);
      req.firebase = decoded; // attach identity
      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
