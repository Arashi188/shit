import type { PrismaClient } from "../generated/prisma/client.js";
import type { AuthRepository, AuthUser } from "../domain/auth.js";

const userSelect = {
  id: true,
  email: true,
  displayName: true,
  roleAssignments: {
    select: {
      role: {
        select: {
          code: true,
          grants: {
            select: {
              permission: { select: { code: true } },
            },
          },
        },
      },
    },
  },
} as const;
function dto(record: any): AuthUser {
  const roles = record.roleAssignments.map((entry: any) => entry.role.code);
  const permissions: string[] = [...new Set<string>(record.roleAssignments.flatMap((entry: any) => entry.role.grants.map((grant: any) => grant.permission.code as string)))];
  return { id: record.id, email: record.email, displayName: record.displayName, roles, permissions };
}
export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async createUser(input: { email: string; displayName: string; passwordHash: string; customerRoleCode: string }) {
    const record = await this.prisma.user.create({ data: { email: input.email, displayName: input.displayName, passwordHash: input.passwordHash, roleAssignments: { create: { role: { connect: { code: input.customerRoleCode } } } } }, select: userSelect });
    return dto(record);
  }
  async findUserByEmail(email: string) {
    const record = await this.prisma.user.findFirst({ where: { email, deletedAt: null }, select: { ...userSelect, passwordHash: true, emailVerifiedAt: true } });
    return record ? { ...dto(record), passwordHash: record.passwordHash, emailVerifiedAt: record.emailVerifiedAt } : null;
  }
  async createSession(userId: string, tokenHash: string, expiresAt: Date) { await this.prisma.session.create({ data: { userId, tokenHash, expiresAt } }); }
  async findSession(tokenHash: string) {
    const row = await this.prisma.session.findUnique({ where: { tokenHash }, include: { user: { select: { ...userSelect, deletedAt: true } } } });
    if (!row || row.user.deletedAt) return null;
    return { user: dto(row.user), expiresAt: row.expiresAt };
  }
  async deleteSession(tokenHash: string) { await this.prisma.session.deleteMany({ where: { tokenHash } }); }
  async createPasswordReset(email: string, tokenHash: string, expiresAt: Date) {
    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null }, select: { id: true } });
    if (!user) return false;
    await this.prisma.passwordReset.deleteMany({ where: { userId: user.id } });
    await this.prisma.passwordReset.create({ data: { userId: user.id, tokenHash, expiresAt } });
    return true;
  }
  async consumePasswordReset(tokenHash: string, newPasswordHash: string) {
    return this.prisma.$transaction(async (tx) => {
      const reset = await tx.passwordReset.findUnique({ where: { tokenHash } });
      if (!reset || reset.expiresAt <= new Date()) return false;
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash: newPasswordHash } });
      await tx.passwordReset.deleteMany({ where: { userId: reset.userId } });
      await tx.session.deleteMany({ where: { userId: reset.userId } });
      return true;
    });
  }
  async createEmailVerification(email: string, tokenHash: string, expiresAt: Date) {
    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null, emailVerifiedAt: null }, select: { id: true } });
    if (!user) return false;
    await this.prisma.emailVerification.deleteMany({ where: { userId: user.id } });
    await this.prisma.emailVerification.create({ data: { userId: user.id, tokenHash, expiresAt } });
    return true;
  }
  async consumeEmailVerification(tokenHash: string) {
    return this.prisma.$transaction(async (tx) => {
      const verification = await tx.emailVerification.findUnique({ where: { tokenHash } });
      if (!verification || verification.expiresAt <= new Date()) return false;
      await tx.user.update({ where: { id: verification.userId }, data: { emailVerifiedAt: new Date() } });
      await tx.emailVerification.deleteMany({ where: { userId: verification.userId } });
      return true;
    });
  }
}
