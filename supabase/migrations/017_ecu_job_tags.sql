-- 017_ecu_job_tags.sql
-- Adds multi-select service tags and free-form vehicle info to ecu_jobs

alter table ecu_jobs
  add column if not exists service_tags text[] default '{}',
  add column if not exists vehicle_info jsonb default '{}';

comment on column ecu_jobs.service_tags is 'Multi-select service categories: Performance, Emissões, Diagnóstico, Codificação, Transmissão, Especial';
comment on column ecu_jobs.vehicle_info is 'Free-form vehicle data: {categoria, marca, modelo, motor, transmissao, ano, horas_km}';
