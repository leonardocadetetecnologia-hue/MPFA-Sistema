# PROMPTS.md — Sequência Oficial de Construção da Plataforma MPFA

> Este é o terceiro arquivo de governança do projeto, complementar a `AGENTS.md` e `CLAUDE.md`.
>
> - `AGENTS.md`: regras permanentes para agentes compatíveis com AGENTS.
> - `CLAUDE.md`: mesmas regras permanentes para Claude.
> - `PROMPTS.md`: sequência oficial de execução do projeto, em fases.
>
> **Regra:** cada prompt abaixo executa somente a fase indicada. Não avance automaticamente para a fase seguinte.
> Toda execução deve respeitar integralmente `AGENTS.md` e `CLAUDE.md`.

---

# 0. Contrato global de execução

Antes de executar qualquer fase:

1. Leia `AGENTS.md`, `CLAUDE.md` e este `PROMPTS.md`.
2. Inspecione o estado real do repositório.
3. Reuse o que já existe antes de criar código novo.
4. Não invente regra de negócio não validada.
5. Não faça refatoração lateral sem necessidade.
6. Não exponha secrets, tokens, senhas ou credenciais.
7. Não faça commit, push, merge ou deploy sem aprovação final do responsável.
8. Toda alteração deve:
   - compilar;
   - passar em lint;
   - passar em typecheck;
   - executar os testes relevantes;
   - ter evidência real de execução;
   - mostrar prévia antes da aprovação final.
9. Em mudanças de banco:
   - usar migration versionada;
   - evitar mudanças destrutivas;
   - documentar rollback.
10. Em integrações:
    - usar adapters/interfaces;
    - validar payloads na fronteira;
    - registrar falhas;
    - garantir idempotência quando aplicável.
11. Em código multi-organização:
    - nenhuma consulta de domínio pode ignorar `organization_id` quando a entidade for organizacional.
12. Em funcionalidades voltadas a clientes externos:
    - aplicar autorização por permissão + escopo + ownership + visibilidade.
13. Nunca usar produção para desenvolvimento.
14. Ambientes obrigatórios:
    - `local`
    - `staging`
    - `production`

Ao final de cada fase, responder nesta ordem:

1. O que mudou e por quê.
2. Arquivos tocados.
3. Decisões arquiteturais tomadas.
4. Suposições assumidas.
5. Migrations criadas e rollback, se houver.
6. Testes executados + resultado real.
7. Evidência de execução / screenshot quando houver UI.
8. Riscos ou pendências.
9. Mensagem(ns) de commit propostas.
10. Parar e aguardar aprovação.

---

# 1. Arquitetura-alvo

A arquitetura inicial da Plataforma MPFA é um **monólito modular**, preparado para evolução futura sem complexidade prematura.

## Stack base

- TypeScript
- Monorepo
- Next.js
- NestJS
- PostgreSQL
- Prisma
- Redis
- BullMQ
- Docker
- GitHub Actions
- REST + OpenAPI
- Validação explícita de contratos
- Logging estruturado
- Testes unitários, integração e E2E quando aplicável

## Estrutura de referência

```text
apps/
  web/
  api/
  worker/

packages/
  ui/
  contracts/
  validation/
  config/
  logger/
  database/
  testing/

infrastructure/
  docker/
  scripts/
  monitoring/

docs/
  architecture/
  adr/
  api/
  database/
  security/
  runbooks/
```

## Domínios previstos

```text
Foundation
├── IAM
├── Organizations
├── Users
├── Audit
├── System Admin
├── Configuration
└── Background Jobs

Core
├── Clients
├── Matters
├── Publications
├── Webjur Filters
├── Tasks
├── Calendar
├── Time Entries
├── Documents
└── Reports

Experience
├── Client Portal
├── Communications
├── Dashboards
└── Newsletter

Integrations
├── Webjur
└── Microsoft 365

Discovery Pending
└── Financial
```

---

# PROMPT 01 — Foundation

## Objetivo

Criar a fundação técnica da Plataforma MPFA sem implementar funcionalidades de negócio.

## Prompt

Leia obrigatoriamente `AGENTS.md`, `CLAUDE.md` e `PROMPTS.md` antes de qualquer alteração.

Execute somente o **PROMPT 01 — Foundation**.

Quero iniciar a Plataforma MPFA com padrão de projeto empresarial, preparada para produção, auditoria, segurança, testes, observabilidade, manutenção e futura migração de infraestrutura.

Não comece pelas telas ou regras de negócio.

### Crie a fundação técnica com:

- monorepo;
- TypeScript;
- `apps/web` com Next.js;
- `apps/api` com NestJS;
- `apps/worker` para processamento assíncrono;
- PostgreSQL;
- Prisma;
- Redis;
- BullMQ;
- Docker;
- configuração centralizada por variáveis de ambiente;
- validação das variáveis no startup;
- ambientes `local`, `staging` e `production`;
- healthchecks da API, banco e Redis;
- logging estruturado;
- `request_id` / `correlation_id`;
- tratamento centralizado de erros;
- estrutura inicial para OpenAPI;
- estrutura inicial para testes;
- CI com lint, typecheck, testes e build;
- documentação de arquitetura;
- ADRs iniciais;
- `.env.example` sem qualquer segredo real.

### A infraestrutura deve nascer portátil

O deploy inicial será em uma VPS da Cadete.Tech e futuramente será migrado para a VPS da MPFA.

Portanto:

- não use IP hardcoded;
- não use domínio hardcoded;
- não use paths específicos da VPS;
- não coloque secrets no Git;
- use Docker e configuração externa;
- PostgreSQL e Redis devem ser configuráveis;
- documente volumes persistentes;
- crie healthchecks adequados;
- prepare runbook de backup/restore;
- a migração futura de VPS deve exigir alteração de configuração/infraestrutura, e não mudança no código da aplicação.

### Prepare somente a infraestrutura dos módulos:

```text
iam
organizations
users
audit
system-admin
```

Não implemente ainda regras de:

- financeiro;
- faturamento;
- clientes;
- processos;
- Webjur;
- publicações;
- agenda;
- horas;
- documentos;
- relatórios;
- portal;
- newsletter.

### Multi-organização

Prepare a arquitetura para uso de `organization_id` nas entidades de negócio futuras.

Não transforme o sistema agora em uma plataforma SaaS complexa.

### ADRs obrigatórios

Crie pelo menos:

```text
ADR-001-modular-monolith
ADR-002-postgresql
ADR-003-authentication-authorization
ADR-004-multi-organization
ADR-005-audit
ADR-006-background-jobs
ADR-007-docker-vps-deployment
ADR-008-database-migrations
```

### Antes de alterar

1. Analise o repositório.
2. Informe o que já existe.
3. Identifique o que será reaproveitado.
4. Apresente brevemente o plano técnico.
5. Só então implemente.

Não interrompa para decisões triviais.

### Definition of Done

Antes de apresentar a entrega:

- instalar dependências;
- executar lint;
- executar typecheck;
- executar testes;
- executar build;
- subir ambiente local;
- validar API;
- validar PostgreSQL;
- validar Redis;
- validar healthcheck;
- validar que o projeto sobe a partir do `.env.example` devidamente preenchido;
- mostrar estrutura final de diretórios;
- mostrar evidência real dos comandos;
- mostrar diff;
- propor commits;
- não aplicar commit/push/deploy.

Pare após a prévia e aguarde aprovação.

---

# PROMPT 02 — IAM, Organizations, Users, Permissions e Audit

## Objetivo

Construir a identidade e governança da plataforma antes dos módulos operacionais.

## Prompt

Leia `AGENTS.md`, `CLAUDE.md` e `PROMPTS.md`.

Execute somente o **PROMPT 02**.

Implemente:

- organizações;
- usuários;
- autenticação;
- sessões/tokens conforme ADR aprovado;
- roles;
- permissions;
- vínculo usuário ↔ organização;
- escopo de acesso;
- auditoria;
- desativação de usuário;
- alteração de acesso;
- trilha de alterações.

Perfis-base iniciais:

```text
SUPER_ADMIN
MPFA_MANAGER
LAWYER
CLIENT
FINANCIAL
```

`FINANCIAL` existe apenas como perfil reservado; não implemente regras funcionais financeiras.

### Regras importantes

`SUPER_ADMIN`
- administração técnica;
- não significa acesso irrestrito automático a conteúdo sensível.

`MPFA_MANAGER`
- pode supervisionar operação;
- pode redefinir acessos existentes;
- pode ativar/desativar usuários conforme política;
- não pode criar `SUPER_ADMIN`;
- não pode elevar ninguém acima do próprio escopo.

`CLIENT`
- deve ser isolado por organização, cliente, ownership e visibilidade;
- possuir role não é suficiente para acessar recurso.

Não espalhe `if role === ...` pelo código.

Use:

```text
Role
  ↓
Permissions
  ↓
Resource Scope
```

Crie permissões granulares, por exemplo:

```text
user.access.update
user.read
audit.read
organization.read
organization.update
```

### Auditoria

Criar estrutura que permita registrar:

- actor;
- organization;
- ação;
- resource_type;
- resource_id;
- before;
- after;
- IP;
- user agent;
- correlation id;
- timestamp.

Não registre secrets.

### Testes mínimos

- autenticação válida;
- autenticação inválida;
- permissão permitida;
- permissão negada;
- isolamento entre organizações;
- manager não cria super admin;
- auditoria gerada após mudança relevante.

Pare após prévia e aguarde aprovação.

---

# PROMPT 03 — Clientes e Processos

## Objetivo

Criar o núcleo operacional sobre o qual os demais módulos dependerão.

## Prompt

Leia `AGENTS.md`, `CLAUDE.md` e `PROMPTS.md`.

Execute somente o **PROMPT 03**.

Implemente os domínios:

```text
clients
matters
```

Use nomenclatura de domínio clara e consistente. Se o projeto adotar `matter` como nome técnico para processo/pasta, documente a decisão em ADR ou documentação de arquitetura.

### Cliente

Estrutura mínima:

- id;
- organization_id;
- tipo;
- nome/razão social;
- identificador externo opcional;
- status;
- dados de contato estritamente necessários;
- timestamps;
- archived_at quando aplicável.

Não invente campos jurídicos que ainda não foram levantados.

### Processo / Pasta

Estrutura mínima baseada apenas no que já sabemos:

- id;
- organization_id;
- client_id;
- código interno opcional;
- número CNJ opcional;
- descrição/título;
- responsável;
- status;
- tipo/categoria configurável;
- timestamps;
- archived_at.

### Regras

- toda consulta deve respeitar `organization_id`;
- cliente de outra organização não pode ser associado;
- processo deve pertencer a um cliente válido da organização;
- arquivamento deve ser preferido a exclusão física;
- não colocar regra jurídica;
- não presumir estrutura financeira;
- documentar campos ainda pendentes de discovery.

### API

Criar endpoints consistentes para:

- listar;
- detalhar;
- criar;
- atualizar;
- arquivar/restaurar quando aplicável.

Paginação, filtros e ordenação devem seguir padrão único.

### Auditoria

Auditar pelo menos:

- criação;
- atualização;
- arquivamento;
- restauração;
- mudança de responsável/status.

### Testes

Cobrir:

- CRUD permitido;
- isolamento organizacional;
- cliente inexistente;
- associação inválida;
- arquivamento;
- autorização;
- auditoria.

Pare após prévia e aguarde aprovação.

---

# PROMPT 04 — Agenda, Tarefas e Horas

## Objetivo

Criar o principal núcleo de execução operacional.

## Prompt

Leia `AGENTS.md`, `CLAUDE.md` e `PROMPTS.md`.

Execute somente o **PROMPT 04**.

Implemente:

```text
tasks
calendar
time-entries
```

### Tarefas

Campos mínimos:

- organization_id;
- matter_id opcional;
- client_id quando aplicável;
- título;
- descrição;
- responsável;
- criador;
- prioridade;
- status;
- deadline;
- completed_at;
- origem;
- timestamps.

### Agenda

A plataforma deve possuir agenda operacional própria.

Prepare:

- visão individual;
- visão da gestão;
- compromissos vinculados a processo/tarefa;
- lembretes;
- integração futura com Outlook via adapter, sem acoplamento ao Graph.

Não implemente sincronização Microsoft ainda.

### Horas

Campos mínimos:

- organization_id;
- user_id;
- client_id;
- matter_id;
- task_id opcional;
- data;
- descrição;
- worked_minutes;
- billable_minutes;
- status;
- origin;
- timestamps.

Não assuma ainda regra definitiva entre horas trabalhadas e horas cobráveis.

Se não houver regra homologada, permita os campos e documente a pendência.

### UX/API

O backend deve suportar futuramente:

- lançamento global;
- lançamento a partir do processo;
- lançamento a partir da tarefa;
- timer opcional futuro.

Não implemente timer se não for necessário para esta fase.

### Testes

- tarefa;
- deadline;
- conclusão;
- hora vinculada a processo;
- isolamento;
- permissões;
- auditoria;
- validações de minutos negativos/nulos;
- comportamento de campos opcionais.

Pare após prévia e aguarde aprovação.

---

# PROMPT 05 — Webjur, Publicações e Gestão de Filtros

## Objetivo

Integrar a entrada de publicações sem acoplar o domínio ao fornecedor.

## Condição

Antes de concluir integração real, verificar se a MPFA/Webjur forneceu documentação de API, webservice ou formato oficial.

Se não houver documentação, implemente contratos, adapters e processamento de e-mail somente como mecanismo suportado pelo conhecimento disponível.

## Prompt

Leia `AGENTS.md`, `CLAUDE.md` e `PROMPTS.md`.

Execute somente o **PROMPT 05**.

Implemente:

```text
publications
webjur-filters
integrations/webjur
```

### Arquitetura obrigatória

O domínio não deve conhecer Webjur diretamente.

Use contrato semelhante a:

```text
PublicationSource
    ▲
    ├── WebjurApiPublicationSource
    └── WebjurEmailPublicationSource
```

### Publicações

Guardar:

- conteúdo normalizado;
- referência externa;
- CNJ quando disponível;
- datas;
- tribunal/origem;
- partes quando disponíveis;
- advogados/OAB quando disponíveis;
- link/document id;
- status de triagem;
- vínculo com processo;
- responsável;
- raw/original para auditoria/reprocessamento quando necessário.

### Validação de integração

Estados mínimos:

```text
VALID
SUSPICIOUS
INVALID
```

Versionar layouts:

```text
WEBJUR_API_V1
WEBJUR_EMAIL_V1
```

### Obrigatório

- idempotência;
- deduplicação;
- hash/referência externa;
- retry;
- fila de erro;
- log de processamento;
- reprocessamento;
- nenhuma falha silenciosa.

### Gestão de filtros

Criar domínio de filtros com:

- nome;
- finalidade;
- responsável;
- abrangência;
- status;
- referência externa;
- parâmetros conhecidos;
- histórico;
- data de ativação/desativação.

Preparar métricas:

- retornos recebidos;
- relevantes;
- falsos positivos;
- duplicados.

Não inferir automaticamente cancelamento de filtro.

O objetivo é fornecer evidência para decisão da MPFA.

### Testes

- payload válido;
- inválido;
- layout desconhecido;
- duplicidade;
- reprocessamento;
- isolamento;
- vínculo CNJ;
- métricas de filtro.

Pare após prévia e aguarde aprovação.

---

# PROMPT 06 — Documentos e Microsoft 365

## Objetivo

Criar a camada documental desacoplada do fornecedor de storage.

## Prompt

Leia `AGENTS.md`, `CLAUDE.md` e `PROMPTS.md`.

Execute somente o **PROMPT 06**.

Implemente:

```text
documents
integrations/microsoft-365
```

Crie interface:

```text
DocumentStorage
```

E adapter preparado para:

```text
SharePoint / Microsoft Graph
```

O domínio não deve conhecer endpoints Graph.

### Documentos

Guardar no banco:

- metadata;
- owner/context;
- client;
- matter;
- origem;
- external_storage_id;
- versão;
- visibility;
- published_to_client;
- uploaded_by;
- timestamps.

O arquivo binário preferencialmente fica no storage corporativo, não diretamente no banco.

### Fluxos

Suportar:

- upload interno;
- documento vinculado ao processo;
- publicação ao cliente;
- recebimento de documento do cliente;
- histórico;
- rastreabilidade.

### Microsoft 365

Preparar integração para:

- SharePoint;
- OneDrive quando necessário;
- Outlook posteriormente.

Não exigir Microsoft para testes de domínio.

Use adapter fake apenas em testes automatizados, nunca para fingir integração de produção.

### Segurança

- validação de extensão/MIME;
- limite de tamanho;
- autorização;
- isolamento;
- logs;
- URLs temporárias quando aplicável.

Pare após prévia e aguarde aprovação.

---

# PROMPT 07 — Relatórios e Dashboards

## Objetivo

Transformar dados operacionais em visibilidade e entrega.

## Prompt

Leia `AGENTS.md`, `CLAUDE.md` e `PROMPTS.md`.

Execute somente o **PROMPT 07**.

Implemente:

```text
reports
dashboards
```

### Relatórios

Suportar:

- geração a partir dos dados operacionais;
- status;
- período;
- cliente;
- processo;
- responsável;
- revisão;
- aprovação;
- publicação.

Fluxo esperado:

```text
DRAFT
→ REVIEW
→ APPROVED
→ PUBLISHED
```

Não permitir publicação ao cliente sem estado aprovado.

### Dashboards

Criar queries/read models para:

- processos;
- tarefas;
- horas;
- relatórios;
- publicações;
- filtros Webjur;
- pendências.

Não duplicar regra de negócio dentro de queries de dashboard.

### Performance

- paginação;
- índices;
- queries observáveis;
- evitar N+1;
- testar volume razoável.

Pare após prévia e aguarde aprovação.

---

# PROMPT 08 — Portal do Cliente

## Objetivo

Construir a principal camada de experiência externa da Plataforma MPFA.

## Prompt

Leia `AGENTS.md`, `CLAUDE.md` e `PROMPTS.md`.

Execute somente o **PROMPT 08**.

Implemente o Portal do Cliente com segurança como requisito primário.

### O cliente poderá acessar somente:

- seus próprios processos liberados;
- relatórios publicados;
- documentos publicados;
- solicitações;
- atualizações explicitamente visíveis;
- informações que a MPFA decidir disponibilizar.

### Nunca expor:

- notas internas;
- comentários internos;
- tarefas internas;
- publicações não triadas;
- horas não autorizadas;
- outros clientes;
- documentos internos;
- dados técnicos.

### Regra obrigatória

Acesso deve verificar:

```text
permission
AND organization_id
AND client_id
AND ownership
AND published_to_client
```

### Capacidade inicial

Preparar limite comercial/configurável de até:

```text
20 clientes com portal ativo
```

Não hardcode o limite em regra de domínio sem configuração.

### Funcionalidades iniciais

- dashboard do cliente;
- processos;
- relatórios;
- documentos;
- solicitações;
- atualizações;
- histórico de documentos;
- ponte documental cliente ↔ MPFA.

### Teste de segurança obrigatório

Tentar acessar recurso de outro cliente e comprovar negação.

Pare após mostrar screenshots desktop e mobile e aguarde aprovação.

---

# PROMPT 09 — Comunicações e Newsletter com IA

## Objetivo

Criar comunicação assistida mantendo revisão humana.

## Prompt

Leia `AGENTS.md`, `CLAUDE.md` e `PROMPTS.md`.

Execute somente o **PROMPT 09**.

Implemente:

```text
communications
newsletter
```

### Comunicações

Preparar fluxo:

```text
evento operacional
→ conteúdo preparado
→ REVIEW_REQUIRED
→ aprovação
→ envio/publicação
→ histórico
```

Integração futura/real com Outlook deve ocorrer por adapter Microsoft 365.

### Newsletter com IA

Criar estrutura para:

- critérios;
- fontes;
- edições;
- geração;
- revisão;
- aprovação;
- histórico.

Os critérios e parâmetros serão fornecidos e homologados pela diretoria.

Não invente critérios.

Fluxo obrigatório:

```text
critérios aprovados
→ seleção
→ IA gera rascunho
→ REVIEW_REQUIRED
→ responsável revisa
→ APPROVED
→ distribuição
```

Nenhuma publicação automática sem aprovação humana na primeira versão.

Secrets de providers de IA nunca entram no repo.

Pare após prévia e aguarde aprovação.

---

# PROMPT 10 — Hardening de Produção

## Objetivo

Preparar a plataforma para operação confiável antes do primeiro deploy real.

## Prompt

Leia `AGENTS.md`, `CLAUDE.md` e `PROMPTS.md`.

Execute somente o **PROMPT 10**.

Faça revisão de produção de:

- segurança;
- autenticação;
- autorização;
- isolamento organizacional;
- portal;
- headers;
- CORS;
- rate limiting;
- uploads;
- secrets;
- migrations;
- índices;
- performance;
- filas;
- retry;
- dead-letter;
- logs;
- observabilidade;
- backup;
- restore;
- healthcheck;
- graceful shutdown.

### Testes

Executar:

- unit;
- integration;
- E2E relevantes;
- tentativa de acesso cross-tenant;
- tentativa de privilege escalation;
- falha de PostgreSQL;
- falha de Redis;
- job com retry;
- migration em banco limpo;
- restore de backup em ambiente isolado.

Gerar relatório de readiness.

Não fazer deploy.

Pare após prévia e aguarde aprovação.

---

# PROMPT 11 — Deploy Inicial na VPS Cadete.Tech

## Objetivo

Subir a primeira produção em infraestrutura própria sem criar dependência dela.

## Prompt

Leia `AGENTS.md`, `CLAUDE.md` e `PROMPTS.md`.

Execute somente o **PROMPT 11**.

Pré-condição: PROMPT 10 aprovado.

### Requisitos

- Docker;
- configuração externa;
- secrets fora do Git;
- TLS;
- domínio configurável;
- persistência;
- PostgreSQL;
- Redis;
- workers;
- migrations;
- backup automático;
- logs;
- healthchecks;
- restart policy;
- staging separado de production.

Se Coolify estiver sendo usado, documentar o processo sem acoplar o código ao Coolify.

### Antes do deploy

Mostrar:

- plano;
- variáveis necessárias sem valores secretos;
- volumes;
- portas;
- estratégia de rollback;
- backup inicial;
- checklist.

**Não executar deploy antes da aprovação explícita.**

Após aprovação, executar e validar:

- aplicação;
- API;
- banco;
- Redis;
- worker;
- healthcheck;
- migration;
- smoke tests;
- backup.

---

# PROMPT 12 — Runbook de Migração para VPS MPFA

## Objetivo

Garantir que a aplicação possa sair da VPS Cadete.Tech e ser instalada na infraestrutura do cliente sem alteração de código.

## Prompt

Leia `AGENTS.md`, `CLAUDE.md` e `PROMPTS.md`.

Execute somente o **PROMPT 12**.

Crie e teste um runbook de migração.

Fluxo esperado:

```text
inventário
→ preparar destino
→ backup
→ verificar backup
→ restore no destino
→ executar migrations necessárias
→ validar secrets/config
→ subir aplicação
→ smoke test
→ sincronização/cutover
→ DNS
→ validação
→ observação
→ rollback se necessário
```

Documentar:

- pré-requisitos;
- volumes;
- banco;
- Redis;
- arquivos;
- secrets;
- DNS;
- TLS;
- backup;
- restore;
- downtime esperado;
- rollback;
- validação pós-migração.

Sempre que possível, simular o processo em ambiente isolado antes da migração real.

---

# PROMPT 13 — Financeiro / Administrativo

## STATUS

```text
BLOCKED — DISCOVERY_REQUIRED
```

## Regra

Não implementar módulo financeiro antes da entrevista com a área financeiro/administrativa e demais usuários indicados pela diretoria.

Após discovery:

1. documentar AS-IS;
2. listar rotinas do ADVWIN utilizadas;
3. identificar controles externos;
4. mapear dados;
5. mapear permissões;
6. mapear relatórios;
7. mapear integrações;
8. validar regras com usuários;
9. atualizar este prompt;
10. somente depois iniciar código.

É proibido inventar:

- contas a pagar;
- contas a receber;
- faturamento;
- cobrança por hora;
- emissão fiscal;
- centro de custo;
- regras financeiras;

sem evidência de que fazem parte da operação desejada.

---

# Ordem oficial de execução

```text
01 Foundation
   ↓
02 IAM / Organizations / Audit
   ↓
03 Clients / Matters
   ↓
04 Tasks / Calendar / Time Entries
   ↓
05 Webjur / Publications / Filters
   ↓
06 Documents / Microsoft 365
   ↓
07 Reports / Dashboards
   ↓
08 Client Portal
   ↓
09 Communications / Newsletter
   ↓
10 Production Hardening
   ↓
11 Deploy VPS Cadete.Tech
   ↓
12 Migration Runbook VPS MPFA

13 Financial
   ↓
Somente após discovery
```

---

# Regra final

Este roadmap é uma referência de execução, não autorização para implementar tudo de uma vez.

**Execute uma fase por vez.**

Cada fase termina em:

```text
implementação
→ testes
→ evidência
→ prévia
→ aprovação
→ commit
```

Somente depois da aprovação deve-se avançar para a próxima fase.
