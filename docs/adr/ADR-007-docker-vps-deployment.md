# ADR-007 — Docker e deploy portátil em VPS

Status: accepted
Data: 2026-09-27

## Contexto

Deploy inicial na VPS da Cadete.Tech (possivelmente via Coolify) e migração futura para a
infraestrutura da MPFA. A troca de host deve exigir só configuração, nunca mudança de código.

## Decisão

- Um `infrastructure/docker/Dockerfile` multi-stage com targets `api`, `worker`, `web`,
  `migrate`; imagens rodam como usuário `node`, sem configuração embutida, com `HEALTHCHECK`.
- `docker-compose.yml` descreve a stack completa; valores vêm de `.env`.
- Nenhum IP, domínio, caminho de host ou credencial hardcoded. TLS, DNS e reverse proxy são
  infraestrutura (Coolify/Traefik/Nginx), fora da aplicação.
- Portas publicadas apenas em `127.0.0.1`; PostgreSQL e Redis não são expostos.
- `restart: unless-stopped`; `migrate` roda antes de api/worker (`service_completed_successfully`).
- Coolify, se usado, apenas orquestra esse compose; o código não depende dele.

### Volumes persistentes

| Volume           | Conteúdo                       | Backup                           |
| ---------------- | ------------------------------ | -------------------------------- |
| `mpfa_pgdata`    | dados PostgreSQL               | `backup.sh` diário (obrigatório) |
| `mpfa_redisdata` | AOF do Redis (estado de filas) | opcional; jobs reprocessáveis    |

### Healthchecks

- API container: `/health/live` (não reinicia por queda de banco).
- Orquestrador/proxy: `/health/ready` (PostgreSQL + Redis) para roteamento e alertas.
- Worker: ping ao Redis. Web: resposta HTTP < 500.

## Alternativas consideradas

- Kubernetes — desproporcional para uma VPS.
- Deploy sem container (PM2/systemd) — menos reproduzível entre hosts.

## Consequências

- Migração de VPS = restaurar backup + copiar `.env` com segurança + `docker compose up`
  (runbook completo no PROMPT 12).
