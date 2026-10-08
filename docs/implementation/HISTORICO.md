# Histórico de alterações

Linha por entrega. O que entrou, não o detalhe de cada arquivo.

- 2026-10-08 — Consulta viva criada (`HISTORICO.md` e `SITUACAO.md`).
- 2026-10-08 — Desativar um usuário encerra a sessão já aberta e grava `USER_DISABLED`.
- 2026-10-08 — MPFA-S sobre a foundation: parser `WEBJUR_EMAIL_V1`, importação de `.msg`/`.eml`/`.pdf`, lote com original, reprocessamento sem duplicar, sessão e perfis, cadastros, encaminhamento para conferência, tarefas, horas com temporizador persistido, consultas dos painéis, portal isolado, adaptador Microsoft 365 desconectado e view mínima de login/importação. A importação grava no mesmo caso de uso e também enfileira `ingestion.process`; o worker só reexecuta esse caso de uso.
