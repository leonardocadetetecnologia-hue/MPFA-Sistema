# ADR-001 — Monólito modular em monorepo TypeScript

Status: accepted
Data: 2026-09-27

## Contexto

A plataforma nasce para uma organização (MPFA), com equipe pequena, domínio ainda em descoberta
(financeiro pendente) e necessidade de auditoria e portabilidade entre VPS. Microserviços
trariam custo operacional (deploy, rede, observabilidade distribuída) sem ganho de escala real.

## Decisão

- Um monorepo com npm workspaces: `apps/web` (Next.js), `apps/api` (NestJS), `apps/worker`
  (BullMQ) e `packages/*` (config, logger, contracts, database).
- Backend organizado por **módulo de domínio** (`apps/api/src/modules/<modulo>`), com camadas
  domain / application / infrastructure / presentation criadas só quando têm responsabilidade.
- Worker é processo separado do mesmo código-base, para isolar tarefas lentas/reprocessáveis.
- npm workspaces (sem Turborepo/Nx): o build ordenado por script é suficiente no tamanho atual.

## Alternativas consideradas

- Microserviços desde o início — rejeitado (complexidade prematura).
- Monólito sem módulos — rejeitado (acoplamento cresce com os 18 domínios previstos).
- pnpm + Turborepo — adiado; reavaliar se o tempo de CI/build virar gargalo.

## Consequências

- Extração futura de um módulo é possível porque as fronteiras são explícitas.
- Fronteiras dependem de disciplina (revisão + regras do AGENTS.md), não de rede.
