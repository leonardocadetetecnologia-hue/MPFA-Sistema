# ADR-009 — MVP = Ficha-Tempo Assistida sobre a foundation

Status: accepted (proposto para confirmação do responsável)  
Data: 2026-10-07

## Contexto

Existem duas especificações:

1. **Plataforma MPFA** (`PROMPTS.md`): monólito modular com IAM multi-org, clientes, Webjur, portal, etc.
2. **Ficha-Tempo Assistida** (`docs/product/mpfa-requisitos-mvc-vibe-coding.md`): MVP operacional antes do ADVWIN+, com 3 perfis e fluxo captura → revisão → lançamento manual.

A foundation (PROMPT 01) já está no repositório (Nest + Next + Prisma + Redis + Docker).

## Decisão

1. O **primeiro produto entregável** é o MVP Ficha-Tempo Assistida.
2. A foundation e o monólito Nest **permanecem**; não migrar para Supabase-only nem Server Actions como único backend.
3. MVC segue `docs/architecture/mvc.md` (View=Next; Controller/Services/Domain=Nest).
4. Roles do MVP: Operacional, Revisor, Administrador — mapeáveis a permissões granulares; `organization_id` no schema desde a Fase 1.
5. ADVWIN só via `AdvwinAdapter` / `ManualAdvwinAdapter` até discovery.
6. `PROMPTS.md` fases 03+ continuam roadmap; o MVP Ficha-Tempo **substitui a ordem imediata** após foundation (em vez de IAM genérico completo + todos os perfis da plataforma de uma vez).
7. Documentação de continuidade (`Prompt-Documentacao-Sistema.md`) só após piloto/produção.

## Consequências

- Próximo desenvolvimento = Fase 1 do plano (`docs/product/PLANO-DESENVOLVIMENTO.md`).
- Evita dualidade de repos e reescrita.
- Reduz risco de construir portal/Webjur antes de ter valor operacional diário.
