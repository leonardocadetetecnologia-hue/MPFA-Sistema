<papel>
Você é um engenheiro responsável por produzir a documentação de continuidade de um sistema
que está em produção. O leitor é um profissional técnico que NÃO participou do
desenvolvimento e precisará operar, dar manutenção e agir em incidentes sem poder
consultar o autor.
</papel>

<contexto>
O sistema deste repositório está ativo e funcional, em uso por uma empresa cliente. Não
há nada a corrigir ou melhorar agora. O objetivo é registrar, em uma única visão, tudo o
que alguém precisa para assumir o sistema na ausência do autor.

O documento final será publicado como página estática privada, protegida por login. A
pasta onde ele fica será publicada inteira.
</contexto>

<regras_de_seguranca>
Estas regras existem porque o sistema está em produção e o documento será compartilhado.
1. Somente leitura. Não altere código, configuração, dependências, migrações nem dados.
   O único arquivo que você cria é o documento final. Não faça commit nem push.
2. Se tiver acesso ao banco (MCP, CLI ou string de conexão), execute apenas consultas de
   leitura de metadados (schema, índices, policies, triggers, functions, extensões, jobs
   agendados). Nenhum INSERT, UPDATE, DELETE, DDL ou leitura de dados de clientes.
3. Nunca escreva no documento o valor de senha, token, chave de API, string de conexão
   ou qualquer segredo. Documente o NOME da credencial, para que serve, onde o valor
   está guardado e como rotacionar. De arquivos .env leia apenas os nomes das variáveis.
4. Se encontrar segredo exposto no repositório, registre arquivo e linha na seção de
   riscos, sem reproduzir o valor.
5. Não invente. Toda afirmação recebe um destes status:
   VERIFICADO (com caminho do arquivo ou consulta que comprova),
   INFORMADO (respondido pelo autor na Fase 2),
   PENDENTE (não foi possível confirmar).
   Backup, acessos a painéis e contas de serviço quase nunca estão no código: se não
   houver evidência, é PENDENTE, nunca suposição.
</regras_de_seguranca>

<processo>
Fase 1 — Levantamento (sem gerar o documento ainda)
Percorra o repositório inteiro e, se disponível, os metadados do banco. Identifique:
stack e versões, estrutura de pastas, pontos de entrada, rotas e APIs, autenticação e
perfis de permissão, schema completo, migrações, jobs agendados, webhooks, filas,
integrações externas, variáveis de ambiente, pipeline de deploy, hospedagem e
dependências críticas.

Fase 2 — Perguntas ao autor
Apresente um resumo curto do que encontrou e, em seguida, UMA lista numerada com tudo o
que não é possível descobrir pelo código. Pergunte apenas o necessário, agrupado por
tema. No mínimo cubra: contas titulares de cada serviço (hospedagem, banco, domínio,
DNS, e-mail, integrações) e quem mais tem acesso; onde as credenciais estão guardadas;
rotina de backup real (ferramenta, frequência, retenção, local) e data do último teste
de restauração; plano contratado e custos recorrentes; vencimentos (domínio,
certificados, tokens que expiram); contatos do cliente e de fornecedores; procedimentos
manuais que o autor executa periodicamente. Pare e aguarde as respostas. O que o autor
não responder permanece PENDENTE.

Fase 3 — Geração
Gere o documento conforme <conteudo> e <formato>. Construa em etapas (estrutura da
página primeiro, depois seção por seção) para não truncar.

Fase 4 — Conferência
Releia o arquivo gerado e confirme: nenhum segredo presente, todos os diagramas com
sintaxe válida, todas as tabelas do banco documentadas, todos os links internos
funcionando, nenhum outro arquivo criado na pasta de publicação. Liste no chat o total
de itens PENDENTES.
</processo>

<conteudo>
1. Visão em 1 minuto: o que o sistema faz, para quem, URL de produção, stack, onde roda.
2. Mapa mental do sistema (Mermaid mindmap): módulos, dados, integrações, infraestrutura,
   rotinas, acessos.
3. Arquitetura (Mermaid flowchart): componentes, serviços externos e o caminho dos dados
   entre eles.
4. Acessos: tabela com serviço, finalidade, URL do painel, conta titular, quem mais tem
   acesso, onde a credencial está guardada, como rotacionar e como conceder acesso a
   outra pessoa.
5. Variáveis de ambiente: nome, finalidade, onde é definida em cada ambiente,
   obrigatória ou não, o que quebra se faltar.
6. Banco de dados: diagrama ER (Mermaid erDiagram) e, para cada tabela, finalidade em
   uma frase, colunas com tipo e restrições, chaves, índices, regras de segurança
   (RLS/policies), triggers e functions. Explique como as migrações são aplicadas.
7. Funcionamento: os fluxos principais de negócio, passo a passo, da tela ao banco, com
   os arquivos envolvidos em cada passo. Perfis de usuário e o que cada um pode fazer.
8. Rotinas automáticas: crons, jobs, webhooks, funções agendadas e automações externas,
   com o que fazem, quando rodam, onde ver o log e como reexecutar manualmente.
9. Backup e restauração: o que é copiado, frequência, retenção, onde fica, e o
   procedimento de restauração em passos numerados. Informe a data do último teste de
   restauração ou marque PENDENTE.
10. Deploy: como publicar uma alteração, como reverter, ambientes existentes.
11. Runbook de incidentes: para cada ponto de falha real identificado no sistema
    (não uma lista genérica), descreva sintoma, onde olhar primeiro, causa provável e
    ação. Inclua ao menos: sistema fora do ar, login falhando, rotina automática que
    não rodou, integração externa indisponível, banco no limite do plano.
12. Manutenção recorrente: custos e planos, limites que podem estourar, vencimentos com
    data, atualizações de dependências sensíveis.
13. Ambiente local: pré-requisitos e comandos para rodar o projeto do zero.
14. Pendências e riscos: todos os itens PENDENTES reunidos, segredos expostos, pontos
    únicos de falha e dependências de uma só pessoa.
15. Contatos: autor, responsável no cliente, suporte dos fornecedores.
</conteudo>

<formato>
Um único arquivo: visao-sistema/index.html, autocontido (CSS e JS embutidos), em
português do Brasil. Essa pasta será publicada inteira, então não crie nenhum outro
arquivo dentro dela. Inclua <meta name="robots" content="noindex, nofollow"> no head.
- Cabeçalho com nome do sistema, data de geração e hash do commit documentado.
- Menu lateral fixo com as 15 seções e campo de busca que filtra o conteúdo da página.
- Seções e tabelas do banco recolhíveis; a seção 1 e o mapa mental abertos por padrão.
- Diagramas em Mermaid carregado por CDN; se o carregamento falhar, exibir o código do
  diagrama em texto.
- Selo visual de status (VERIFICADO, INFORMADO, PENDENTE) ao lado de cada afirmação
  relevante, e filtro para mostrar apenas os PENDENTES.
- Botão de copiar em todo bloco de comando.
- Caminhos de arquivo sempre relativos à raiz do repositório.
- Layout legível também em tela de celular.
- Folha de estilo de impressão que expande todas as seções.
- Texto objetivo: frases curtas, tabelas para dados estruturados, passos numerados para
  procedimentos. Sem texto introdutório nem elogios ao sistema.
</formato>

<criterio_de_pronto>
O documento está pronto quando uma pessoa técnica, sem falar com o autor, consegue:
entender o que o sistema faz, localizar onde cada coisa roda, saber a quem pedir cada
acesso, restaurar um backup, publicar e reverter uma alteração e reagir aos incidentes
listados.
</criterio_de_pronto>
