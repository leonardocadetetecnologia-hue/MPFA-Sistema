# Situação da implementação

Atualizado: 2026-10-08

Consulte este arquivo para ver o que já funciona e o que falta. O que revisar antes da VPS está em `PROXIMO-PASSO.md`.

## Validado nesta sessão

Comandos, na raiz do repositório, com Node portátil local (não versionado):

- `npm run lint` — saiu 0
- `npm run typecheck` — saiu 0 em config, logger, contracts, database, api, worker e web
- `npm test` — config 8, logger 3, api 34, worker 3, todos passando
- `npm run build` — saiu 0. O Next gerou `/`, `/login`, `/importacao`, `/api/session` e `/api/import`
- `jest` de `apps/api/test/ingestion.int-spec.ts` contra PostgreSQL descartável em UTF-8, com a migration `20261008000000_mpfa_s` aplicada — 6 testes passando
- `npm run db:seed` nesse banco, com `APP_ENV=local` e `SEED_PASSWORD` — criou a organização piloto e um usuário de cada perfil

A amostra `.msg` local foi lida pelo teste e não entrou no Git. Resultado: 9 publicações, 6 números de processo, 2 revisões, datas de disponibilização e publicação diferentes, ambiguidade de nome/OAB, e a segunda importação do mesmo arquivo devolveu o mesmo lote sem aumentar a contagem. O `.eml` sintético do repositório manteve 4 publicações, 3 processos sugeridos sem cliente, reimportação sem duplicar e reprocessamento de lote `FAILED` sem criar tarefa. O PDF local foi gravado com a limitação `pdf_without_html_comments` e zero publicações extraídas.

No navegador, na passagem anterior, senha errada mostrou o alerta e `admin@mpfa.local` importou o `.eml` sintético com lote `COMPLETED_WITH_PENDINGS`, 4 publicações, 3 processos e 2 revisões. Nesta passagem a tela de entrada foi revista em Claro e Black Piano, com a marca inteira, e `/painel` sem sessão voltou para `/login`. A digitação da senha no navegador desta passagem foi bloqueada, então as jornadas já autenticadas não foram repetidas.

`npm run format:check` falha neste checkout Windows em arquivos que já estavam no repositório, por causa de fim de linha. Os arquivos novos desta entrega foram passados pelo Prettier.

## Quadro

| Requisito | Classificação | Evidência | Validação | Pendência |
| --- | --- | --- | --- | --- |
| Foundation | Implementado e validado | Código anterior | Lint, typecheck, testes unitários e build desta sessão | Integração de health com Redis não foi reexecutada aqui |
| Parser `WEBJUR_EMAIL_V1` | Implementado e validado | `apps/api/src/modules/ingestion/domain` | 8 testes unitários, incluindo a amostra `.msg` | Nenhuma do contrato atual |
| Importação, lote, original, reprocessamento e worker | Implementado e validado | Migration `20261008000000_mpfa_s`, `ImportMessageService`, job `ingestion.process` | Persistência do `.eml`, do `.msg` e do PDF; worker recusa o job sem URL ou token | Caixa postal real ainda não é lida |
| Identidade, sessão, perfis e seed | Implementado e validado | `iam`, `infrastructure/scripts/seed.mjs` | Senha errada mostra o alerta; `admin@mpfa.local` entra e cai em `/importacao`. Sessão ausente expira. Usuário desativado perde a sessão aberta | Recuperação de senha grava a intenção e não envia e-mail |
| Clientes, processos, filtro interno e conferência | Implementado e validado no vínculo | `OfficeService` e a importação | Processo sugerido fica sem cliente; vínculo `PENDING` | Nenhuma regra interna de produção cadastrada |
| Tarefas, ações e horas | Implementado | `office` e `time-entries/domain/hours.ts` | Temporizador gravado, recarregado e encerrado em rascunho no teste de persistência | Aprovação e fechamento de período estão no serviço, sem caso de integração próprio |
| Painéis | Implementado | `DASHBOARD_FORMULAS`, `OfficeService.dashboard` e `/painel` | Fórmulas no contrato e na tela | A tela autenticada não foi reaberta nesta passagem |
| Portal do cliente | Implementado e validado no contrato | `portal-scope`, publicação explícita e `/portal` | O teste de persistência publicou uma ocorrência e a nota interna não apareceu na resposta. A rota sem sessão volta para o login | A sessão de cliente não foi aberta nesta passagem |
| Microsoft 365 | Implementado com validação externa pendente | `integrations/microsoft365.ts` | Teste unitário: `disconnected` e `externally_validated: false` | Sem tenant e sem chamada ao Graph |
| View mínima | Substituída pela interface operacional | `/login` e `/importacao` | A importação sintética anterior continua válida. `/importacao` agora abre Publicações | — |
| Interface operacional | Implementado | `apps/web` shell, temas, jornadas e `GET` de publicações, clientes e horas | Typecheck da web e da API saiu 0. ESLint de `apps/web` e do módulo office saiu 0. Testes unitários da API: 39 passando. No navegador, login em Claro e Black Piano, marca visível, e `/painel` sem sessão volta para `/login`. As rotas novas sem sessão respondem 401 | Entrada autenticada (importar, listar, portal e cronômetro) não foi reexecutada nesta passagem |
| Financeiro, RPA, API do ADVWIN, e-mail real, deploy | Não implementado | — | — | Fora desta execução. Financeiro continua em discovery |

## O que a importação faz

O `POST /api/v1/ingestion/messages` grava o lote na hora. Em seguida tenta enfileirar `ingestion.process`. Se o Redis não responder, a importação permanece gravada e a resposta traz `queued: false`. O worker, quando roda, chama de novo o mesmo caso de uso; um lote já concluído com o mesmo arquivo não abre outra publicação.
