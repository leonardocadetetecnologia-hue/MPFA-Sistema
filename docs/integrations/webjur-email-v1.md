# WEBJUR_EMAIL_V1

O Webjur envia um e-mail HTML (`Webjur MailSender.net 1.0`). O ADVWIN lê esse e-mail. O MPFA-S usa o mesmo corpo.

## Corte

Cada publicação fica entre:

```text
<!--Inicio publicacao;;Processo:DIGITOS-->
<!--Fim publicacao;;Processo:CNJ-FORMATADO-->
```

O início traz os 20 dígitos do CNJ. O fim traz a máscara. Sem o par, o lote fica `SUSPICIOUS` e o HTML original permanece em `ingested_messages`.

## O que não deduplica

O mesmo CNJ com `Identificador do documento` diferente, ou com ordinal diferente, permanece em ocorrências distintas. A chave é `SeqEmail` + identificador do documento, ou `SeqEmail` + ordinal.

## Cabeçalho

Termos entre `PalBuscaINI` e `PalBuscaFIM` são o filtro da pesquisa Webjur. Linhas `ADVOGADO` do corpo incluem a parte contrária. Nomes parecidos com OABs diferentes ficam marcados para conferência.

Datas guardadas em separado: processamento do lote, disponibilização e publicação.

Pautas com `** REVISÃO **` ficam com `is_revision`.

## Entrada no MVP

`POST /api/v1/ingestion/messages` com `{ filename, content_base64 }` para `.msg`, `.eml` ou `.pdf`.

O PDF não tem os comentários HTML. O lote é gravado com a limitação `pdf_without_html_comments` e nenhuma publicação extraída.

A amostra real não entra no Git. O teste lê o `.msg` local quando o arquivo existe.

O dígito verificador mod 97 da Resolução CNJ 65 não bate com os números desta amostra, então a validação do número é a máscara, não o módulo.
