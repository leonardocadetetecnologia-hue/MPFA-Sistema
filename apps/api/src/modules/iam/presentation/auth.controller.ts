import { Body, Controller, Get, Inject, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { ApiConfig } from '@mpfa/config';
import type { Response } from 'express';
import { z } from 'zod';
import { API_CONFIG } from '../../../config/config.module';
import { ValidationError } from '../../../common/errors/domain-error';
import { AuthService } from '../application/auth.service';
import type { AppRole } from '../domain/access';
import { assertCan } from '../domain/access';
import { SessionGuard, sessionCookie, type RequestWithActor } from './session.guard';

const loginSchema = z.object({
  email: z.string().min(3),
  password: z.string().min(1),
});

const recoverySchema = z.object({ email: z.string().min(3) });
const confirmSchema = z.object({ token: z.string().min(10), password: z.string().min(10) });
const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(3),
  password: z.string().min(10),
  role: z.enum(['ADMINISTRATIVE', 'LAWYER', 'MANAGER', 'CLIENT']),
  client_id: z.string().uuid().nullable().optional(),
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(API_CONFIG) private readonly config: ApiConfig,
  ) {}

  @Post('login')
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const input = parse(loginSchema, body);
    const result = await this.auth.login(input.email, input.password);
    res.setHeader('set-cookie', sessionCookie(result.sessionId, this.config.SESSION_TTL_SECONDS));
    return { user: result.actor, session_id: result.sessionId };
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  async logout(@Req() req: RequestWithActor, @Res({ passthrough: true }) res: Response) {
    const cookie = req.header('cookie') ?? '';
    const sessionId = cookie.split(`${'mpfa_session'}=`)[1]?.split(';')[0];
    if (sessionId) await this.auth.logout(decodeURIComponent(sessionId), req.actor ?? null);
    res.setHeader('set-cookie', sessionCookie('', 0));
    return { ok: true };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@Req() req: RequestWithActor) {
    if (!req.actor) return { user: null };
    return { user: req.actor };
  }

  @Post('recovery')
  recover(@Body() body: unknown) {
    const input = parse(recoverySchema, body);
    return this.auth.requestRecovery(input.email, this.config.APP_ENV === 'local');
  }

  @Post('recovery/confirm')
  confirm(@Body() body: unknown) {
    const input = parse(confirmSchema, body);
    return this.auth.confirmRecovery(input.token, input.password).then(() => ({ ok: true }));
  }

  @Post('users')
  @UseGuards(SessionGuard)
  createUser(@Req() req: RequestWithActor, @Body() body: unknown) {
    if (!req.actor) throw new ValidationError('AUTH_REQUIRED', 'Autenticação necessária.');
    assertCan(req.actor, 'user.manage');
    const input = parse(createUserSchema, body);
    return this.auth.createUser(req.actor, {
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role as AppRole,
      clientId: input.client_id,
    });
  }

  @Post('users/:id/disable')
  @UseGuards(SessionGuard)
  disableUser(@Req() req: RequestWithActor, @Param('id') id: string) {
    if (!req.actor) throw new ValidationError('AUTH_REQUIRED', 'Autenticação necessária.');
    const parsed = z.string().uuid().safeParse(id);
    if (!parsed.success) throw new ValidationError('INVALID_ID', 'Identificador inválido.');
    return this.auth.disableUser(req.actor, parsed.data).then(() => ({ ok: true }));
  }
}

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(
      'INVALID_BODY',
      'Corpo da requisição inválido.',
      result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }
  return result.data;
}
