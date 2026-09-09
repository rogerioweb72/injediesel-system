-- 128_ticket_protocol_concurrency_safe.sql
-- BUG: "duplicate key value violates unique constraint support_tickets_protocol_key".
-- generate_ticket_protocol (010) usava max(seq)+1 sem serializar: dois inserts quase
-- simultâneos (double-submit / retry) leem o mesmo max -> geram o mesmo protocolo
-- PT-AAAAMM-NNNNNN -> o 2º viola a unique. Trata gaps, mas não concorrência.
--
-- Fix: advisory lock por (mês) dentro do trigger. Serializa SÓ a geração do
-- protocolo — dois inserts concorrentes esperam a vez e cada um pega um número
-- distinto. Lock de transação: solta no commit/rollback automaticamente.

CREATE OR REPLACE FUNCTION public.generate_ticket_protocol()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE seq integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('ticket_protocol_' || to_char(now(), 'YYYYMM')));

  SELECT coalesce(max(cast(split_part(protocol, '-', 3) AS integer)), 0) + 1
    INTO seq
    FROM public.support_tickets
   WHERE protocol LIKE 'PT-' || to_char(now(), 'YYYYMM') || '-%';

  NEW.protocol := 'PT-' || to_char(now(), 'YYYYMM') || '-' || lpad(seq::text, 6, '0');
  RETURN NEW;
END;
$$;
