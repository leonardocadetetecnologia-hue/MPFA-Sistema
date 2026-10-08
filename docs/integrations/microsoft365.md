# Microsoft 365

Não há tenant homologado nesta entrega.

Variáveis, todas vazias por padrão:

```text
MICROSOFT_TENANT_ID
MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET
MICROSOFT_MAILBOX
```

`GET /api/v1/integrations/microsoft365` responde `status: disconnected` e `externally_validated: false`.

Preencher as variáveis não marca a conexão como validada. Não existe chamada ao Graph. A lista de mensagens usada em teste é `mode: fixture` e não é um envio nem uma leitura real.

O worker só reprocessa um lote já gravado, chamando `POST /api/v1/internal/ingestion/:id/process` com `WORKER_TOKEN`. Sem o token, o job falha de forma visível. A importação pela API já grava o lote no mesmo caso de uso; o job não cria segunda publicação.
