# Próximo passo — revisar antes de publicar na VPS

A branch `feat/mpfa-s-mvp` guarda o que já foi construído. Ela ainda não é o sistema online. A VPS só entra depois desta lista, com ambiente próprio, secrets fora do Git e aprovação explícita.

## Revisar

- [ ] Entrar com Administrativo, Advogado, Gestão e Cliente e confirmar a tela de cada perfil.
- [ ] Importar um `.eml` sintético e conferir lote, quantidade, processo sugerido sem cliente e a segunda importação sem duplicar.
- [ ] Abrir uma publicação: texto extraído, vínculo, comentário interno, tarefa e cronômetro.
- [ ] Publicar uma ocorrência de teste e entrar como cliente. A nota interna não pode aparecer.
- [ ] Conferir Claro e Black Piano, com a marca sem esticar.
- [ ] Conferir que Microsoft 365 aparece desconectado e que a recuperação de senha não envia e-mail.
- [ ] Conferir senha errada, sessão expirada e usuário desativado.

## Completar

- [ ] Abrir o pull request de `feat/mpfa-s-mvp` para `main` e deixar o CI passar.
- [ ] Subir primeiro um staging na VPS, separado de produção: banco, Redis, volume dos originais e URLs próprias.
- [ ] Aplicar as migrations no staging. O seed só com `SEED_PASSWORD` definido no ambiente, nunca no Git.
- [ ] Smoke no staging: health, login e importação sintética.
- [ ] Backup diário do PostgreSQL e um restore já testado antes de qualquer dado real.
- [ ] Worker com `WORKER_TOKEN` e URL interna da API.
- [ ] Teste de integração para aprovar hora e fechar período.
- [ ] Repetir no navegador importar, listar, portal e cronômetro já autenticado.

## Definir

- [ ] Quando a caixa Publicações passa a ser lida sozinha, e com qual conta Microsoft.
- [ ] Qual provedor envia e-mail, ou se a recuperação continua só como intenção registrada.
- [ ] Regras internas de encaminhamento de produção: OAB, equipe e responsável.
- [ ] Quem publica no portal e o que o cliente pode ver.
- [ ] Como a operação informa um prazo. O sistema não inventa prazo legal a partir do texto.
- [ ] Onde fica o documento no primeiro deploy: SharePoint ou volume da VPS.
- [ ] Financeiro permanece fora até o discovery com a área.
- [ ] O que migra primeiro do ADVWIN, sem presumir acesso ao banco dele.
- [ ] Domínio, TLS e a janela de corte na VPS.
- [ ] Quem opera o primeiro ambiente e qual senha inicial. A senha não entra no repositório.
