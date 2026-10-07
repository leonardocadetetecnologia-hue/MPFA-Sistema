# STATUS — sessão e ponto de parada

Atualizado: 2026-10-07

## Onde paramos

**Convenção MVC documentada e aplicada no módulo `health` (referência).** Não é PROMPT 02.

- PROMPT 01 — Foundation: concluído (em `main`).
- Esta sessão: reestruturou health em camadas presentation / application / domain / infrastructure
  e fixou o mapeamento MVC ↔ monólito modular em `docs/architecture/mvc.md`.
- Próximo passo oficial de produto: **PROMPT 02 — IAM, Organizations, Users, Permissions e Audit**
  em [`PROMPTS.md`](../PROMPTS.md), **somente quando o responsável pedir**.
- Mais “MVC” estrutural não é necessário antes do PROMPT 02 — a convenção já serve de molde.

Repositório: [https://github.com/leonardocadetetecnologia-hue/MPFA-Sistema](https://github.com/leonardocadetetecnologia-hue/MPFA-Sistema)

Branch desta entrega: `cursor/mpfa-mvc-structure-9269` (merge em `main` após revisão).

## O que esta sessão fez

1. Confirmou que ADR-001 / AGENTS.md já definem camadas por módulo — MVC clássico Express foi rejeitado.
2. Mapeou: **C** = `presentation/`, **M** = `domain/` + `application/` (+ `infrastructure/`), **V** = `apps/web`.
3. Reestruturou `apps/api/src/health/` nesse layout (endpoints `/health/live` e `/health/ready` inalterados).
4. Adicionou testes unitários de domain/probe; documentação em `docs/architecture/mvc.md`.
5. Atualizou `modules/README.md`, overview, README da web e este STATUS.

## Decisões que o próximo agente precisa respeitar

- Stack: Next.js + NestJS + Prisma + PostgreSQL + Redis/BullMQ. Sem microserviços.
- MVC = camadas do módulo, **não** pastas globais models/views/controllers.
- Configuração só via `packages/config`. Nada de `process.env` espalhado.
- Prisma: client gerado em `packages/database/src/generated` (gitignore).
- Sem tabelas de negócio ainda. `organization_id` entra no PROMPT 02.
- `FINANCIAL` existe só como perfil reservado; não implementar regra financeira.
- Runtime oficial: Docker Compose. Sem Docker: `npm run local:up` + Redis em `.local/`.

## Como retomar o ambiente local

```bash
cp .env.example .env          # já existe localmente; não commitar
npm ci
npm run build:packages
npm run local:redis           # se o binário Redis portátil ainda não existir
npm run local:up              # terminal dedicado
npm run db:migrate:deploy
npm run start:api             # :3001  /health/ready  /docs
npm run start:worker
npm run start:web             # :3000
```

## Fora de escopo até o pedido correspondente

PROMPT 02+ (IAM, clientes, processos, Webjur, documentos, portal, newsletter, financeiro, deploy VPS).
