# Histórico de alterações

Linha por entrega. O que entrou, não o detalhe de cada arquivo.

- 2026-10-08 — Consulta viva criada (`HISTORICO.md` e `SITUACAO.md`).
- 2026-10-08 — Desativar um usuário encerra a sessão já aberta e grava `USER_DISABLED`.
- 2026-10-08 — MPFA-S sobre a foundation: parser `WEBJUR_EMAIL_V1`, importação de `.msg`/`.eml`/`.pdf`, lote com original, reprocessamento sem duplicar, sessão e perfis, cadastros, encaminhamento para conferência, tarefas, horas com temporizador persistido, consultas dos painéis, portal isolado, adaptador Microsoft 365 desconectado e view mínima de login/importação. A importação grava no mesmo caso de uso e também enfileira `ingestion.process`; o worker só reexecuta esse caso de uso.
- 2026-10-08 — Interface operacional no Next: shell com Claro e Black Piano, publicações, processos, tarefas, horas, clientes, agenda, relatórios, configurações e portal. A listagem de publicações, clientes e horas entrou na API. O HTML do e-mail não vai para o navegador. Microsoft 365 e envio de e-mail continuam desconectados.
- 2026-10-08 — Checklist do que revisar, completar e definir antes de publicar na VPS (`docs/implementation/PROXIMO-PASSO.md`).
