-- BarberFlow — Row Level Security
--
-- Rode isso no SQL editor do Supabase depois de `prisma migrate deploy`.
-- Isso é a SEGUNDA camada de isolamento entre empresas: a primeira é o
-- Prisma sempre filtrar por company_id (via withTenantContext em
-- lib/tenant.ts). Mesmo que uma query da aplicação esqueça o filtro,
-- o Postgres não deixa ler/escrever linha de outra empresa.
--
-- withTenantContext roda `SET LOCAL app.current_company_id = '<uuid>'`
-- no início de cada transação — é esse valor que as policies abaixo
-- comparam com a coluna company_id de cada tabela.

-- companies é especial: a policy compara o próprio id, não uma FK.
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON companies
  USING (id = current_setting('app.current_company_id', true)::uuid);

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'branches', 'users', 'customers', 'services', 'products',
    'inventory_movements', 'appointments', 'sales', 'commission_entries',
    'financial_transactions', 'loyalty_configs', 'audit_logs', 'subscriptions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (company_id = current_setting(''app.current_company_id'', true)::uuid);',
      tbl
    );
  END LOOP;
END $$;

-- sale_items e payments não têm company_id direto (herdam de sales) —
-- a policy passa pela venda pai.
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sale_items
  USING (EXISTS (
    SELECT 1 FROM sales
    WHERE sales.id = sale_items.sale_id
    AND sales.company_id = current_setting('app.current_company_id', true)::uuid
  ));

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON payments
  USING (EXISTS (
    SELECT 1 FROM sales
    WHERE sales.id = payments.sale_id
    AND sales.company_id = current_setting('app.current_company_id', true)::uuid
  ));

-- plans é catálogo global (não é por empresa) — sem RLS, leitura livre.
