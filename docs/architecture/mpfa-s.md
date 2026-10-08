# MVC de uma importação Webjur

O molde continua o do módulo `health`: apresentação, aplicação, domínio, infraestrutura.

Percurso de `POST /api/v1/ingestion/messages`:

1. View mínima (`apps/web/app/importacao/page.tsx`) envia o arquivo em base64 para a rota Next `/api/import`.
2. Essa rota repassa o cookie de sessão como `Authorization: Bearer` para a API. A view não lê banco.
3. Controller `IngestionController` valida o corpo e chama `ImportMessageService`.
4. O serviço lê `.msg` ou `.eml` (`read-outlook-message`, `read-eml`) e chama `parseWebjurEmail` no domínio.
5. O domínio devolve ocorrências, estados e ambiguidades. Não conhece Prisma nem Webjur como SDK.
6. O serviço grava lote, HTML original, termos, ocorrências, processo sugerido sem cliente, vínculo `PENDING` e decisão de encaminhamento.
7. O controller enfileira `ingestion.process`. O worker chama o mesmo serviço de novo; a segunda passagem devolve o lote existente.

Login segue o mesmo corte: `AuthController` só traduz HTTP. `AuthService` verifica senha, grava sessão no Redis e auditoria. A permissão fica em `iam/domain/access.ts`, não no componente React.
