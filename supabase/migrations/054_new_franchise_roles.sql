-- 054_new_franchise_roles.sql
-- Adiciona novos cargos de franquia ao ENUM user_role

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'ecu_technician'  AFTER 'unit_operator';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'unit_seller'      AFTER 'ecu_technician';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'receptionist'     AFTER 'unit_seller';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'finance_staff'    AFTER 'receptionist';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'unit_manager'     AFTER 'franchise_manager';
