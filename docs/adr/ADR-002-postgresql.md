# ADR-002 — PostgreSQL com Prisma

Status: accepted
Data: 2026-09-27

## Contexto

Dados operacionais e jurídicos exigem integridade relacional, transações, constraints e
auditoria. A equipe usa TypeScript de ponta a ponta.

## Decisão

- PostgreSQL 17 como banco único da aplicação (imagem `postgres:17-alpine`).
- Prisma 6 (`prisma-client-js`) como ORM e ferramenta de migration, em `packages/database`.
- A URL de conexão é injetada a partir da config validada (`PrismaService`), não lida
  implicitamente pelo Prisma em runtime.
- UUID como chave pública/primária (`pgcrypto` / `gen_random_uuid()`).

## Alternativas consideradas

- Prisma 7/8 — versões recentes exigem driver adapters e mudaram a geração do client; adiado
  até estabilizar. Upgrade será uma unidade de trabalho própria.
- Drizzle / TypeORM — viáveis; Prisma escolhido pela stack de referência do AGENTS.md e
  maturidade das migrations.
- MySQL — sem vantagem para o caso; PostgreSQL tem melhor suporte a JSONB, constraints e RLS.

## Consequências

- Queries complexas de dashboard podem usar `$queryRaw` tipado, mantendo-se na camada de infra.
- Model Prisma nunca é contrato público.
