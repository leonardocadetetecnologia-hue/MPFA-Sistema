import { randomBytes, randomUUID } from 'node:crypto';
import type { PrismaClient } from '@mpfa/database';
import type Redis from 'ioredis';
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../../common/errors/domain-error';
import {
  assertCan,
  hashPassword,
  hashToken,
  verifyPassword,
  type Actor,
  type AppRole,
} from '../domain/access';

const SESSION_PREFIX = 'session:';

export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    private readonly ttlSeconds: number,
  ) {}

  async login(email: string, password: string): Promise<{ sessionId: string; actor: Actor }> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('USER_DISABLED', 'Usuário desativado.');
    }
    const actor = this.toActor(user);
    const sessionId = randomUUID();
    await this.redis.set(SESSION_PREFIX + sessionId, JSON.stringify(actor), 'EX', this.ttlSeconds);
    await this.prisma.auditEvent.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: 'LOGIN',
        resourceType: 'user',
        resourceId: actor.userId,
      },
    });
    return { sessionId, actor };
  }

  async logout(sessionId: string, actor: Actor | null): Promise<void> {
    await this.redis.del(SESSION_PREFIX + sessionId);
    if (actor) {
      await this.prisma.auditEvent.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: 'LOGOUT',
          resourceType: 'user',
          resourceId: actor.userId,
        },
      });
    }
  }

  async actorFromSession(sessionId: string): Promise<Actor> {
    const raw = await this.redis.get(SESSION_PREFIX + sessionId);
    if (!raw) throw new UnauthorizedError('SESSION_EXPIRED', 'Sessão expirada.');
    const stored = JSON.parse(raw) as Actor;
    const user = await this.prisma.user.findFirst({
      where: { id: stored.userId, deletedAt: null },
    });
    if (!user || user.status !== 'ACTIVE') {
      await this.redis.del(SESSION_PREFIX + sessionId);
      throw new UnauthorizedError('USER_DISABLED', 'Usuário desativado.');
    }
    return this.toActor(user);
  }

  async requestRecovery(
    email: string,
    exposeToken: boolean,
  ): Promise<{ delivered: false; reason: string; dev_token?: string }> {
    const normalized = email.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalized, deletedAt: null, status: 'ACTIVE' },
    });
    let devToken: string | undefined;
    if (user) {
      const token = randomBytes(32).toString('base64url');
      await this.prisma.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      await this.prisma.mailIntent.create({
        data: {
          organizationId: user.organizationId,
          toAddress: normalized,
          purpose: 'password_recovery',
          delivered: false,
          reason: 'mail_provider_not_connected',
        },
      });
      if (exposeToken) devToken = token;
    }
    return {
      delivered: false,
      reason: 'mail_provider_not_connected',
      ...(devToken ? { dev_token: devToken } : {}),
    };
  }

  async confirmRecovery(token: string, password: string): Promise<void> {
    if (password.length < 10) {
      throw new ValidationError('WEAK_PASSWORD', 'A senha precisa ter ao menos 10 caracteres.');
    }
    const reset = await this.prisma.passwordReset.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!reset || reset.usedAt || reset.expiresAt.getTime() < Date.now()) {
      throw new ValidationError('INVALID_RESET', 'Token de recuperação inválido ou expirado.');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash: await hashPassword(password) },
      }),
      this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  async createUser(
    actor: Actor,
    input: {
      name: string;
      email: string;
      password: string;
      role: AppRole;
      clientId?: string | null;
    },
  ): Promise<{ id: string }> {
    assertCan(actor, 'user.manage');
    if (input.role === 'CLIENT' && !input.clientId) {
      throw new ValidationError('CLIENT_REQUIRED', 'Usuário externo precisa de um cliente.');
    }
    const created = await this.prisma.user.create({
      data: {
        organizationId: actor.organizationId,
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: await hashPassword(input.password),
        role: input.role,
        clientId: input.clientId ?? null,
      },
    });
    await this.prisma.auditEvent.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: 'USER_ACCESS_CHANGED',
        resourceType: 'user',
        resourceId: created.id,
        afterData: { role: input.role, email: created.email },
      },
    });
    return { id: created.id };
  }

  async disableUser(actor: Actor, userId: string): Promise<void> {
    assertCan(actor, 'user.manage');
    if (actor.userId === userId) {
      throw new ValidationError('SELF_DISABLE', 'A própria conta não pode ser desativada por esta ação.');
    }
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: actor.organizationId, deletedAt: null },
    });
    if (!user) throw new NotFoundError('NOT_FOUND', 'Usuário não encontrado.');
    if (user.status === 'DISABLED') return;
    await this.prisma.user.update({
      where: { id: user.id },
      data: { status: 'DISABLED' },
    });
    await this.prisma.auditEvent.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: 'USER_DISABLED',
        resourceType: 'user',
        resourceId: user.id,
        beforeData: { status: user.status },
        afterData: { status: 'DISABLED' },
      },
    });
  }

  private toActor(user: {
    id: string;
    organizationId: string;
    role: AppRole;
    clientId: string | null;
    email: string;
    status: 'ACTIVE' | 'DISABLED';
  }): Actor {
    return {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      clientId: user.clientId,
      email: user.email,
      status: user.status,
    };
  }
}
