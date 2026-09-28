# Volumes persistentes

Nenhum caminho de host é hardcoded. Os nomes abaixo são os volumes Docker nomeados
definidos em `docker-compose.yml`. Em outra VPS, os mesmos nomes valem; só mudam
o disco e a configuração do host.

| Volume           | Serviço  | Conteúdo                              | Backup                                       |
| ---------------- | -------- | ------------------------------------- | -------------------------------------------- |
| `mpfa_pgdata`    | postgres | dados do PostgreSQL                   | `infrastructure/scripts/backup.sh` (pg_dump) |
| `mpfa_redisdata` | redis    | AOF do Redis (estado de filas BullMQ) | opcional; jobs são reprocessáveis            |

## Runtime local sem Docker

Dados ficam em `.local/` (gitignored):

- `.local/postgres` — data directory do `embedded-postgres`
- `.local/redis` — binário portátil
- `.local/redis-data` — persistência do Redis local
- `backups/` — dumps gerados pelo script de backup

## Migração de VPS

1. Backup lógico do PostgreSQL (`backup.sh`).
2. Restore no destino (`restore.sh`) apontando `DATABASE_URL` do novo ambiente.
3. Redis: volume vazio no destino é aceitável; jobs pendentes devem ser reenfileirados se necessário.
4. Nenhuma alteração de código.
