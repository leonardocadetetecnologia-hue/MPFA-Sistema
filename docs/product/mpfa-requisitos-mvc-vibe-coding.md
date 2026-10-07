# MPFA Advogados — Requisitos Funcionais, Não Funcionais e Arquitetura MVC

**Projeto:** Ficha-Tempo Assistida / Camada Operacional MPFA  
**Objetivo:** reduzir esforço manual, padronizar lançamentos e criar rastreabilidade antes de qualquer automação direta no ADVWIN+.  
**Status:** especificação para piloto / vibe coding  
**Premissa central:** a primeira versão NÃO deve depender de API, banco de dados ou automação direta do ADVWIN+, pois esses acessos ainda não foram confirmados.

---

# 1. Contexto

O processo observado no ADVWIN+ exige que a usuária:

1. acesse o sistema;
2. navegue para **Pastas > Consultivo**;
3. pesquise cliente/pasta;
4. localize o registro correto;
5. abra a ação **Ficha-Tempo**;
6. revise ou preencha descrição;
7. selecione o tipo de serviço;
8. informe horas e horas cobráveis;
9. salve o lançamento;
10. confira se o registro foi efetivamente persistido.

Foram observados carregamentos recorrentes e erros de interface no ADVWIN+, portanto a solução deve começar como uma camada externa de captura, padronização, conferência e rastreabilidade.

---

# 2. Objetivo do MVP

Criar uma aplicação web interna que permita registrar rapidamente atividades durante o dia, padronizar as informações necessárias à Ficha-Tempo, revisar os lançamentos e organizar uma fila pronta para posterior lançamento no ADVWIN+.

O MVP deve resolver quatro problemas:

- dependência de memória para reconstrução das atividades;
- variação de descrições e classificações;
- ausência de fila visível de lançamentos pendentes;
- baixa rastreabilidade sobre o que foi capturado, revisado e lançado.

---

# 3. Escopo do MVP

## Incluído

- autenticação;
- cadastro básico de usuários;
- cadastro/importação de clientes e pastas;
- cadastro de tipos de serviço;
- modelos de descrição;
- captura rápida de atividade;
- cronômetro opcional;
- lançamento manual de duração;
- indicação de horas cobradas;
- fila de pendências;
- revisão e aprovação;
- edição antes da aprovação;
- marcação de item como lançado no ADVWIN;
- histórico/auditoria;
- filtros e busca;
- dashboard operacional;
- exportação estruturada;
- arquitetura preparada para integração futura.

## Fora do escopo inicial

- automação por clique no ADVWIN+;
- integração direta com banco do ADVWIN;
- API ADVWIN não confirmada;
- análise jurídica;
- geração de conteúdo jurídico;
- interpretação de prazos legais;
- tomada de decisão jurídica;
- alteração automática de registros no ADVWIN;
- sincronização bidirecional sem homologação.

---

# 4. Perfis de usuário

## 4.1 Usuário Operacional

Pode:

- criar atividades;
- editar atividades próprias enquanto não aprovadas;
- iniciar/parar cronômetro;
- consultar sua fila;
- submeter itens para revisão;
- visualizar histórico próprio.

## 4.2 Revisor

Pode:

- visualizar itens submetidos;
- corrigir classificação;
- corrigir descrição;
- ajustar horas;
- aprovar;
- rejeitar;
- devolver ao usuário com motivo;
- marcar lançamento como realizado no ADVWIN.

## 4.3 Administrador

Pode:

- gerenciar usuários;
- gerenciar clientes e pastas;
- gerenciar tipos de serviço;
- gerenciar modelos de descrição;
- configurar regras;
- consultar auditoria global;
- exportar dados;
- gerenciar parâmetros de integração futura.

---

# 5. Requisitos Funcionais

## RF-001 — Autenticação

O sistema deve permitir autenticação segura de usuários autorizados.

### Critérios de aceite

- usuário não autenticado não acessa a aplicação;
- sessão expirada exige novo login;
- usuário desativado não consegue entrar.

---

## RF-002 — Controle de acesso por perfil

O sistema deve aplicar permissões conforme o perfil:

- Operacional;
- Revisor;
- Administrador.

### Critérios de aceite

- Operacional não acessa configurações administrativas;
- somente Revisor ou Administrador pode aprovar;
- somente Administrador pode alterar tabelas de domínio.

---

## RF-003 — Cadastro de usuários

O Administrador deve poder:

- cadastrar;
- editar;
- ativar;
- desativar usuários;
- atribuir perfil.

Campos mínimos:

- nome;
- e-mail;
- perfil;
- status.

---

## RF-004 — Cadastro de clientes

O sistema deve possuir cadastro de clientes para associação aos lançamentos.

Campos mínimos:

- identificador interno;
- nome;
- status;
- identificador externo opcional.

---

## RF-005 — Cadastro de pastas

O sistema deve permitir cadastrar ou importar pastas relacionadas a clientes.

Campos mínimos:

- código da pasta;
- cliente;
- descrição curta;
- setor;
- responsável;
- status;
- identificador externo opcional.

### Regra

Uma pasta deve estar associada a um cliente.

---

## RF-006 — Importação de clientes e pastas

O sistema deve permitir importação por CSV/XLSX na primeira fase.

### Requisitos

- validar colunas obrigatórias;
- impedir duplicidade pelo identificador definido;
- apresentar relatório de importação;
- informar linhas rejeitadas;
- permitir correção e reprocessamento.

---

## RF-007 — Tipos de serviço

O sistema deve possuir catálogo de tipos de serviço.

Exemplos inicialmente observados:

- Análise;
- Audiência;
- Consultoria;
- Contato;
- Elaboração.

O catálogo deve ser administrável.

---

## RF-008 — Modelos de descrição

O Administrador deve cadastrar modelos padronizados de descrição.

Cada modelo pode conter:

- título;
- texto-base;
- tipo de serviço;
- palavras-chave;
- status;
- instruções de preenchimento.

---

## RF-009 — Captura rápida de atividade

O usuário deve conseguir criar um lançamento rapidamente.

Campos mínimos:

- data;
- cliente;
- pasta;
- tipo de serviço;
- descrição;
- duração;
- horas cobradas;
- observação opcional.

### Critério de experiência

O fluxo principal deve ser concluído sem navegação por múltiplas telas.

---

## RF-010 — Cronômetro

O sistema deve permitir:

- iniciar cronômetro;
- pausar;
- retomar;
- finalizar;
- converter tempo medido em duração do lançamento.

### Regras

- um usuário não pode manter dois cronômetros ativos simultaneamente;
- pausa não conta como tempo trabalhado;
- o usuário pode corrigir manualmente a duração antes da submissão.

---

## RF-011 — Duração manual

O usuário deve poder informar duração sem usar cronômetro.

Formatos aceitos:

- HH:MM;
- minutos.

O sistema deve normalizar internamente para minutos.

---

## RF-012 — Horas cobradas

O sistema deve armazenar separadamente:

- duração trabalhada;
- duração cobrável.

### Regra

O sistema não deve presumir que os dois valores são sempre iguais.

---

## RF-013 — Status do lançamento

Cada lançamento deve possuir um status controlado.

Estados mínimos:

- `RASCUNHO`
- `PENDENTE_REVISAO`
- `DEVOLVIDO`
- `APROVADO`
- `PRONTO_ADVWIN`
- `LANCADO_ADVWIN`
- `CANCELADO`
- `ERRO_INTEGRACAO` — reservado para uso futuro

---

## RF-014 — Submissão para revisão

O usuário deve poder enviar um ou mais lançamentos para revisão.

Após submissão:

- o item fica bloqueado para alteração comum;
- alterações posteriores devem ser auditadas;
- o revisor recebe o item na fila.

---

## RF-015 — Fila de revisão

O Revisor deve visualizar lançamentos pendentes com filtros por:

- usuário;
- data;
- cliente;
- pasta;
- tipo;
- status.

A fila deve exibir:

- descrição;
- duração;
- horas cobradas;
- responsável;
- data;
- alertas de inconsistência.

---

## RF-016 — Aprovação

O Revisor deve poder aprovar um lançamento individualmente ou em lote.

Antes da aprovação o sistema deve validar:

- cliente informado;
- pasta válida;
- tipo de serviço;
- descrição;
- duração maior que zero;
- horas cobradas válidas.

---

## RF-017 — Devolução

O Revisor deve poder devolver um lançamento.

Obrigatório informar motivo.

O usuário deve visualizar claramente:

- motivo da devolução;
- data;
- revisor;
- campos alterados, se houver.

---

## RF-018 — Marcação de lançamento no ADVWIN

Na primeira fase, o sistema deve permitir marcar manualmente um item aprovado como lançado no ADVWIN.

Campos:

- data/hora;
- usuário executor;
- observação;
- identificador ADVWIN opcional;
- evidência opcional.

---

## RF-019 — Proteção contra duplicidade

Antes de marcar um lançamento como realizado, o sistema deve alertar para possíveis duplicidades.

Critérios mínimos para alerta:

- mesmo usuário;
- mesma data;
- mesma pasta;
- duração semelhante;
- descrição semelhante.

O alerta não deve bloquear automaticamente sem regra explícita.

---

## RF-020 — Dashboard do usuário

O dashboard deve exibir:

- horas capturadas hoje;
- horas cobradas hoje;
- rascunhos;
- pendentes de revisão;
- devolvidos;
- aprovados aguardando lançamento;
- lançados no ADVWIN.

---

## RF-021 — Dashboard de gestão

Para Revisor/Administrador:

- volume por período;
- horas por usuário;
- horas por cliente;
- horas por tipo de serviço;
- quantidade de devoluções;
- itens aguardando revisão;
- itens aprovados não lançados;
- tempo médio entre captura e aprovação;
- tempo médio entre aprovação e lançamento.

---

## RF-022 — Busca global

O sistema deve permitir busca por:

- cliente;
- pasta;
- descrição;
- usuário;
- código externo;
- status.

---

## RF-023 — Histórico de alterações

Toda alteração relevante deve registrar:

- entidade;
- registro;
- usuário;
- data/hora;
- valor anterior;
- valor novo;
- origem da alteração.

---

## RF-024 — Exportação

O sistema deve exportar lançamentos para CSV/XLSX.

Campos mínimos:

- data;
- usuário;
- cliente;
- pasta;
- tipo de serviço;
- descrição;
- duração;
- horas cobradas;
- status;
- data de aprovação;
- data de lançamento ADVWIN.

---

## RF-025 — Adaptador futuro de integração

O sistema deve possuir uma interface de integração desacoplada.

Implementações futuras possíveis:

- API;
- arquivo;
- banco autorizado;
- RPA;
- outro mecanismo homologado.

A aplicação principal não deve depender da tecnologia escolhida para integração.

---

## RF-026 — Registro de falhas futuras de integração

Quando houver integração, cada tentativa deve registrar:

- item;
- início;
- término;
- resultado;
- erro;
- quantidade de tentativas;
- referência externa;
- evidência.

---

## RF-027 — Parametrização

O Administrador deve conseguir configurar:

- tipos ativos;
- status de pasta aceitos;
- regras de duração;
- tolerância de duplicidade;
- campos obrigatórios;
- aprovação obrigatória ou não;
- comportamento de exportação.

---

# 6. Regras de Negócio

## RN-001

Nenhum lançamento pode ser aprovado com duração igual a zero.

## RN-002

Horas cobradas devem ser independentes da duração trabalhada.

## RN-003

Um lançamento em `LANCADO_ADVWIN` não pode ser apagado fisicamente.

## RN-004

Correções em item já marcado como lançado devem gerar nova versão ou evento de correção.

## RN-005

Registros devem usar exclusão lógica quando houver impacto de auditoria.

## RN-006

Descrição deve possuir quantidade mínima configurável de caracteres.

## RN-007

A aplicação deve solicitar confirmação antes de cancelar um lançamento.

## RN-008

O lançamento deve manter a referência da pasta e do cliente existente no momento da captura, mesmo que cadastros sejam alterados depois.

## RN-009

Importações devem ser idempotentes quando houver identificador externo confiável.

## RN-010

Não armazenar conteúdo jurídico desnecessário ao objetivo operacional.

---

# 7. Requisitos Não Funcionais

## RNF-001 — Segurança

- HTTPS obrigatório;
- autenticação segura;
- sessões protegidas;
- autorização no servidor;
- princípio do menor privilégio;
- nenhum segredo no frontend;
- variáveis sensíveis em ambiente seguro.

---

## RNF-002 — LGPD e minimização

O sistema deve armazenar apenas dados necessários ao processo operacional.

Evitar:

- peças processuais;
- conteúdo integral de documentos;
- informações pessoais desnecessárias;
- conteúdo jurídico sem relação com o lançamento de horas.

---

## RNF-003 — Auditoria

Operações críticas devem ser auditáveis e imutáveis logicamente.

Eventos mínimos:

- login;
- criação;
- edição;
- submissão;
- aprovação;
- devolução;
- cancelamento;
- marcação de lançamento ADVWIN;
- importação;
- alteração administrativa.

---

## RNF-004 — Performance

Metas iniciais:

- páginas comuns: resposta percebida inferior a 2 segundos em condições normais;
- busca: inferior a 1 segundo para volume de piloto;
- salvamento: inferior a 2 segundos;
- dashboard: inferior a 3 segundos.

---

## RNF-005 — Disponibilidade

Para piloto:

- disponibilidade alvo de 99,5% em horário comercial;
- falhas devem apresentar mensagem compreensível;
- nenhuma falha de interface deve produzir duplicidade silenciosa.

---

## RNF-006 — Responsividade

Deve funcionar em:

- desktop;
- notebook;
- tablet;
- celular.

Prioridade de UX: desktop e notebook.

---

## RNF-007 — Navegadores

Suporte mínimo:

- Chrome atual;
- Edge atual.

---

## RNF-008 — Usabilidade

- fluxo de captura em uma tela;
- atalhos de teclado quando possível;
- poucos campos visíveis por padrão;
- campos avançados escondidos quando não forem necessários;
- feedback imediato ao salvar;
- status visual claro.

---

## RNF-009 — Acessibilidade

- labels em campos;
- navegação por teclado;
- contraste adequado;
- mensagens de erro textuais;
- não depender apenas de cor.

---

## RNF-010 — Observabilidade

O sistema deve registrar:

- erros de aplicação;
- falhas de API;
- falhas de importação;
- falhas de integração futura;
- eventos críticos.

---

## RNF-011 — Backup

Dados de produção devem possuir:

- backup automático;
- retenção definida;
- procedimento de restauração testável.

---

## RNF-012 — Integridade

- chaves estrangeiras;
- constraints;
- validação no backend;
- transações para operações críticas;
- proteção contra dupla submissão.

---

## RNF-013 — Testabilidade

A aplicação deve permitir testes automatizados de:

- regras de negócio;
- permissões;
- mudanças de status;
- importação;
- proteção de duplicidade;
- aprovação;
- exportação.

---

## RNF-014 — Manutenibilidade

O código deve ser modular, tipado e organizado por domínio.

Evitar:

- regra de negócio dentro de componente visual;
- consultas diretas ao banco espalhadas pela aplicação;
- dependência direta de ADVWIN no domínio.

---

# 8. Arquitetura MVC para Vibe Coding

## 8.1 Stack sugerida

- **Frontend / View:** Next.js + React + TypeScript
- **UI:** Tailwind CSS + biblioteca de componentes consistente
- **Backend / Controller:** Server Actions e/ou Route Handlers
- **Model / Persistência:** PostgreSQL / Supabase
- **Auth:** Supabase Auth ou provedor equivalente
- **Validação:** Zod ou equivalente
- **Logs:** camada central de eventos
- **Deploy:** Vercel ou infraestrutura equivalente
- **Integrações futuras:** adapters independentes

> O MVC aqui é pragmático: a UI nunca deve conter a regra principal de negócio.

---

# 9. Separação MVC

## MODEL

Responsável por:

- entidades;
- persistência;
- regras de domínio;
- validações estruturais;
- repositórios.

Entidades principais:

- User
- Role
- Client
- Matter/Folder
- ServiceType
- DescriptionTemplate
- TimeEntry
- TimeEntryVersion
- Review
- AuditEvent
- ImportJob
- IntegrationJob

---

## VIEW

Telas:

1. Login
2. Dashboard
3. Captura rápida
4. Meu dia
5. Minhas pendências
6. Fila de revisão
7. Detalhe do lançamento
8. Clientes
9. Pastas
10. Tipos de serviço
11. Modelos de descrição
12. Importações
13. Relatórios
14. Auditoria
15. Configurações

---

## CONTROLLER

Responsável por:

- receber comandos da View;
- validar permissão;
- chamar serviços de aplicação;
- controlar transações;
- devolver resultado padronizado.

Controllers/Actions sugeridos:

- AuthController
- UserController
- ClientController
- MatterController
- ServiceTypeController
- TemplateController
- TimeEntryController
- ReviewController
- ImportController
- DashboardController
- ExportController
- IntegrationController
- AuditController

---

# 10. Camada de Serviços

Mesmo usando MVC, usar serviços para evitar regra de negócio no Controller.

Serviços sugeridos:

- `CreateTimeEntryService`
- `UpdateTimeEntryService`
- `StartTimerService`
- `StopTimerService`
- `SubmitTimeEntryService`
- `ApproveTimeEntryService`
- `ReturnTimeEntryService`
- `CancelTimeEntryService`
- `MarkAsAdvwinPostedService`
- `DetectDuplicateService`
- `ImportMattersService`
- `ExportTimeEntriesService`
- `CreateAuditEventService`

---

# 11. Estrutura de Pastas

```text
src/
  app/
    (auth)/
    (dashboard)/
    api/
  components/
    ui/
    time-entry/
    dashboard/
    review/
  controllers/
  services/
  domain/
    entities/
    enums/
    rules/
    errors/
  repositories/
    interfaces/
    supabase/
  integrations/
    advwin/
      AdvwinAdapter.ts
      ManualAdvwinAdapter.ts
      ApiAdvwinAdapter.ts
      RpaAdvwinAdapter.ts
  schemas/
  lib/
  hooks/
  types/
  tests/
```

---

# 12. Modelo de Dados Inicial

## users

- id
- name
- email
- role
- active
- created_at
- updated_at

## clients

- id
- external_id
- name
- active
- created_at
- updated_at

## matters

- id
- external_id
- code
- client_id
- description
- sector
- responsible_user_id
- status
- active
- created_at
- updated_at

## service_types

- id
- name
- active
- created_at
- updated_at

## description_templates

- id
- title
- content
- service_type_id
- keywords
- active
- created_at
- updated_at

## time_entries

- id
- user_id
- client_id
- matter_id
- service_type_id
- entry_date
- description
- worked_minutes
- billable_minutes
- status
- started_at
- ended_at
- submitted_at
- approved_at
- approved_by
- advwin_posted_at
- advwin_posted_by
- advwin_reference
- created_at
- updated_at

## reviews

- id
- time_entry_id
- reviewer_id
- action
- reason
- created_at

## audit_events

- id
- entity
- entity_id
- action
- user_id
- old_data
- new_data
- source
- created_at

## import_jobs

- id
- type
- filename
- status
- total_rows
- success_rows
- error_rows
- created_by
- created_at
- finished_at

## integration_jobs

- id
- time_entry_id
- adapter
- status
- attempts
- external_reference
- error_message
- started_at
- finished_at

---

# 13. Fluxo Principal

```text
[Usuário registra atividade]
        |
        v
     RASCUNHO
        |
        v
[Pendente de revisão]
        |
        +--------------------+
        |                    |
        v                    v
    DEVOLVIDO             APROVADO
        |                    |
        |                    v
        +------------> PRONTO_ADVWIN
                              |
                              v
                       LANCADO_ADVWIN
```

---

# 14. Fluxo de Captura Ideal

```text
Cliente
   ↓
Pasta
   ↓
Tipo de serviço
   ↓
Modelo de descrição
   ↓
Descrição final
   ↓
Tempo trabalhado
   ↓
Tempo cobrável
   ↓
Salvar
```

A interface deve tentar preencher automaticamente tudo que puder a partir da seleção anterior.

---

# 15. Interface do Adaptador ADVWIN

A camada de domínio não deve conhecer detalhes do ADVWIN.

Interface conceitual:

```ts
interface AdvwinAdapter {
  validate(entryId: string): Promise<ValidationResult>;
  send(entryId: string): Promise<IntegrationResult>;
  verify(externalReference: string): Promise<VerificationResult>;
}
```

Implementação inicial:

```text
ManualAdvwinAdapter
```

Futuras:

```text
ApiAdvwinAdapter
RpaAdvwinAdapter
FileAdvwinAdapter
```

---

# 16. Estratégia de RPA futura

Somente implementar depois de validar:

- estabilidade das telas;
- persistência do salvamento;
- seletores;
- comportamento de loaders;
- tratamento de sessão;
- regras de duplicidade;
- existência ou não de API/exportação homologada.

O RPA deve:

1. consumir apenas itens `PRONTO_ADVWIN`;
2. bloquear o item durante execução;
3. pesquisar a pasta;
4. validar a pasta encontrada;
5. abrir Ficha-Tempo;
6. preencher;
7. salvar;
8. verificar persistência;
9. registrar evidência;
10. marcar sucesso ou erro;
11. não repetir automaticamente após sucesso confirmado.

---

# 17. Telas do MVP

## Tela 1 — Dashboard

Cards:

- Horas hoje
- Horas cobradas
- Rascunhos
- Em revisão
- Devolvidos
- Aguardando ADVWIN
- Lançados

---

## Tela 2 — Captura rápida

Layout em uma única página.

Campos:

- Data
- Cliente
- Pasta
- Tipo
- Modelo
- Descrição
- Horas
- Horas cobradas

Ações:

- Salvar rascunho
- Salvar e novo
- Enviar para revisão

---

## Tela 3 — Meu dia

Tabela:

- Hora
- Cliente
- Pasta
- Tipo
- Descrição
- Duração
- Cobrável
- Status

---

## Tela 4 — Fila de revisão

Filtros + tabela.

Ações em lote:

- Aprovar
- Devolver
- Marcar pronto ADVWIN

---

## Tela 5 — Detalhe

Mostrar:

- dados atuais;
- histórico;
- alterações;
- revisão;
- status;
- dados de lançamento ADVWIN.

---

## Tela 6 — Administração

Abas:

- Usuários
- Clientes
- Pastas
- Tipos
- Modelos
- Importações
- Parâmetros

---

# 18. UX para Vibe Coding

Prioridades:

1. pouquíssimos cliques;
2. tela limpa;
3. autocomplete;
4. atalhos;
5. feedback visual imediato;
6. sem modais desnecessários;
7. ações críticas com confirmação;
8. tabelas com filtros persistentes;
9. estado de carregamento sempre visível;
10. erros com mensagem acionável.

---

# 19. Critérios de Aceite do MVP

O MVP está funcional quando:

- um usuário consegue entrar;
- registrar uma atividade em menos de 30 segundos após selecionar a pasta;
- revisar;
- aprovar;
- devolver;
- visualizar histórico;
- exportar;
- marcar como lançado no ADVWIN;
- pesquisar registros;
- importar clientes/pastas;
- impedir acesso indevido;
- registrar auditoria;
- evitar submissão duplicada causada por duplo clique;
- operar sem depender de integração direta com o ADVWIN.

---

# 20. Métricas do Piloto

Medir antes e depois:

- lançamentos por usuário/dia;
- tempo médio por lançamento;
- percentual de devolução;
- percentual de descrição corrigida;
- percentual de tipo corrigido;
- percentual de divergência entre horas e horas cobradas;
- itens não lançados no mesmo dia;
- duplicidades;
- tempo entre atividade e captura;
- tempo entre captura e lançamento no ADVWIN.

---

# 21. Ordem Recomendada de Desenvolvimento

## Fase 1 — Fundação

- projeto;
- autenticação;
- banco;
- perfis;
- auditoria;
- layout.

## Fase 2 — Cadastros

- clientes;
- pastas;
- tipos;
- modelos;
- importação.

## Fase 3 — Operação

- captura;
- cronômetro;
- meu dia;
- estados.

## Fase 4 — Revisão

- fila;
- aprovação;
- devolução;
- histórico.

## Fase 5 — Gestão

- dashboard;
- filtros;
- exportação;
- indicadores.

## Fase 6 — ADVWIN manual assistido

- `PRONTO_ADVWIN`;
- marcação de lançado;
- referência externa;
- auditoria.

## Fase 7 — Integração futura

Somente após discovery técnico.

---

# 22. Definition of Done

Uma funcionalidade só está pronta quando possuir:

- regra implementada;
- validação no servidor;
- permissão aplicada;
- tratamento de erro;
- feedback de UI;
- auditoria quando aplicável;
- teste do fluxo principal;
- teste de cenário inválido;
- sem erro no console;
- responsividade mínima;
- documentação breve.

---

# 23. Restrições para o Agente de Código

O agente NÃO deve:

- inventar API do ADVWIN;
- criar integração direta sem documentação;
- guardar segredos no cliente;
- concentrar regra de negócio em componentes React;
- pular autenticação;
- permitir acesso por confiar apenas na interface;
- excluir fisicamente registros auditáveis;
- automatizar conteúdo jurídico;
- adicionar funcionalidades fora do escopo sem registrar a decisão.

---

# 24. Decisões de Arquitetura

1. A aplicação é independente do ADVWIN.
2. O ADVWIN é tratado como sistema externo.
3. Toda futura integração passa por adapter.
4. O registro interno é fonte de rastreabilidade do processo assistido.
5. A aprovação ocorre antes de qualquer envio futuro.
6. Auditoria faz parte do núcleo, não é um recurso opcional.
7. O MVP deve gerar valor mesmo sem automação.

---

# 25. Backlog inicial

### P0

- Auth
- Perfis
- Clientes
- Pastas
- Tipos
- Captura
- Revisão
- Aprovação
- Histórico
- Status
- Auditoria
- Exportação
- Marcação ADVWIN

### P1

- Templates
- Importação
- Cronômetro
- Dashboard
- Duplicidade
- Ações em lote

### P2

- Integração
- RPA
- Alertas externos
- BI avançado
- sugestões inteligentes de descrição

---

# 26. Resultado esperado

A solução deve funcionar inicialmente como uma camada de organização entre o trabalho executado e o lançamento no ADVWIN.

A sequência desejada é:

```text
TRABALHO EXECUTADO
      ↓
CAPTURA RÁPIDA
      ↓
PADRONIZAÇÃO
      ↓
REVISÃO
      ↓
APROVAÇÃO
      ↓
FILA ADVWIN
      ↓
LANÇAMENTO
      ↓
RASTREABILIDADE
```

Essa arquitetura permite começar simples e evoluir para integração ou RPA sem reescrever o núcleo do sistema.
