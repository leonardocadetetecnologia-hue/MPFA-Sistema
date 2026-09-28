# STATUS — sessão e ponto de parada

Atualizado: 2026-09-28

## Onde paramos

**PROMPT 01 — Foundation concluído, commitado e enviado ao GitHub.**

Próximo passo oficial: **PROMPT 02 — IAM, Organizations, Users, Permissions e Audit** em [`PROMPTS.md`](../PROMPTS.md). Não implementar PROMPT 02 até o responsável pedir.

Repositório: [https://github.com/leonardocadetetecnologia-hue/MPFA-Sistema](https://github.com/leonardocadetetecnologia-hue/MPFA-Sistema)

Branch: `main`

## O que esta sessão fez

1. Leu governança em `MPFA_Diretrizes_Desenvolvimento/` e copiou para a raiz como `AGENTS.md`, `CLAUDE.md`, `PROMPTS.md` (conteúdo idêntico).
2. Inicializou git próprio em `MPFA-Sistema` (`git init -b main`) e ligou `origin` ao GitHub (remoto estava vazio).
3. Implementou a fundação técnica, sem regras de negócio:
   - monorepo npm workspaces;
   - `packages/config` (zod, fail-fast, sem ecoar secrets);
   - `packages/logger` (pino JSON + redaction);
   - `packages/contracts` (health, erros, filas);
   - `packages/database` (Prisma, migration `20260927000000_foundation` só com `pgcrypto`);
   - `apps/api` NestJS (request/correlation id, filtro de erros, OpenAPI, `/health/live` e `/health/ready`);
   - módulos vazios: iam, organizations, users, audit, system-admin;
   - `apps/worker` BullMQ (`system.ping`, retry, jobId);
   - `apps/web` Next.js (página de status);
   - Docker Compose + Dockerfile multi-stage;
   - runtime local sem Docker (embedded-postgres + Redis portátil em `.local/`);
   - CI GitHub Actions;
   - ADR-001 a ADR-008, runbooks, volumes, secrets.
4. Validou: format, lint, typecheck, unitários, integração, migrate deploy, healthchecks, OpenAPI, `system.ping`, screenshots da web (operacional / degradado / API indisponível).
5. Commitou 10 unidades lógicas (sem `.env`, sem `.local/`, sem pasta duplicada de diretrizes).
6. Push para `origin/main`.

## Commits da foundation

```text
docs: add project governance (AGENTS, CLAUDE, PROMPTS)
chore: bootstrap npm workspaces monorepo with TypeScript, lint and format
feat(config,logger): add validated env config and structured logging
feat(database): add Prisma setup and initial foundation migration
feat(api): add NestJS foundation with request ids, error filter, OpenAPI and healthchecks
feat(worker): add BullMQ worker skeleton with retry and graceful shutdown
feat(web): add Next.js shell with API status page
chore(infra): add Dockerfiles, compose, local runtime and backup scripts
ci: add GitHub Actions pipeline
docs: add architecture overview, runbooks and ADR-001..008
```

## Decisões que o próximo agente precisa respeitar

- Stack: Next.js + NestJS + Prisma + PostgreSQL + Redis/BullMQ. Sem microserviços.
- Configuração só via `packages/config`. Nada de `process.env` espalhado.
- Prisma: client gerado em `packages/database/src/generated` (gitignore). No Windows, generate em `node_modules/.prisma` pode falhar com EPERM.
- Sem tabelas de negócio ainda. `organization_id` entra no PROMPT 02.
- `FINANCIAL` existe só como perfil reservado; não implementar regra financeira.
- Runtime oficial: Docker Compose. Nesta máquina de dev não há Docker/WSL; usar `npm run local:up` + Redis em `.local/redis`.
- Pasta `MPFA_Diretrizes_Desenvolvimento/` e o `.zip` ficaram de fora do Git de propósito (duplicata da raiz).
- Git pai em `E:/Cadete.tecnologia` é outro repositório; o do MPFA é este diretório.

## Como retomar o ambiente local

```bash
cp .env.example .env          # já existe localmente; não commitar
npm ci
npm run build:packages
npm run local:redis           # só se .local/redis/redis-server.exe não existir
npm run local:up              # terminal dedicado
npm run db:migrate:deploy
npm run start:api             # :3001  /health/ready  /docs
npm run start:worker
npm run start:web             # :3000
```

Portas 3000/3001 podem já estar ocupadas por uma sessão anterior. Nesse caso a API/web atuais respondem; não subir de novo até liberar a porta.

## Pendências conhecidas (não bloqueiam PROMPT 02)

- Docker Desktop não instalado nesta máquina: imagens e `docker compose up` não foram validados localmente (CI no Ubuntu cobre).
- `npm run build -w @mpfa/web` falhou com EBUSY enquanto um Next.js já prendia `apps/web/.next`. Typecheck da web passou; a UI foi validada na instância em execução.
- Round-trip `backup.sh`/`restore.sh` não rodou no Windows (sem `pg_dump` no PATH); o workflow de CI executa isso no Linux.
- Jest de integração usa `forceExit` por handles abertos (ioredis/Nest). Comportamento dos testes está verde.

## Fora de escopo até o pedido correspondente

PROMPT 02+ (IAM, clientes, processos, Webjur, documentos, portal, newsletter, financeiro, deploy VPS).
