# Convenções de banco de dados

- Schema: `packages/database/prisma/schema.prisma`. Mudanças **somente** por migration versionada.
  - Dev: `npm run db:migrate:dev` (gera a migration). Staging/produção: `npm run db:migrate:deploy`.
  - `prisma db push` é proibido fora de banco local descartável.
- Chave primária: UUID gerado pelo banco (`@default(dbgenerated("gen_random_uuid()")) @db.Uuid`);
  a extensão `pgcrypto` é habilitada na migration `20260927000000_foundation`.
- Nomes físicos em `snake_case` (`@@map`/`@map`); modelos Prisma em PascalCase.
- Entidade organizacional: coluna `organization_id uuid NOT NULL` com FK para `organizations`
  (tabela criada no PROMPT 02) e índice composto começando por `organization_id` nas consultas reais.
- Histórico relevante: `archived_at` / `deleted_at` ou estado explícito; sem exclusão física por padrão.
- Timestamps: `created_at`, `updated_at` em `timestamptz`.
- Constraints de banco para invariantes estruturais (NOT NULL, FK, unique, check).
- Toda migration documenta rollback no próprio SQL (comentário) ou em `docs/database/`.
- Model Prisma nunca é contrato público: mapear para tipos de `@mpfa/contracts`.
