# STATUS — sessão e ponto de parada

Atualizado: 2026-10-07

## Onde paramos

**Estruturação do produto:** specs vibe coding + plano de desenvolvimento + ADR-009.

- PROMPT 01 — Foundation: concluído.
- Convenção MVC: aplicada no `health` (branch `cursor/mpfa-mvc-structure-9269`).
- Specs Ficha-Tempo versionadas em `docs/product/`.
- Plano de execução: [`docs/product/PLANO-DESENVOLVIMENTO.md`](product/PLANO-DESENVOLVIMENTO.md).
- ADR de produto: [`docs/adr/ADR-009-mvp-ficha-tempo.md`](adr/ADR-009-mvp-ficha-tempo.md).
- Prompt de documentação de produção: `docs/governance/Prompt-Documentacao-Sistema.md` — **não executar agora**.

**Próximo passo de código (após OK do responsável):** Fase 1 — auth, 3 roles, auditoria, layout — branch `cursor/ficha-tempo-fase1-9269`.

## Decisões vigentes

- MVP = Ficha-Tempo Assistida (não a plataforma inteira de uma vez).
- Stack = Next + Nest + Prisma + Redis + Docker (foundation).
- Sem ADVWIN real; só adapter manual.
- Sem inventar API/credenciais ADVWIN.

## Como retomar

Ver `docs/product/PLANO-DESENVOLVIMENTO.md` §7 e README da raiz.
