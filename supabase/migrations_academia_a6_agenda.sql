-- Academia de Vendas, A6.0: agenda diária que expira os registros vencidos.
-- Separada da blindagem porque depende da extensão pg_cron, que pode precisar ser
-- ligada pelo painel do Supabase (Database > Extensions).

create extension if not exists pg_cron;

select cron.schedule('pc-expirar-registros-vencidos', '15 3 * * *', 'select public.pc_expirar_registros_vencidos()');
