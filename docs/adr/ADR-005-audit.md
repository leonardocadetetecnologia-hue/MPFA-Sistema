# ADR-005 — Trilha de auditoria

Status: accepted (implementação no PROMPT 02)
Data: 2026-09-27

## Contexto

Ações sensíveis (acesso de usuário, compartilhamento de documento, publicação ao cliente,
lançamento de horas, configuração de integração) precisam ser rastreáveis. Auditoria não é log
técnico.

## Decisão

- Tabela `audit_log` append-only no nível da aplicação, com: `id`, `organization_id`,
  `actor_user_id`, `action`, `resource_type`, `resource_id`, `before_data`, `after_data` (JSONB),
  `ip_address`, `user_agent`, `correlation_id`, `created_at`.
- Escrita pelo módulo `audit` via porta `AuditTrail.record(...)`, chamada pelos casos de uso
  **na mesma transação** da mudança auditada.
- `correlation_id` vem do contexto da requisição (já implementado na Foundation).
- `before_data`/`after_data` passam por sanitização: nunca gravam segredo, token ou documento.
- Leitura restrita pela permissão `audit.read`; sem update/delete pela aplicação.

## Alternativas consideradas

- Triggers de banco — capturam tudo, mas perdem ator/intenção de negócio; podem complementar.
- Event sourcing — desproporcional ao problema.

## Consequências

- Todo caso de uso sensível precisa de teste verificando o registro de auditoria.
