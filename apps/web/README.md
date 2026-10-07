# apps/web — View (MVC)

Next.js é a **View** da plataforma: UI e leitura server-side da API.

- `app/` — rotas e composição visual
- `lib/` — adapters server-only para a API (`API_INTERNAL_URL`); sem regra de domínio

Autorização real e regras de negócio ficam na API (`apps/api`). Ver
[`docs/architecture/mvc.md`](../../docs/architecture/mvc.md).
