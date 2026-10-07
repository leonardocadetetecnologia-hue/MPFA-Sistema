# MVC nesta stack (NestJS + Next.js)

Status: accepted as convention  
Data: 2026-10-07

## Por que não um MVC clássico Express

A plataforma já é um **monólito modular** (ADR-001): NestJS na API, Next.js na web,
Prisma/PostgreSQL, Redis/BullMQ. Trocar isso por pastas globais `models/` / `views/` /
`controllers/` (estilo Express + EJS) quebraria ADRs, OpenAPI, módulos de domínio e a
separação web/api.

Aqui **MVC é o mapeamento mental** sobre as camadas que o `AGENTS.md` §3.1 já exige.

## Mapeamento

| MVC clássico | Nesta plataforma | Onde |
| ------------ | ---------------- | ---- |
| **Controller (C)** | Presentation | `apps/api/src/modules/<domínio>/presentation/` (ou equivalente em módulos de fundação) — HTTP, status code, OpenAPI, validação superficial Zod |
| **Model (M)** | Domain + Application (+ Infrastructure de persistência/adapters) | `domain/` (entidades, invariantes, erros), `application/` (casos de uso), `infrastructure/` (Prisma, Redis, fornecedores) |
| **View (V)** | Next.js | `apps/web` — UI e leitura server-side da API; **sem regra de negócio crítica** |

Fluxo típico:

```text
Browser → apps/web (View)
            ↓ API_INTERNAL_URL (server-side)
          Controller (presentation)
            ↓
          Application (use-case / service)
            ↓
          Domain + Infrastructure ports
```

## Regras

1. Controller não contém regra de negócio (só orquestra HTTP → application).
2. Não retornar model Prisma como contrato público — mapear para `@mpfa/contracts`.
3. View não fala com banco; chama a API.
4. Crie pastas de camada **só quando houver responsabilidade real** (sem pass-through vazio).
5. Módulos de negócio ficam em `apps/api/src/modules/<nome>/`, não em pastas técnicas globais misturadas.

## Exemplo de referência: health

O módulo de healthchecks foi reestruturado como fatia de referência (fora de `/api/v1`,
porque é infraestrutura operacional):

```text
apps/api/src/health/
├── health.module.ts                 # wiring Nest
├── presentation/health.controller.ts    # C
├── application/health.service.ts        # M (orquestração)
├── domain/build-health-response.ts      # M (contrato/invariante de status)
└── infrastructure/timed-dependency-probe.ts  # M (I/O com timeout)
```

Endpoints inalterados: `GET /health/live`, `GET /health/ready`.

## Frontend (View)

```text
apps/web/
├── app/          # rotas e UI (View)
└── lib/          # adapters server-side para a API (sem regra de domínio)
```

## Próximos módulos

Ao implementar PROMPT 02 (IAM / Organizations / Users / Audit), use o mesmo layout interno
de módulo documentado em `apps/api/src/modules/README.md`. Não é necessário “mais MVC”
estrutural antes disso — a convenção já está fixada.
