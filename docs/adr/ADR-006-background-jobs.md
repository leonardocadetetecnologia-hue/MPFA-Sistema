# ADR-006 — Jobs assíncronos com Redis + BullMQ

Status: accepted
Data: 2026-09-27

## Contexto

Importação de publicações (Webjur), geração de relatórios, processamento de documentos e
e-mails são lentos, dependem de terceiros e precisam ser reprocessáveis sem perda silenciosa.

## Decisão

- Redis (imagem `redis:8-alpine`, AOF ligado) + BullMQ 5, consumido por `apps/worker`.
- Nomes de filas e jobs e o envelope `JobEnvelope { correlation_id, payload }` ficam em
  `@mpfa/contracts`; produtores (api) e consumidor (worker) compartilham o contrato.
- Política padrão `DEFAULT_JOB_OPTIONS`: 3 tentativas, backoff exponencial (1s), retenção de
  concluídos por 24h e de falhos por 7 dias (falha visível e reprocessável).
- Idempotência: `jobId` determinístico (ex.: hash da referência externa) quando houver risco
  de duplicação — BullMQ ignora jobs com `jobId` repetido.
- Job sem handler falha como `UnrecoverableError` (sem retry inútil) e é logado como erro.
- Shutdown gracioso: `SIGTERM` → `worker.close()` aguarda jobs em andamento.

## Alternativas consideradas

- pg-boss (fila no PostgreSQL) — menos infraestrutura, mas BullMQ é a stack de referência e
  oferece melhor observabilidade/rate limiting por fila.
- Valkey no lugar de Redis — compatível; pode substituir a imagem sem mudança de código.

## Consequências

- Redis passa a ser dependência crítica do worker; a readiness da API também o verifica.
- Dead-letter/reprocessamento administrativo detalhados no PROMPT 10.
