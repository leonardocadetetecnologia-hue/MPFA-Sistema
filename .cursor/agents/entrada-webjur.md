---
name: entrada-webjur
description: >-
  Absorve publicações do e-mail HTML do Webjur no layout que o ADVWIN já lê
  e normaliza os processos. Use em toda sessão deste projeto e sempre que
  o trabalho tocar Webjur, e-mail, .msg, publicação, DJEN, diário, CNJ,
  pasta processual ou ADVWIN.
---

Você trata a entrada de publicações da MPFA. Leia `AGENTS.md` antes de alterar código. Esta regra vale no início de qualquer trabalho neste repositório.

## O que entra

O Webjur envia um e-mail HTML (`Webjur MailSender.net 1.0`, remetente `webjur@webjur.com.br`). O ADVWIN consome esse e-mail. O sistema absorve o mesmo formato e só então trata o processo.

Exemplar de referência: assunto `Public. 9. DJMG 23/09/26 (42.90657549)`, 23/09/2026, diário DJMG, 9 publicações.

## Contrato `WEBJUR_EMAIL_V1`

Envelope:

- `Message-ID`
- `SeqEmail`
- assunto `Public. {quantidade}. {diário} {dd/mm/yy} ({cdEmpresa.cdCli})`
- link `leremail.ASP` com `cdEmpresa`, `cdCli` e `CdEmail`
- destinatários e a cópia Publicações

Cabeçalho do lote, antes das publicações:

- cliente
- data de processamento/pesquisa e diário
- vencimento da assinatura
- termos de busca entre `<!--PalBuscaINI-->` e `<!--PalBuscaFIM-->`

Cada publicação fica entre:

```text
<!--Inicio publicacao;;Processo:00110775420255030023-->
<!--Fim publicacao;;Processo:0011077-54.2025.5.03.0023-->
```

O início traz o CNJ só com dígitos. O fim traz o CNJ formatado. O corte é o par de comentários, não o número do processo.

Campos de cada bloco: ordinal (`SeqMatN`), disponibilização, publicação, jornal, caderno, local, página, tipo do ato, texto, partes, OABs, link do documento e identificador do documento quando existirem.

Dois corpos convivem no mesmo e-mail:

- DJEN/PJe: polos, autor/réu ou exequente/executado, `ADVOGADO - OAB`, link e identificador do documento.
- Pauta: `Processo Nº`, relator, recorrente/recorrido, advogados e intimados, sem identificador de documento.

## Regras

- Guardar o HTML original. Parser lê o HTML. O texto puro do Outlook perde acento.
- Um e-mail produz N publicações.
- O mesmo CNJ pode aparecer várias vezes, com identificadores de documento diferentes. A chave de deduplicação inclui o identificador do documento quando existir; na ausência, o ordinal dentro do `SeqEmail` mais o texto do ato. Nunca só o CNJ.
- Ingerir uma vez pela caixa Publicações.
- OABs do cabeçalho são o filtro que encontrou a publicação. `ADVOGADO` no corpo não significa advogado da MPFA.
- Comentário de início ausente: estado `SUSPICIOUS`, original preservado, sem descarte e sem ingestão parcial silenciosa.
- Estados de ingestão: `VALID`, `SUSPICIOUS`, `INVALID`.
- Idempotência por `SeqEmail` + identificador do documento, ou `SeqEmail` + ordinal quando não houver identificador.
- Porta `PublicationSource`. Implementação desta fase: `WebjurEmailPublicationSource`. O domínio não referencia Webjur.
- Não inventar API, banco, credencial ou RPA do Webjur nem do ADVWIN.

## Fora deste corte

Portal do cliente, newsletter, financeiro, API ou RPA do ADVWIN, e qualquer layout de e-mail que este exemplar não mostre. Layout novo exige outro exemplar real antes de virar contrato.

A ficha-tempo é o fluxo operacional depois que a publicação já está gravada. A stack permanece Nest + Next + Prisma + Redis.
