# ADR-004 — Preparação multi-organização

Status: accepted
Data: 2026-09-27

## Contexto

O sistema nasce para a MPFA, mas não deve ficar acoplado de forma irreversível a uma única
organização. Não há demanda por SaaS (billing, provisionamento automático).

## Decisão

- Tabela `organizations` (PROMPT 02) é a âncora; entidades de negócio organizacionais têm
  `organization_id uuid NOT NULL` com FK e índices iniciando por `organization_id`.
- O contexto de organização vem da autenticação e é passado **explicitamente** aos casos de uso
  e repositórios; toda consulta de domínio filtra por ele.
- "MPFA" nunca é chave técnica em código, tabela ou regra; o conceito é organização.
- Logs incluem `organization_id` quando disponível (campo previsto no contexto de log).
- Sem billing multi-tenant, painel SaaS ou provisionamento automático.

## Alternativas consideradas

- Banco/schema por tenant — rejeitado: custo operacional sem necessidade atual.
- Row Level Security no PostgreSQL — pode ser adicionado como defesa em profundidade no
  hardening (PROMPT 10); não substitui o filtro na aplicação.

## Consequências

- Testes de isolamento entre organizações são obrigatórios a partir do PROMPT 02.
