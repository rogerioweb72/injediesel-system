create type public.user_role as enum (
  'company_admin','operations_admin','finance_admin',
  'support_agent','seller','franchise_manager','unit_operator','auditor'
);

create type public.contract_type as enum ('full','linha_leve');

create type public.price_tier as enum (
  'franqueado_full','franqueado_linha_leve','cliente_final'
);

create type public.vehicle_type as enum (
  'automotivo','maquina_agricola','maquina_pesada','nautica'
);

create type public.file_status as enum (
  'recebido','em_triagem','em_processamento',
  'aguardando_cliente','concluido','cancelado'
);

create type public.priority_level as enum ('normal','alta','critica');

create type public.ticket_priority as enum ('baixa','media','alta','critica');

create type public.ticket_status as enum (
  'aberto','em_atendimento','aguardando_cliente','resolvido','fechado'
);
