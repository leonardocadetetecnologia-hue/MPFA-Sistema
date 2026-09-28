# Módulos de negócio

Cada pasta é um módulo de domínio independente (AGENTS.md §3). Na Foundation só existem os
módulos-base registrados vazios: `iam`, `organizations`, `users`, `audit`, `system-admin`.

Ao implementar um módulo, crie apenas as camadas que tiverem responsabilidade real:

```text
<module>/
├── domain/           entidades, value objects, erros (extends DomainError), portas de repositório
├── application/      casos de uso, commands/queries, DTOs, autorização contextual, transações
├── infrastructure/   persistência (Prisma), adapters de fornecedores
└── presentation/     controllers HTTP e schemas zod de entrada
```

Regras que valem desde já:

- Controller não contém regra de negócio; valida entrada com `ZodValidationPipe`.
- Nunca retornar model do Prisma como contrato público: mapear para tipos de `@mpfa/contracts`.
- Entidade organizacional recebe `organization_id` e toda consulta é escopada por ele.
- Configuração vem de `API_CONFIG` (injeção), nunca de `process.env`.
- Rotas de negócio ficam sob o prefixo `/api/v1`.
