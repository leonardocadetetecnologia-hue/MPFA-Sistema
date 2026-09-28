# Plataforma MPFA

Monólito modular em TypeScript: `apps/web` (Next.js), `apps/api` (NestJS), `apps/worker` (BullMQ),
PostgreSQL + Prisma e Redis. Regras permanentes do projeto: [`AGENTS.md`](AGENTS.md) /
[`CLAUDE.md`](CLAUDE.md). Sequência de construção: [`PROMPTS.md`](PROMPTS.md).

Estado atual: **PROMPT 01 — Foundation** (sem funcionalidades de negócio).

## Estrutura

```text
apps/
  api/        NestJS — config, logs, request/correlation id, erros, OpenAPI, healthchecks
  worker/     BullMQ — fila `system`, retry/backoff, idempotência por jobId, shutdown gracioso
  web/        Next.js — página de status da plataforma
packages/
  config/     schema zod das variáveis de ambiente (único ponto de leitura de env)
  logger/     pino com JSON estruturado e redaction de segredos
  contracts/  tipos públicos compartilhados (sem ORM)
  database/   schema Prisma, migrations, client
infrastructure/
  docker/     Dockerfile multi-stage (targets api | worker | web | migrate)
  scripts/    runtime local sem Docker, backup e restore
docs/         arquitetura, ADRs, banco, segurança, runbooks
```

## Rodando

Pré-requisito: Node 24 (mínimo 22) e npm.

```bash
cp .env.example .env          # preencher; nunca versionar
npm ci
npm run build
```

**Com Docker (caminho oficial):** `docker compose up -d --build` — sobe postgres, redis,
migrate (one-off), api, worker e web. Ver [ADR-007](docs/adr/ADR-007-docker-vps-deployment.md).

**Sem Docker (dev local):** ver [docs/runbooks/local-dev.md](docs/runbooks/local-dev.md).

```bash
npm run local:up              # PostgreSQL portátil + Redis portátil (terminal dedicado)
npm run db:migrate:deploy
npm run start:api             # http://localhost:3001/health/ready  ·  /docs  ·  /openapi.json
npm run start:worker
npm run start:web             # http://localhost:3000
```

## Qualidade

| Comando                    | O que faz                                          |
| -------------------------- | -------------------------------------------------- |
| `npm run format:check`     | Prettier                                           |
| `npm run lint`             | ESLint (typescript-eslint)                         |
| `npm run typecheck`        | `tsc --noEmit` em todos os workspaces              |
| `npm test`                 | testes unitários (Jest)                            |
| `npm run test:integration` | integração com PostgreSQL e Redis reais (não-prod) |
| `npm run build`            | build de packages e apps                           |

CI: [.github/workflows/ci.yml](.github/workflows/ci.yml) executa tudo acima, migrations em banco
limpo, round-trip de backup/restore e build das imagens Docker.
