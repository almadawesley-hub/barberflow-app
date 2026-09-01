# BarberFlow — app real (Next.js + Prisma + Supabase)

> **Nota:** para abrir espaço no seu plano gratuito da Supabase (limite de
> 2 projetos), o projeto **CVFLOW** foi pausado durante essa implantação.
> Ele não foi apagado — os dados continuam lá. Pra reativar quando
> precisar: **supabase.com/dashboard/project/dezwmrtrjswsrrphwims** → *Restore project*.

**Status do banco: já criado e pronto.** O projeto Supabase `barberflow`
(ref `nmbvveafeyngkpwqknjs`, região `sa-east-1`) foi criado, as 17 tabelas
do schema estão no ar com RLS ativo em todas, e os dados de demonstração já
foram inseridos direto no banco. Falta só você pegar a senha do banco e
publicar na Vercel — os passos 1, 3 (migrations) e 5 (seed) do guia abaixo
já foram feitos por mim; comece no passo 2.

Login de demonstração já funciona assim que a app conectar no banco:
```
admin@barberflow.com / barberflow123
```

Esta é a aplicação de verdade, saindo do protótipo em React puro para uma
stack que você pode implantar e escalar:

- **Next.js 14** (App Router) — front-end + API routes no mesmo projeto
- **PostgreSQL no Supabase** — banco gerenciado
- **Prisma** — ORM e migrations
- **NextAuth (Credentials)** — autenticação por e-mail/senha
- **Row Level Security no Postgres** — segunda camada de isolamento entre empresas
- **Vercel** — hospedagem

---

## 1. ~~Criar o projeto no Supabase~~ ✅ feito

Projeto `barberflow` já existe na sua organização, região `sa-east-1`.

## 2. Pegar a senha do banco e configurar variáveis de ambiente

```bash
cp .env.example .env
```

O `.env.example` já vem com a referência do projeto preenchida — só falta
a senha do banco, que por segurança não é recuperável por API. Pegue (ou
redefina) em:

**supabase.com/dashboard/project/nmbvveafeyngkpwqknjs/settings/database**

Cole no lugar de `[SUA-SENHA]` nas duas linhas (`DATABASE_URL` e
`DIRECT_URL`). Gere o `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

## 3. ~~Rodar as migrations~~ ✅ feito

As 17 tabelas (companies, users, customers, appointments, sales, sale_items,
commission_entries, financial_transactions, loyalty_configs, audit_logs
etc.) já estão criadas no banco via SQL equivalente ao
`prisma/schema.prisma`. Depois de configurar o `.env`, rode uma vez para o
Prisma reconhecer o schema existente:

```bash
npm install
npx prisma db pull    # confirma que o schema bate com o banco
npx prisma generate   # gera o client
```

## 4. ~~Ativar o Row Level Security~~ ✅ feito

Todas as 17 tabelas de tenant têm RLS ativo, incluindo a policy de leitura
pública em `plans` (catálogo global). Zero alertas de segurança no linter
do Supabase.

## 5. ~~Popular dados de exemplo~~ ✅ feito

Empresa "Barbearia Reis & Filhos" com 4 usuários (1 admin, 1 recepcionista,
2 barbeiros), 3 serviços, 2 produtos e configuração de fidelidade já estão
no banco.

## 6. Rodar localmente

```bash
npm run dev
```

Abra `http://localhost:3000/login` e entre com `admin@barberflow.com` / `barberflow123`.

---

## 7. Deploy na Vercel

1. Suba este projeto para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com) → **Add New Project** → importe o repo.
3. Em **Environment Variables**, adicione as mesmas 4 variáveis do `.env`
   (troque `NEXTAUTH_URL` pela URL final, ex: `https://barberflow.vercel.app`).
4. Deploy.

O banco já está pronto — não precisa rodar migration nenhuma contra
produção, é o mesmo projeto Supabase que a app local já usa.

Domínio próprio: **Project Settings → Domains** na Vercel, aponta o DNS
conforme instruído lá.

---

## Como estender

O back-end já está completo — todos os módulos do sistema têm rota de API
seguindo o mesmo padrão (`requireUser()` → `withTenantContext()` → `zod` →
`logAction()`):

| Módulo | Rotas |
|---|---|
| Autenticação | `POST /api/auth/[...nextauth]` (login via NextAuth) |
| Agenda | `GET/POST /api/appointments`, `PATCH/DELETE /api/appointments/[id]`, `POST /api/appointments/[id]/start` (abre a comanda) |
| Comandas | `GET /api/comandas`, `POST /api/comandas/[id]/items`, `PATCH/DELETE /api/comandas/[id]/items/[itemId]`, `POST /api/comandas/[id]/finalize` |
| Venda avulsa | `GET/POST /api/sales` |
| Clientes | `GET/POST /api/customers`, `GET/PATCH/DELETE /api/customers/[id]`, `POST /api/customers/[id]/redeem` |
| Serviços | `GET/POST /api/services`, `PATCH/DELETE /api/services/[id]` |
| Produtos & Estoque | `GET/POST /api/products`, `PATCH/DELETE /api/products/[id]`, `POST /api/products/[id]/stock` |
| Usuários & Barbeiros | `GET/POST /api/users`, `PATCH/DELETE /api/users/[id]`, `GET /api/barbers` (produção/comissão de hoje) |
| Comissões | `GET /api/commissions/today`, `GET /api/commissions/history`, `POST /api/commissions/close-day` |
| Financeiro | `GET/POST /api/financial-transactions`, `GET /api/financial-transactions/summary` |
| Fidelidade | `GET/PATCH /api/loyalty/config` |
| Histórico geral | `GET /api/audit-logs` |
| Empresa | `GET/PATCH /api/company` |

Regras de negócio que valem lembrar (herdadas das decisões tomadas no
protótipo):

- **Fechar comanda é transação única** — em `finalize/route.ts`: baixa
  estoque, credita fidelidade, marca agendamento concluído e cria o
  pagamento tudo dentro da mesma transação do Prisma.
- **Comissão "de hoje" é sempre calculada ao vivo** a partir das vendas do
  dia (`/api/commissions/today`); `close-day` é quem arquiva isso em
  `CommissionEntry` — chamado de novo no mesmo dia, faz upsert (idempotente).
- **Cada item de venda carrega seu próprio `barberId`** — tanto na comanda
  (herda do agendamento) quanto na venda avulsa (escolhido por item), pra
  comissão bater certo quando mais de um barbeiro participa da mesma conta.
- **Exclusão é sempre soft-delete** (`isActive: false`) em serviço, produto
  e usuário — preserva o histórico de vendas/agendamentos antigos que
  apontam pra esses registros.

### O que falta pra ficar pronto de ponta a ponta

O que existe hoje é a API completa + duas páginas de exemplo (login e
dashboard). As outras telas (Agenda, Clientes, PDV, Fidelidade etc.) do
protótipo React em `barberflow-mvp.jsx` já têm todo o design e a lógica de
interação prontos — o trabalho que falta é conectar esses componentes às
rotas acima no lugar dos `useState` locais que hoje simulam os dados. É
troca de fiação, não redesenho.

