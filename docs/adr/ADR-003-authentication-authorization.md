# ADR-003 — Autenticação e autorização

Status: proposed (decisão final no PROMPT 02)
Data: 2026-09-27

## Contexto

Perfis-base: `SUPER_ADMIN`, `MPFA_MANAGER`, `LAWYER`, `CLIENT`, `FINANCIAL` (reservado). O Portal
do Cliente exige isolamento por organização, cliente, ownership e visibilidade. A MPFA usa
Microsoft 365, o que torna SSO (Entra ID) um candidato natural para usuários internos.

## Decisão (princípios já fixados)

- Autorização = **RBAC + escopo de recurso**: role → permissions granulares (`matter.read`,
  `user.access.update`, …) → verificação de escopo/ownership no caso de uso.
- Mapeamento role → permissions centralizado em `modules/iam`; proibido `if (role === …)` espalhado.
- Autorização real sempre no backend; o frontend só adapta a interface.
- `organization_id` e `user_id` resolvidos na autenticação e propagados no contexto da requisição.
- Ações sensíveis geram auditoria (ADR-005).

## Em aberto para o PROMPT 02

| Opção                                        | Prós                               | Contras                               |
| -------------------------------------------- | ---------------------------------- | ------------------------------------- |
| Sessão server-side (cookie httpOnly + Redis) | revogação imediata, simples no web | estado no Redis                       |
| JWT curto + refresh rotativo                 | stateless                          | revogação mais complexa               |
| OIDC Microsoft Entra ID (internos)           | SSO, MFA corporativo               | depende de homologação do tenant MPFA |

Recomendação inicial: sessão server-side para todos, com OIDC Entra ID como provedor de login
dos usuários internos quando homologado; clientes externos com credencial própria + MFA.

## Consequências

- Nenhum endpoint de negócio existe antes do PROMPT 02; os módulos `iam`/`users` estão vazios.
