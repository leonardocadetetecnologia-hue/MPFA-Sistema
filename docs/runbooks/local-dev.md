# Runbook — ambiente local

## Opção A: Docker (recomendado)

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps                     # postgres/redis healthy, migrate exited 0
curl http://127.0.0.1:3001/health/ready
```

## Opção B: sem Docker (Windows/macOS/Linux)

Usa binários portáteis dentro de `.local/` (ignorado pelo Git); nada é instalado no sistema.
O script se recusa a rodar se `APP_ENV` não for `local` ou se as URLs não apontarem para localhost.

1. PostgreSQL: incluído via devDependency `embedded-postgres` (PostgreSQL 17).
2. Redis: coloque um `redis-server` em `.local/redis/` **ou** defina `REDIS_SERVER_BIN`.
   - Windows: build portátil de <https://github.com/redis-windows/redis-windows/releases>
     (ex.: `Redis-8.10.2-Windows-x64-msys2.zip`), extrair o conteúdo em `.local/redis/`.
   - Linux/macOS: `redis-server` do gerenciador de pacotes, via `REDIS_SERVER_BIN`.
3. Suba e valide:

```bash
cp .env.example .env
npm ci && npm run build
npm run local:up                      # terminal dedicado; Ctrl+C encerra
npm run db:migrate:deploy
npm run db:seed                       # exige SEED_PASSWORD no .env; recusado em production
npm run test:integration
npm run start:api                     # outro terminal
npm run start:worker
npm run start:web
```

Dados locais ficam em `.local/postgres` e `.local/redis-data`. Para zerar: pare o `local:up` e
apague `.local/postgres` (somente ambiente local).
