# Configuração, secrets e logs

- Toda configuração vem de variáveis de ambiente, validadas por `packages/config` no startup.
  Faltou/errou → o processo não sobe e loga **apenas o nome da chave e a regra**, nunca o valor.
- Apenas `packages/config` lê `process.env` (exceções: scripts de infraestrutura e HEALTHCHECK).
- `.env.example` lista chaves sem valores reais. `.env` e `.env.*` estão no `.gitignore`.
- Cada ambiente (`local`, `staging`, `production`) tem banco, Redis, secrets e URLs próprios.
- Secrets em produção: variáveis do Coolify/host ou secret manager; nunca em imagem Docker nem Git.
- Logs: JSON estruturado; `authorization`, `cookie`, `set-cookie`, `password`, `token`, `secret`,
  `accessToken`, `refreshToken` são substituídos por `[REDACTED]` (`packages/logger`).
  Não logar payload de domínio inteiro, documento ou conteúdo jurídico.
- `/health/ready` é público e não retorna mensagens de erro de conexão (podem conter host/credencial).
- Erros inesperados retornam `INTERNAL_ERROR` + `request_id`; stack só no log do servidor.
- IDs de request/correlação recebidos por header são aceitos apenas se `[A-Za-z0-9._:-]{1,128}`.
- Pendente para PROMPT 10 (hardening): headers de segurança (helmet), rate limiting, revisão CORS.
