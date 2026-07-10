-- 0060_fix_quote_number_search_path: the security advisor flagged generate_quote_number (0058)
-- for a mutable search_path -- every other function in this codebase sets it explicitly.
-- Additive fix, same signature/body, no other function touched.

create or replace function public.generate_quote_number()
returns text
language sql
stable
set search_path = public
as $$
  select 'Q-' || lpad(nextval('public.quote_number_seq')::text, 6, '0');
$$;
