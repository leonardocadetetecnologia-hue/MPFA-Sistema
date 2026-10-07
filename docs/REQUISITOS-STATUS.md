# Requisitos MPFA — avançado vs a ajustar (fonte)

Atualizado: 2026-10-07  
Base: código em `/workspace`, `PROMPTS.md`, ADRs, `docs/STATUS.md`.

Legenda: **OK** implementado · **PARCIAL** scaffold/docs · **PENDENTE** não existe · **AJUSTAR** desvio face ao alvo

---

## 1. Visão do produto (alvo)

Plataforma jurídica multi-organização: IAM, clientes/processos, agenda/horas, Webjur, documentos M365, portal do cliente, newsletter/IA, financeiro (discovery), deploy VPS.

Arquitetura: monólito modular TypeScript (Next.js + NestJS + Prisma/PostgreSQL + Redis/BullMQ).

---

## 2. PROMPT 01 — Foundation

| Requisito | Estado | Evidência no fonte |
| --------- | ------ | ------------------ |
| Monorepo TypeScript (`apps/*`, `packages/*`) | **OK** | `package.json` workspaces |
| `apps/api` NestJS | **OK** | `apps/api` |
| `apps/web` Next.js | **OK** | `apps/web` (página de status) |
| `apps/worker` BullMQ | **OK** | fila `system`, job `system.ping` |
| PostgreSQL + Prisma | **OK** | `packages/database` + migrations |
| Redis | **OK** | health + worker |
| Config centralizada + validação no startup | **OK** | `packages/config` (Zod) |
| Ambientes local / staging / production | **OK** | schema de env |
| Healthchecks API + DB + Redis | **OK** | `/health/live`, `/health/ready` |
| Logging estruturado + request/correlation id | **OK** | `@mpfa/logger`, middleware |
| Tratamento centralizado de erros | **OK** | `DomainError` + filter |
| OpenAPI inicial | **OK** | `/docs`, `/openapi.json` |
| Testes unitários + integração | **OK** | Jest nos workspaces |
| CI lint/typecheck/test/build | **OK** | `.github/workflows/ci.yml` |
| Docker Compose + Dockerfile multi-stage | **OK** | `docker-compose.yml`, `infrastructure/docker` |
| Backup/restore + volumes documentados | **OK** | scripts + runbooks |
| `.env.example` sem secrets | **OK** | raiz |
| ADRs 001–008 | **OK** | `docs/adr/` |
| Módulos vazios: iam, organizations, users, audit, system-admin | **PARCIAL** | só `*.module.ts` vazios |
| Packages `ui`, `validation`, `testing` | **PENDENTE** | previstos em PROMPTS; não criados (aceitável na Foundation) |
| Tabelas de negócio no Prisma | **PENDENTE** | schema sem models; só infra `pgcrypto` |
| Rotas de negócio em `/api/v1` | **PENDENTE** | prefixo preparado; zero endpoints de domínio |

**Veredito Foundation:** concluída e utilizável localmente. Domínio de negócio ainda não começa.

---

## 3. Convenção MVC (pós-Foundation, não é PROMPT 02)

| Requisito | Estado | Notas |
| --------- | ------ | ----- |
| Mapear MVC sem pastas globais Express | **OK** | C=`presentation/`, M=`domain/`+`application/`(+`infrastructure/`), V=`apps/web` |
| Documentar convenção | **OK** | `docs/architecture/mvc.md` |
| Aplicar em módulo de referência | **OK** | `apps/api/src/health/` |
| Aplicar nos módulos de negócio | **PENDENTE** | módulos ainda vazios — molde pronto para PROMPT 02+ |

**AJUSTAR:** branch `cursor/mpfa-mvc-structure-9269` ainda não mergeada em `main` (main fica em Foundation pura até merge).

---

## 4. PROMPT 02 — IAM / Orgs / Users / Permissions / Audit

| Requisito | Estado |
| --------- | ------ |
| Organizações | **PENDENTE** |
| Usuários | **PENDENTE** |
| Autenticação + sessões/tokens | **PENDENTE** (ADR-003 ainda *proposed*) |
| Roles base: SUPER_ADMIN, MPFA_MANAGER, LAWYER, CLIENT, FINANCIAL | **PENDENTE** (FINANCIAL só reservado) |
| Permissions granulares (role → permission → scope) | **PENDENTE** |
| Vínculo usuário ↔ organização + escopo | **PENDENTE** |
| Desativação / alteração de acesso | **PENDENTE** |
| Auditoria (actor, org, ação, before/after, IP, UA, correlation id) | **PENDENTE** |
| Testes: auth, permissão, isolamento multi-org, manager≠super admin, audit | **PENDENTE** |
| UI login / gestão de acessos | **PENDENTE** |

**AJUSTAR antes/durante PROMPT 02:** fechar ADR-003 (sessão Redis vs JWT vs Entra ID). Sem essa decisão, implementação de auth fica ambígua.

---

## 5. PROMPTS 03–13 (roadmap — todos PENDENTE)

| Fase | Escopo |
| ---- | ------ |
| 03 | Clientes e processos (matters) |
| 04 | Agenda, tarefas, horas |
| 05 | Webjur |
| 06 | Documentos / Microsoft 365 |
| 07 | Relatórios |
| 08 | Portal do cliente |
| 09 | Newsletter / IA |
| 10 | Hardening |
| 11 | Deploy VPS Cadete |
| 12 | Migração VPS MPFA |
| 13 | Financeiro (discovery) |

Nenhum destes tem código de domínio no repositório hoje.

---

## 6. O que já avança vs o que ajustar agora

### Já avançado (usar como base)

1. Stack e monorepo operacionais.
2. Observabilidade mínima (logs, health, erros, correlation).
3. Contratos partilhados (`@mpfa/contracts`) e config única.
4. Pipeline CI e caminho local (`local:up` / Docker).
5. Convenção de camadas MVC no `health` + docs.
6. Governança: AGENTS / CLAUDE / PROMPTS / ADRs.

### Ajustar / decidir

1. **Merge** da branch MVC em `main` (ou reaplicar) para o molde valer no trunk.
2. **ADR-003** — escolher mecanismo de autenticação antes de codar PROMPT 02.
3. **Packages opcionais** (`ui`, `validation`, `testing`) — criar só quando o PROMPT correspondente precisar (evitar overengineering).
4. **Prisma** — primeiras tabelas só com PROMPT 02 (`organization_id` nas entidades organizacionais).
5. **Web** — hoje só status; UI de produto começa com IAM/portal nos prompts oficiais.
6. **Não implementar financeiro** apesar do perfil `FINANCIAL` reservado.

---

## 7. Próximo passo recomendado

**PROMPT 02** — identidade e governança (orgs, users, auth, RBAC+escopo, audit), usando o layout MVC do `health` como molde nos módulos `iam` / `organizations` / `users` / `audit`.

Só avançar quando o responsável pedir explicitamente.
