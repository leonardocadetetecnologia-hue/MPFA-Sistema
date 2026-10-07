# Prompt mestre — Vibe Coding MPFA / Ficha-Tempo Assistida

Leia integralmente o arquivo:

`mpfa-requisitos-mvc-vibe-coding.md`

Você será responsável por construir a aplicação especificada.

## Objetivo

Criar um MVP funcional de captura, padronização, revisão e rastreabilidade de Ficha-Tempo para a MPFA Advogados.

A aplicação NÃO substitui o ADVWIN+ nesta fase.

Ela funciona como uma camada operacional anterior ao lançamento no ADVWIN.

## Regra máxima

Não invente:

- API do ADVWIN;
- banco do ADVWIN;
- endpoints;
- credenciais;
- integrações;
- regras jurídicas;
- campos não definidos como necessários.

Quando algo depender do ADVWIN, implemente através de uma interface/adaptador e utilize uma implementação manual/mock.

---

# Arquitetura

Utilize MVC pragmático:

- Model: entidades, domínio, banco, repositories;
- View: React/Next.js;
- Controller: server actions / route handlers;
- Services: regras de aplicação;
- Integrations: adapters externos.

Regra de negócio NÃO deve ficar em componentes React.

---

# Stack preferencial

- Next.js
- TypeScript
- PostgreSQL / Supabase
- Tailwind CSS
- biblioteca de componentes consistente
- autenticação
- validação tipada
- migrations
- testes automatizados

Não fixe versões sem necessidade.

---

# Forma de execução

Trabalhe em etapas pequenas.

Antes de cada etapa:

1. leia os requisitos relacionados;
2. identifique arquivos que serão alterados;
3. implemente;
4. execute validações;
5. corrija erros;
6. atualize o README ou changelog técnico.

Não peça confirmação para decisões triviais.

Quando houver ambiguidade:

- escolha a solução mais simples;
- mantenha arquitetura extensível;
- registre a decisão.

---

# Fase 1

Implementar:

- estrutura do projeto;
- layout;
- autenticação;
- banco;
- roles;
- auditoria;
- navegação;
- tratamento global de erros.

---

# Fase 2

Implementar:

- clientes;
- pastas;
- tipos de serviço;
- modelos de descrição;
- importação CSV/XLSX.

---

# Fase 3

Implementar:

- captura rápida;
- rascunho;
- duração;
- horas cobradas;
- cronômetro;
- meu dia;
- mudança de status.

---

# Fase 4

Implementar:

- fila de revisão;
- aprovação;
- devolução;
- justificativa;
- histórico;
- ações em lote.

---

# Fase 5

Implementar:

- dashboard;
- filtros;
- busca;
- exportação;
- métricas operacionais.

---

# Fase 6

Implementar o fluxo manual de ADVWIN:

`APROVADO -> PRONTO_ADVWIN -> LANCADO_ADVWIN`

Criar:

`AdvwinAdapter`

Implementação inicial:

`ManualAdvwinAdapter`

Não criar RPA real.

---

# Requisitos obrigatórios de segurança

- validar autorização no backend;
- nenhum segredo no frontend;
- aplicar menor privilégio;
- impedir alteração de registros sem permissão;
- manter logs de auditoria;
- evitar exclusão física de registros críticos.

---

# UX

A captura deve ser extremamente rápida.

Priorize:

- autocomplete;
- seleção por teclado;
- poucos cliques;
- poucas telas;
- feedback imediato;
- filtros rápidos;
- estado visível;
- mensagens de erro úteis.

Evite:

- wizard longo;
- excesso de modais;
- telas administrativas misturadas com operação;
- campos sem necessidade.

---

# Testes mínimos

Criar testes para:

- autenticação;
- permissões;
- criação de lançamento;
- submissão;
- aprovação;
- devolução;
- transições inválidas;
- proteção de duplo clique;
- importação;
- exportação;
- auditoria.

---

# Entrega esperada

Ao final, entregar:

1. aplicação executável;
2. migrations;
3. seed de desenvolvimento;
4. `.env.example`;
5. README completo;
6. instruções de instalação;
7. modelo de dados;
8. lista de decisões técnicas;
9. testes;
10. backlog do que ficou fora do MVP.

---

# Critério de parada

Não implemente integração real com ADVWIN enquanto não houver documentação e autorização técnica.

O MVP deve ser útil mesmo que essa integração nunca seja criada.
