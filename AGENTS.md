# AGENTS.md — Diretrizes de Desenvolvimento da Plataforma MPFA

Instruções permanentes para qualquer agente de desenvolvimento atuando neste repositório.
Leia este arquivo **antes de qualquer alteração** e siga-o em todas as entregas.
Este arquivo deve permanecer funcionalmente idêntico ao `CLAUDE.md`.

> Objetivo: construir uma plataforma empresarial confiável, auditável, segura, testável e portável entre ambientes, sem overengineering e sem sacrificar clareza arquitetural.

---

## 0. Princípios inegociáveis

1. **Clareza antes de volume de código.** Código simples, explícito e previsível é preferível a abstrações inteligentes.
2. **Regra de negócio não vive em UI, controller ou integração externa.**
3. **Toda entrada externa é não confiável até ser validada.**
4. **Toda alteração relevante precisa ser testável, rastreável e reversível quando aplicável.**
5. **Produção não é ambiente de experimento.** Nunca alterar dados, schema, configuração ou deploy produtivo sem gate explícito de aprovação.
6. **Segurança e auditoria nascem com o sistema**, não são adicionadas no final.
7. **A arquitetura deve ser portável.** O sistema será hospedado inicialmente na VPS da Cadete.Tech e futuramente poderá migrar para infraestrutura da MPFA sem reescrita da aplicação.
8. **Não presumir regra ainda não descoberta.** Em especial, financeiro/administrativo permanece sujeito a discovery.
9. **Sem mérito jurídico.** O sistema organiza operação, informação, produtividade, comunicação e experiência; decisões jurídicas permanecem humanas.
10. **Nenhuma IA publica conteúdo externo automaticamente por padrão.** Saída de IA destinada a cliente/público exige revisão humana até decisão explícita em contrário.

---

## 1. Economia de código — não gere o que não é necessário

- Antes de escrever, procure o que já existe no repositório e reuse/estenda.
- Faça o **menor diff que resolve o pedido**.
- Não refatore, renomeie ou “melhore de passagem” o que não faz parte da unidade de trabalho.
- Aplique YAGNI: não crie factory, strategy, adapter, flag ou parametrização para hipótese sem uso real.
- Exceção: fronteiras externas e preocupações transversais **devem** ter abstração quando isso protege o domínio de fornecedor/infraestrutura. Exemplos: Webjur, Microsoft Graph, storage, e-mail, IA.
- Não adicione dependência se biblioteca padrão ou dependência já presente resolve.
- Dependência nova exige justificativa curta na entrega.
- Remova código tornado obsoleto pela própria alteração. Não deixe código comentado “por segurança”.
- Mantenha lockfile versionado e não atualize dependências sem necessidade da tarefa.

---

## 2. Baseline arquitetural do projeto

A arquitetura padrão é **monólito modular**, preparada para extração futura de serviços se houver necessidade real.

Não iniciar com microserviços.

### 2.1 Stack de referência

Enquanto o repositório não definir outra decisão por ADR:

- **Frontend:** Next.js + React + TypeScript
- **Backend:** NestJS + TypeScript
- **Banco:** PostgreSQL
- **ORM / migrations:** Prisma
- **Jobs assíncronos:** Redis + BullMQ
- **API:** REST + OpenAPI
- **Validação:** Zod e invariantes de domínio
- **Containers:** Docker
- **Deploy inicial:** VPS + Coolify
- **CI:** GitHub Actions
- **Testes:** unitário + integração + E2E onde fizer sentido
- **Observabilidade:** logs estruturados desde o início; Sentry/OpenTelemetry quando o ambiente exigir

Mudança de stack exige ADR quando tiver impacto estrutural.

### 2.2 Estrutura de alto nível esperada

```text
/
├── apps/
│   ├── web/                 # Next.js
│   ├── api/                 # NestJS
│   └── worker/              # jobs assíncronos quando necessário
│
├── packages/
│   ├── contracts/           # contratos compartilhados, sem acoplar ORM ao frontend
│   ├── validation/          # schemas realmente compartilhados
│   ├── config/              # carregamento/validação de configuração
│   ├── logger/              # logging estruturado
│   └── testing/             # helpers de teste, apenas se houver reutilização real
│
├── infrastructure/
│   ├── docker/
│   ├── coolify/
│   ├── scripts/
│   └── monitoring/
│
├── docs/
│   ├── architecture/
│   ├── adr/
│   ├── api/
│   ├── database/
│   ├── security/
│   └── runbooks/
│
└── .github/workflows/
```

Não crie diretório vazio apenas para “completar arquitetura”. Crie quando houver conteúdo real.

---

## 3. Organização por domínio — módulos independentes por responsabilidade

O backend deve ser organizado por **módulo de negócio**, não por pasta técnica global com tudo misturado.

Módulos previstos:

```text
modules/
├── iam/
├── organizations/
├── users/
├── clients/
├── matters/
├── publications/
├── webjur-filters/
├── tasks/
├── calendar/
├── time-entries/
├── documents/
├── reports/
├── client-portal/
├── communications/
├── integrations/
├── audit/
├── system-admin/
├── newsletter/
└── financial/               # somente após discovery
```

### 3.1 Estrutura interna de um módulo

Use apenas as pastas necessárias ao módulo, mantendo a separação lógica:

```text
<module>/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── errors/
│   └── repositories/
├── application/
│   ├── use-cases/
│   ├── commands/
│   ├── queries/
│   └── dto/
├── infrastructure/
│   ├── persistence/
│   └── adapters/
└── presentation/
    ├── controllers/
    └── schemas/
```

Não crie camada pass-through sem responsabilidade real.

---

## 4. Fronteiras de responsabilidade

- **Presentation:** HTTP, serialização, status code, autenticação extraída do request, validação superficial de entrada.
- **Application:** coordenação de caso de uso, autorização contextual, transações e chamadas a portas do domínio/infra.
- **Domain:** regras, invariantes, estados válidos, entidades e value objects.
- **Infrastructure:** banco, filas, Microsoft Graph, Webjur, storage, e-mail, IA, observabilidade.

É proibido:

- SQL/Prisma direto no frontend;
- regra de negócio no controller;
- chamada crua a Webjur/Microsoft/IA espalhada pela aplicação;
- retornar model do Prisma como contrato público da API;
- acessar variável de ambiente diretamente em qualquer arquivo aleatório;
- capturar exceção e ignorar.

---

## 5. Multiempresa preparada, sem transformar o sistema em SaaS prematuramente

O sistema nasce para a MPFA, mas deve evitar acoplamento irreversível a uma única organização.

- Entidades de negócio relevantes devem possuir `organization_id` quando aplicável.
- O contexto da organização deve ser resolvido na autenticação/request e propagado explicitamente.
- Toda consulta de dado de negócio deve ser escopada por organização.
- Não implementar billing multi-tenant, provisionamento automático ou painel SaaS enquanto não houver necessidade real.
- Não usar nome “MPFA” como chave técnica em tabelas, regras ou código quando o conceito correto for organização/tenant.

---

## 6. Identidade, autenticação e autorização

### 6.1 Perfis-base conhecidos

Perfis são ponto de partida, não a regra final de autorização:

- `SUPER_ADMIN`
- `MPFA_MANAGER`
- `LAWYER`
- `CLIENT`
- `FINANCIAL` — **provisório; não implementar regra funcional até discovery**

### 6.2 Autorização

Preferir **RBAC + escopo de recurso**.

Exemplos de permissões:

```text
matter.read
matter.create
matter.update
publication.review
time_entry.create
time_entry.read
client_portal.publish
user.access.update
audit.read
```

Regras obrigatórias:

- não espalhar `if (role === ...)` pela aplicação;
- centralizar mapeamento de role → permissions;
- além da permissão, validar ownership/escopo;
- cliente só acessa dados da própria organização/cliente e conteúdo explicitamente publicado;
- Gestão MPFA pode redefinir acessos existentes conforme regra, mas não cria Super Admin nem eleva alguém acima do próprio limite;
- ações sensíveis devem gerar auditoria.

---

## 7. Validação em três níveis

### 7.1 Entrada

Validar payload, query params, headers e env com schema explícito.

Exemplos:

- UUID válido;
- datas válidas;
- campos obrigatórios;
- limite de tamanho;
- enum conhecido;
- formato de e-mail.

### 7.2 Domínio

A entidade/caso de uso valida invariantes reais.

Exemplos:

- recurso pertence à organização correta;
- transição de status é permitida;
- usuário possui acesso ao cliente/processo;
- objeto referenciado existe e está ativo.

### 7.3 Integrações

Payload externo sempre passa por schema/versionamento antes de entrar no domínio.

Exemplo:

```text
WEBJUR_API_V1
WEBJUR_EMAIL_V1
```

Estados recomendados para ingestão externa:

```text
VALID
SUSPICIOUS
INVALID
```

Falha de integração nunca pode resultar em perda silenciosa.

---

## 8. Banco de dados e integridade

- Schema muda somente via migration versionada.
- **Não usar `prisma db push` em produção.**
- Migration destrutiva exige plano de rollback/mitigação e aprovação.
- Use constraints de banco para invariantes estruturais: `NOT NULL`, FK, unique, check quando aplicável.
- Índices devem acompanhar padrões reais de consulta; não indexar “por precaução” sem motivo.
- Use transação para operações que precisam ser atômicas.
- Registros críticos não devem ser apagados fisicamente por padrão.
- Preferir `deleted_at`, `archived_at` ou estado explícito quando histórico é relevante.
- Não guardar dado derivado se puder ser calculado de forma segura, salvo necessidade de performance/auditoria documentada.
- IDs públicos devem preferencialmente ser UUID; não exponha sequencial interno sem motivo.

### 8.1 Dados sensíveis

- Não registrar documento completo, conteúdo jurídico, token, senha ou segredo em log.
- Não duplicar conteúdo sensível sem necessidade operacional.
- Toda consulta privilegiada deve ser justificável por regra de acesso e auditável.

---

## 9. Auditoria obrigatória

A auditoria deve existir desde a fundação.

Eventos relevantes incluem:

```text
USER_ACCESS_CHANGED
USER_DISABLED
DOCUMENT_SHARED
DOCUMENT_REMOVED
TIME_ENTRY_CREATED
TIME_ENTRY_UPDATED
REPORT_PUBLISHED
PUBLICATION_REVIEWED
CLIENT_PORTAL_ACCESSED
INTEGRATION_CONFIG_CHANGED
```

Um registro de auditoria deve conter, quando aplicável:

```text
id
organization_id
actor_user_id
action
resource_type
resource_id
before_data
after_data
ip_address
user_agent
correlation_id
created_at
```

- Auditoria não substitui log técnico.
- Não grave segredo dentro de `before_data`/`after_data`.
- Alteração de auditoria deve ser restrita; preferir append-only no nível da aplicação.

---

## 10. Integrações externas — adapters obrigatórios

O domínio não pode depender diretamente de SDK/API de fornecedor.

Exemplos de portas:

```text
PublicationSource
DocumentStorage
MailProvider
CalendarProvider
AiProvider
```

Implementações possíveis:

```text
PublicationSource
├── WebjurApiPublicationSource
└── WebjurEmailPublicationSource

DocumentStorage
├── SharePointDocumentStorage
└── Local/S3-compatible adapter, se necessário
```

### 10.1 Webjur

- Priorizar integração oficial ferramenta → ferramenta: API, webservice, webhook ou formato estruturado fornecido pelo Webjur.
- Enquanto isso não for confirmado, e-mail estruturado é contingência conhecida.
- Parser de e-mail deve ser versionado.
- Armazenar referência/origem bruta suficiente para auditoria e reprocessamento, respeitando segurança e retenção.
- Implementar idempotência e deduplicação.
- Mudança de layout deve gerar erro visível/alerta, nunca ingestão parcial silenciosa.
- O módulo de gestão de filtros deve permanecer separado da implementação específica de transporte.

### 10.2 Microsoft 365

- Integrações via Microsoft Graph ficam em adapter específico.
- SharePoint é preferível como repositório documental corporativo quando homologado.
- Outlook pode receber eventos/rascunhos, mas o contexto operacional permanece na plataforma.
- Não importar calendário pessoal inteiro por padrão.

### 10.3 IA / Newsletter

- `AiProvider` deve isolar fornecedor/modelo.
- Prompt, critérios e versão usados na geração devem ser rastreáveis quando a saída tiver uso operacional.
- Newsletter segue critérios aprovados pela diretoria.
- Estado inicial obrigatório: `REVIEW_REQUIRED`.
- Sem envio automático externo na primeira versão.

---

## 11. Jobs assíncronos, filas e idempotência

Use worker/fila quando a tarefa for lenta, reprocessável ou depender de terceiro.

Candidatos:

```text
webjur.publication.import
report.generate
document.process
email.prepare
newsletter.generate
notification.send
```

Cada job relevante deve possuir:

- identificador;
- correlation id;
- status;
- número de tentativas;
- retry com backoff quando apropriado;
- erro final visível;
- idempotency key quando houver risco de duplicação;
- mecanismo de reprocessamento controlado.

Não mantenha request HTTP aberto esperando tarefa longa se puder processar assíncronamente.

---

## 12. Erros e comportamento de falha

- Erros de domínio devem ser explícitos e tipados.
- Controller não deve expor stack trace ou detalhe interno ao cliente.
- Mapear erros conhecidos para códigos HTTP coerentes.
- Erro inesperado deve possuir `request_id/correlation_id` para investigação.
- Nunca retornar `200` quando operação falhou parcialmente sem contrato explícito que represente isso.
- Não usar `try/catch` genérico apenas para “não quebrar”.
- Não usar `@ts-ignore`, `any`, cast forçado ou suppress sem justificativa técnica forte e registrada.

---

## 13. Configuração, secrets e portabilidade entre VPS

O deploy inicial será na VPS da Cadete.Tech e poderá migrar para VPS/infraestrutura da MPFA.

Portanto:

- nenhuma URL, IP, domínio, caminho local ou credencial pode ser hardcoded;
- configuração deve vir de env/config validada no startup;
- `.env.example` deve listar chaves sem valores sensíveis;
- secrets nunca entram no Git;
- Docker image deve ser reproduzível e independente do host;
- banco, Redis, storage e URLs externas devem ser configuráveis;
- volumes persistentes precisam estar documentados;
- DNS/TLS/reverse proxy são infraestrutura, não regra da aplicação;
- a aplicação deve subir em nova VPS trocando configuração, não código.

### 13.1 Ambientes

Manter separados:

```text
local
staging
production
```

Cada ambiente possui:

- banco próprio;
- Redis próprio quando aplicável;
- secrets próprios;
- URLs próprias;
- integração externa em modo adequado ao ambiente.

Nunca testar migration ou feature diretamente em produção.

---

## 14. Deploy e migração de infraestrutura

### 14.1 Deploy

Fluxo esperado:

```text
feature/*
  ↓
PR
  ↓
CI
  ↓
main
  ↓
staging
  ↓
validação
  ↓
produção com aprovação explícita
```

Para operação individual, PR pode ser auto-revisão estruturada, mas CI continua obrigatório.

### 14.2 Migração da VPS Cadete.Tech → VPS MPFA

A arquitetura deve permitir migração controlada com:

1. inventário de serviços e versões;
2. backup consistente do PostgreSQL;
3. backup/replicação dos volumes necessários;
4. exportação segura de configuração sem expor secrets;
5. provisionamento do novo ambiente;
6. restore em staging/novo host;
7. migrations aplicadas de forma controlada;
8. smoke tests;
9. janela de corte quando necessária;
10. troca de DNS/endpoint;
11. validação pós-corte;
12. plano de rollback até confirmação final.

Nunca dependa de estado manual não documentado na VPS atual.

---

## 15. Backup, restore e continuidade

Backup só é confiável se já foi restaurado em teste.

Baseline inicial:

- backup diário do PostgreSQL;
- retenção sugerida: 7 diários, 4 semanais e 3 mensais, ajustável por infraestrutura/contrato;
- backup de volumes persistentes realmente necessários;
- criptografia e proteção de acesso ao backup;
- runbook de restore em `docs/runbooks/restore.md`;
- executar teste periódico de restauração e registrar resultado.

Quando SharePoint for repositório oficial do documento, não duplicar arquivo local sem necessidade; guardar metadados/IDs necessários à operação.

---

## 16. Observabilidade

Logs devem ser estruturados.

Contexto mínimo quando disponível:

```text
request_id
correlation_id
organization_id
user_id
module
operation
```

- níveis de log coerentes: debug/info/warn/error;
- nada de `console.log` perdido em produção;
- erro de integração deve conter fornecedor/operação, sem segredo ou conteúdo sensível;
- métricas/alertas devem ser adicionados onde houver valor operacional real;
- healthcheck deve validar ao menos aplicação e dependências críticas de forma segura.

---

## 17. Testes — pirâmide pragmática

Toda alteração precisa de teste proporcional ao risco.

### 17.1 Unitário

Use para:

- regra de negócio;
- value objects;
- cálculo;
- transição de estado;
- autorização isolada.

### 17.2 Integração

Use para:

- repository + PostgreSQL;
- migrations;
- integração interna entre módulos;
- fila/worker quando relevante;
- adapters usando mocks/fakes controlados ou sandbox oficial.

### 17.3 E2E

Use para fluxos críticos:

- login;
- permissões;
- criação/consulta de processo;
- lançamento de horas;
- publicação ao portal;
- fluxo documental importante.

### 17.4 Regras de teste

- Teste deve ser determinístico.
- Não depender de ordem de execução.
- Não depender de produção.
- Cobrir caminho feliz e borda relevante.
- Bug corrigido deve ganhar teste de regressão quando tecnicamente viável.

---

## 18. CI obrigatório

Antes de considerar uma unidade concluída, executar no mínimo:

```text
format/check
lint
typecheck
unit tests
integration tests relevantes
build
```

E E2E quando a mudança afetar fluxo crítico/UI.

Nenhuma entrega deve afirmar que “passou” sem mostrar resultado real do comando.

---

## 19. Frontend empresarial

- Componente visual não contém regra de negócio crítica.
- Estado do servidor não deve ser duplicado sem necessidade.
- Formulários usam schema de validação.
- Tela deve lidar explicitamente com loading, vazio, erro e sucesso.
- Acessibilidade básica é obrigatória: label, foco, teclado, contraste e semântica.
- Não esconder erro operacional relevante do usuário.
- Rotas e componentes respeitam permissão; **mas autorização real continua no backend**.
- Não usar dados mockados silenciosamente em ambiente integrado.

### 19.1 Portal do Cliente

Regras adicionais:

- nunca confiar apenas no frontend para filtrar cliente;
- backend deve impor `organization/client scope` e `published_to_client` ou regra equivalente;
- notas internas nunca podem vazar por serialização acidental;
- downloads de documento devem validar autorização no momento do acesso;
- toda publicação externa relevante deve ser auditável.

---

## 20. Documentação arquitetural e ADR

Decisão estrutural relevante deve gerar ADR em `docs/adr/`.

Formato mínimo:

```text
# ADR-XXX — Título

Status: proposed | accepted | superseded
Data: YYYY-MM-DD

## Contexto
## Decisão
## Alternativas consideradas
## Consequências
```

ADRs iniciais esperados quando as decisões forem confirmadas:

```text
ADR-001-modular-monolith.md
ADR-002-postgresql-prisma.md
ADR-003-auth-rbac-resource-scope.md
ADR-004-webjur-integration-boundary.md
ADR-005-document-storage.md
ADR-006-audit-log.md
ADR-007-multi-organization-readiness.md
ADR-008-deployment-portability.md
```

Não crie ADR para decisão trivial.

---

## 21. Rastro de alteração — comentários e histórico

- Comente o **porquê**, nunca o **quê**.
- Onde uma mudança corrige comportamento não óbvio, pode usar marcador rastreável:

```text
// [ALT YYYY-MM-DD] motivo: <razão> — antes: <comportamento anterior>
```

- Não use marcador em toda alteração; apenas onde ajuda manutenção futura.
- Código autoexplicativo não precisa de comentário narrativo.
- Commits seguem Conventional Commits:

```text
feat:
fix:
refactor:
chore:
docs:
test:
```

Um commit por unidade lógica.

---

## 22. Autocorreção — resolva sozinho, pergunte pouco

Ciclo obrigatório:

```text
implementar
→ executar
→ ler erro
→ corrigir causa raiz
→ repetir
→ apresentar evidência
```

Corrija sem perguntar:

- sintaxe;
- tipo;
- import;
- path;
- configuração local;
- dependência faltante necessária à tarefa;
- teste quebrado pela própria alteração.

Só pare e pergunte quando:

1. houver decisão de negócio ambígua com consequências reais;
2. a ação for destrutiva/irreversível;
3. envolver produção, credencial ou dado sensível;
4. houver trade-off relevante de arquitetura, segurança ou custo;
5. a regra ainda depender de discovery com a MPFA.

Fora disso, assuma o caminho razoável e registre a suposição.

---

## 23. Regras específicas para áreas ainda não descobertas

### 23.1 Financeiro / administrativo

Até concluir discovery:

- não implementar regra financeira real;
- não inventar status, cálculo, faturamento, cobrança ou permissão;
- pode existir placeholder/documentação `DISCOVERY_REQUIRED`;
- schema definitivo só após validação com usuários da área.

### 23.2 Webjur

Antes de fechar implementação de ingestão, confirmar com o fornecedor:

- API;
- webservice;
- webhook;
- exportação estruturada;
- autenticação;
- limites/rate limits;
- contrato de uso;
- identificadores estáveis;
- tratamento de duplicidade.

### 23.3 Migração do ADVWIN

Não presumir acesso direto ao banco.

Antes de migrar módulo/dado, mapear:

- origem;
- volume;
- formato;
- qualidade;
- regra de transformação;
- chave de reconciliação;
- validação pós-migração;
- rollback/contingência.

---

## 24. Definition of Done

Uma unidade de trabalho só está pronta para revisão quando:

- [ ] requisito atendido sem escopo extra;
- [ ] arquitetura do módulo respeitada;
- [ ] entradas externas validadas;
- [ ] autorização aplicada no backend;
- [ ] tratamento de erro explícito;
- [ ] auditoria adicionada se a operação exigir;
- [ ] migration criada/testada quando houve mudança de schema;
- [ ] testes relevantes passando;
- [ ] lint/typecheck/build passando;
- [ ] sem secrets ou dados sensíveis em código/log;
- [ ] documentação/ADR atualizada quando aplicável;
- [ ] preview/evidência produzida;
- [ ] nenhuma ação de commit/push/deploy feita antes do OK final do Leo.

---

## 25. Prévia antes da aprovação final

Nada é concluído sem prévia.

### Alteração visual

Mostrar screenshot real renderizado.

Preferir Playwright/Puppeteer contra a rota e estado afetados.

Quando relevante, mostrar estados:

- desktop;
- mobile;
- vazio;
- preenchido;
- sucesso;
- erro.

### Alteração não visual

Mostrar:

- diff resumido;
- comandos executados;
- saída real;
- testes;
- evidência de comportamento.

A aprovação final é o gate para commit/push/merge/deploy.

---

## 26. Formato da entrega — sempre

Responder nesta ordem:

1. **O que mudou e por quê** — curto.
2. **Arquivos tocados**.
3. **Suposições assumidas** — se houve.
4. **Migrations / impacto de dados** — se houve.
5. **Teste executado + resultado real**.
6. **Segurança / auditoria / rollback** — quando aplicável.
7. **Prévia** — screenshots ou evidência de execução.
8. **Mensagem(ns) de commit propostas** — aplicar somente após aprovação.

Sem preâmbulo desnecessário.
Não pedir confirmação para rotina durante a execução.
A única parada obrigatória é a aprovação final sobre a prévia, salvo risco destrutivo, produção, segredo, decisão de negócio ou trade-off estrutural relevante.

---

## 27. Proibições explícitas

Nunca:

- expor secret, token ou senha em código, log, print ou resposta;
- conectar teste automatizado ao banco de produção;
- rodar migration destrutiva em produção sem aprovação e plano de rollback;
- fazer deploy automático de produção sem gate explícito;
- confiar em autorização apenas no frontend;
- silenciar erro para fazer pipeline passar;
- usar dado real sensível em fixture quando dado sintético resolve;
- acoplar domínio diretamente a Webjur, Microsoft Graph ou provedor de IA;
- implementar regra financeira ainda não descoberta;
- remover funcionalidade do ADVWIN antes de substituto estar homologado;
- publicar newsletter/relatório/comunicação gerada por IA sem revisão humana na fase inicial.

---

## 28. Prioridade inicial de construção

Salvo decisão posterior por ADR ou discovery, a ordem recomendada é:

```text
1. Foundation / config / logging / healthcheck
2. PostgreSQL + migrations + organização base
3. IAM / autenticação / permissões
4. Auditoria
5. Clientes
6. Processos / pastas
7. Tarefas / agenda
8. Horas / apontamentos
9. Publicações + fronteira Webjur
10. Gestão de filtros Webjur
11. Documentos
12. Relatórios
13. Portal do Cliente
14. Microsoft 365
15. Newsletter assistida por IA
16. Financeiro / administrativo após discovery
```

O objetivo é construir primeiro a **espinha dorsal confiável do produto**, e só depois aumentar superfície funcional.

