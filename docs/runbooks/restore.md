# Runbook — backup e restore

> Backup só é confiável depois de restaurado em teste. O CI executa um round-trip
> backup → restore a cada push; em produção, registrar o teste periódico abaixo.

## O que precisa de backup

| Item                     | Volume / origem     | Necessidade                                           |
| ------------------------ | ------------------- | ----------------------------------------------------- |
| PostgreSQL               | `mpfa_pgdata`       | **Crítico** — `backup.sh` (pg_dump lógico)            |
| Redis (estado das filas) | `mpfa_redisdata`    | Desejável — AOF ligado; jobs devem ser reprocessáveis |
| Configuração / secrets   | Coolify / host      | Exportar com segurança, fora do Git                   |
| Documentos               | SharePoint (futuro) | Guardar só metadados/IDs no banco                     |

## Backup

```bash
DATABASE_URL=postgresql://... APP_ENV=production BACKUP_DIR=/srv/backups/mpfa \
  infrastructure/scripts/backup.sh
```

- Gera `mpfa-<env>-<UTC>.dump` (formato custom) + `.sha256`; arquivo parcial nunca é confundido
  com backup válido.
- Agendar diariamente (cron/Coolify scheduled task). Retenção de referência: **7 diários,
  4 semanais, 3 mensais** — o script remove dumps com mais de `BACKUP_KEEP_DAYS` (35); a
  promoção semanal/mensal é feita copiando para outro destino (storage externo criptografado).
- Diretório de backup com permissão restrita (`umask 077`) e cópia fora da VPS.
- Observação: o `DATABASE_URL` aparece na linha de comando do `pg_dump`; rodar em host/container
  sem outros usuários ou usar `~/.pgpass`.

## Restore (teste periódico — ambiente isolado)

```bash
psql "$ADMIN_URL" -c 'CREATE DATABASE mpfa_restore_check'
RESTORE_DATABASE_URL=postgresql://.../mpfa_restore_check \
  infrastructure/scripts/restore.sh /srv/backups/mpfa/mpfa-production-<stamp>.dump
```

Saída esperada: `checksum ok` e `restore complete: N migration(s) recorded`. Registrar data,
arquivo, duração e resultado. Remover o banco de teste depois.

## Restore de emergência (destrutivo)

Somente com aprovação explícita. Parar api/worker, fazer backup do estado atual, então:

```bash
RESTORE_CONFIRM=overwrite APP_ENV=production RESTORE_DATABASE_URL="$DATABASE_URL" \
  DATABASE_URL="$DATABASE_URL" infrastructure/scripts/restore.sh <arquivo.dump>
npm run db:migrate:deploy     # alinhar migrations se o dump for anterior à versão atual
```

Subir api/worker, validar `/health/ready` e smoke tests.
