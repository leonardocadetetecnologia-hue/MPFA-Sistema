# Plano de desenvolvimento — MPFA

Atualizado: 2026-10-07  
Fontes: `prompt-vibe-coding-mpfa.md`, `mpfa-requisitos-mvc-vibe-coding.md`, `Prompt-Documentacao-Sistema.md`, foundation atual (`PROMPTS.md` / `AGENTS.md`), código em `main` + branch MVC.

---

## 1. O que os três documentos pedem

| Documento | Papel |
| --------- | ----- |
| **Requisitos MVC vibe coding** | Spec do produto **Ficha-Tempo Assistida**: captura → revisão → fila ADVWIN manual. RF-001…027, RN, RNF, modelo de dados, telas, fases 1–7. |
| **Prompt mestre vibe coding** | Como o agente deve construir esse MVP (etapas, stack preferencial, anti-inventar ADVWIN). |
| **Prompt Documentação Sistema** | Runbook de continuidade **depois** do sistema estar em produção. Só leitura; gera `visao-sistema/index.html`. **Não executar agora.** |

A foundation já no Git (`PROMPTS.md`) descreve a **plataforma jurídica completa** (IAM multi-org, clientes, Webjur, portal, newsletter…). Isso é o horizonte; o vibe coding define o **primeiro valor entregável**.

---

## 2. Conflito a resolver (e a decisão)

| Tema | Vibe coding (Ficha-Tempo) | Foundation / PROMPTS (plataforma) | Decisão recomendada |
| ---- | ------------------------- | --------------------------------- | ------------------- |
| Produto | MVP Ficha-Tempo, sem ADVWIN real | Plataforma multi-domínio 02–13 | **Ficha-Tempo = primeiro domínio operacional** sobre a foundation |
| Stack | Next + Server Actions + Supabase opcional | Next + **NestJS** + Prisma + Redis + Docker VPS | **Manter Nest + Prisma + Docker** (já existe). View = Next; Controller/Services = Nest nas camadas MVC |
| Auth / roles | Operacional, Revisor, Admin | SUPER_ADMIN, MPFA_MANAGER, LAWYER, CLIENT, FINANCIAL | **Mapear**: Admin→administração; Revisor→revisão; Operacional→captura. `organization_id` desde já (ADR-004), mesmo com 1 org no piloto |
| MVC | `controllers/` + `services/` + `domain/` no Next | `presentation/` / `application/` / `domain/` / `infrastructure/` no Nest | **Convenção já documentada** em `docs/architecture/mvc.md` — UI sem regra de negócio |
| Escopo | 6 fases Ficha-Tempo | PROMPT 02 IAM genérico primeiro | **IAM mínimo do Ficha-Tempo primeiro** (auth + 3 perfis + audit), depois cadastros e captura — não esperar Webjur/portal |
| Docs de produção | — | Prompt Documentação | **Só após piloto estável** |

**Não recomeçar o repo do zero.** Reutilizar monorepo, health, CI, Prisma, worker, config.

**Não implementar** API/RPA ADVWIN. Só `AdvwinAdapter` + `ManualAdvwinAdapter`.

---

## 3. Arquitetura alvo (pragmática)

```text
apps/web          → View (Next.js): captura, filas, dashboards, admin
apps/api          → Controllers + Services + Domain (Nest, MVC por módulo)
apps/worker       → jobs (import CSV, export, futuras integrações)
packages/*        → config, logger, contracts, database (Prisma)
integrations/     → AdvwinAdapter (manual agora; API/RPA depois)
```

Módulos de domínio (ordem de nascimento):

```text
iam / users / audit     → Fase 1
clients / matters       → Fase 2 (pasta = matter)
catalog                 → service_types, description_templates
time-entries            → captura, status, cronômetro
review                  → fila, aprovação, devolução
reporting               → dashboard, export
integrations/advwin     → marcação manual + adapter
```

---

## 4. Roadmap por fases (alinhavado aos RF)

Critério: cada fase fecha com DoD do vibe coding (regra + permissão + erro + UI + audit + teste). Push ao Git no fim da fase (ou marco), não só no fim do MVP.

### Fase 0 — Estrutura e governança (esta sessão)

- [x] Foundation no repo
- [x] Convenção MVC no `health`
- [ ] Merge branch MVC → `main`
- [ ] Specs vibe coding versionadas em `docs/product/`
- [ ] Este plano + ADR de produto
- [ ] Atualizar `STATUS.md` / mapa RF ↔ código

### Fase 1 — Fundação de produto (RF-001…003, RNF auth/audit)

Auth, users, 3 roles, layout app, auditoria base, erros globais, seed local.

**Saída:** login funciona; Operacional não entra em admin; events de login/audit.

### Fase 2 — Cadastros (RF-004…008, RF-006 import)

Clientes, pastas (matters), tipos de serviço, modelos de descrição, import CSV/XLSX.

**Saída:** admin cadastra/importa; autocomplete de captura preparado.

### Fase 3 — Operação (RF-009…014)

Captura rápida (1 tela), rascunho, duração, horas cobradas, cronômetro, meu dia, status machine.

**Saída:** lançamento &lt; 30s após escolher pasta (meta do aceite MVP).

### Fase 4 — Revisão (RF-015…017, RN-001…)

Fila, aprovação, devolução com motivo, histórico, lote.

### Fase 5 — Gestão (RF-020…024)

Dashboards, busca, exportação, alertas de inconsistência leves.

### Fase 6 — ADVWIN manual (RF-018…019, RF-025)

`APROVADO → PRONTO_ADVWIN → LANCADO_ADVWIN`, `ManualAdvwinAdapter`, alerta de duplicidade (não bloqueia).

### Fase 7 — Integração real

Só com discovery técnico + autorização. Fora do MVP.

### Depois do piloto — Documentação de continuidade

Executar `docs/governance/Prompt-Documentacao-Sistema.md` → `visao-sistema/index.html`.

---

## 5. Mapa RF → prioridade (piloto)

| Prioridade | Itens |
| ---------- | ----- |
| **P0** | Auth, perfis, clientes, pastas, tipos, captura, status, revisão, aprovação, histórico, auditoria, export, marcação ADVWIN |
| **P1** | Templates, importação, cronômetro, dashboard, duplicidade, ações em lote |
| **P2** | Integração/RPA, BI avançado, sugestões IA de descrição |

---

## 6. O que NÃO fazer agora

1. Reescrever em Supabase-only / abandonar Nest.
2. Inventar API ADVWIN ou RPA.
3. Implementar Webjur, portal cliente, newsletter, financeiro.
4. Perfis `CLIENT` / portal externo antes do fluxo interno Ficha-Tempo.
5. Gerar `visao-sistema/` (sistema ainda não está em produção).
6. Overengineering de multi-org SaaS — 1 organização piloto com `organization_id` no schema basta.

---

## 7. Ordem de trabalho imediata (estrutura)

1. **Congelar a decisão de produto** (este plano) — aprovação do responsável.
2. Merge MVC + specs em `main`.
3. ADR curto: “MVP = Ficha-Tempo Assistida; plataforma completa permanece roadmap”.
4. Começar **Fase 1** em branch `cursor/ficha-tempo-fase1-9269`: Prisma users/roles/audit + auth + shell Next autenticado.
5. Ao fechar cada fase: testes, README/changelog, push, prévia, aguardar OK antes da seguinte.

---

## 8. Critério de sucesso do MVP (aceite)

Usuário entra → captura atividade rápida → revisor aprova/devolve → item vai a `PRONTO_ADVWIN` → marca `LANCADO_ADVWIN` manualmente → histórico/auditoria/export → **sem** depender de ADVWIN real.
