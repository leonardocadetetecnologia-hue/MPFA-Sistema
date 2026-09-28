# ADR-008 — Migrations de banco

Status: accepted
Data: 2026-09-27

## Contexto

Schema precisa evoluir sem perda de dados, de forma reprodutível entre local, staging e
produção, e testável em banco limpo.

## Decisão

- Migrations versionadas do Prisma em `packages/database/prisma/migrations`, sempre commitadas.
- `migrate dev` apenas em local; `migrate deploy` em CI, staging e produção (serviço `migrate`).
- `prisma db push` proibido fora de banco descartável.
- CI aplica todas as migrations em banco limpo a cada push/PR.
- Migration destrutiva (drop/rename/alteração de tipo) exige: plano expand → migrate → contract,
  backup prévio, rollback documentado e aprovação explícita.
- Cada migration documenta seu rollback (comentário SQL ou `docs/database/`).
- Primeira migration `20260927000000_foundation`: apenas `CREATE EXTENSION pgcrypto`.

## Alternativas consideradas

- Migrations manuais em SQL puro (Flyway/dbmate) — viáveis, mas duplicariam o schema do Prisma.

## Consequências

- Rollback de schema é "forward fix" por padrão; restauração de backup é o último recurso.
