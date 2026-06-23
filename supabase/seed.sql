-- ============================================================
-- SEED — dados de desenvolvimento local
-- Executado por: supabase db reset (após todas as migrations)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- AUTH USERS (local dev only)
-- Login: ti@injediesel.com / injediesel123     → role system_ti
-- Login: admin@injediesel.com / injediesel123  → role company_admin
-- Login: teste@injediesel.com / max123     → role franchise_manager (unidade Japão → /japao/teste/dashboard)
-- ─────────────────────────────────────────────────────────────
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token,
  created_at, updated_at
) VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'ti@injediesel.com',
    crypt('injediesel123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"TI Master","role":"system_ti"}',
    '', '', '', '', '', '', '', '',
    now(), now()
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@injediesel.com',
    crypt('injediesel123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin Injediesel","role":"company_admin"}',
    '', '', '', '', '', '', '', '',
    now(), now()
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'teste@injediesel.com',
    crypt('max123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Teste","role":"franchise_manager"}',
    '', '', '', '', '', '', '', '',
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- auth.identities required for email/password login
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
) VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'ti@injediesel.com',
    'email',
    '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","email":"ti@injediesel.com","email_verified":true}',
    now(), now(), now()
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'admin@injediesel.com',
    'email',
    '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","email":"admin@injediesel.com","email_verified":true}',
    now(), now(), now()
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000003',
    'teste@injediesel.com',
    'email',
    '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","email":"teste@injediesel.com","email_verified":true}',
    now(), now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- FRANCHISE UNIT — dev test (Japão → slug /japao)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.franchise_units (id, name, document, contract_type, contract_start_date, contract_end_date) VALUES
  ('11111111-0000-0000-0000-000000000003', 'Japão', '00.000.000/0003-03', 'full', '2024-01-01', '2025-12-31')
ON CONFLICT (id) DO UPDATE SET
  contract_start_date = EXCLUDED.contract_start_date,
  contract_end_date   = EXCLUDED.contract_end_date;

INSERT INTO public.user_unit_roles (user_id, unit_id, role) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'franchise_manager')
ON CONFLICT (user_id, unit_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.customers (id, name, document, phone, email, unit_id) VALUES
  ('cc000001-0000-0000-0000-000000000001', 'João Carlos Silva',       '123.456.789-01', '(11) 99101-1001', 'joao.silva@email.com',     '11111111-0000-0000-0000-000000000001'),
  ('cc000001-0000-0000-0000-000000000002', 'Marina Fernandes',        '234.567.890-02', '(11) 99102-1002', 'marina.f@email.com',        '11111111-0000-0000-0000-000000000001'),
  ('cc000001-0000-0000-0000-000000000003', 'Roberto Alves de Souza',  '345.678.901-03', '(21) 99103-1003', 'roberto.as@email.com',      '11111111-0000-0000-0000-000000000002'),
  ('cc000001-0000-0000-0000-000000000004', 'Carla Mendes Pacheco',    '456.789.012-04', '(21) 99104-1004', 'carla.mp@email.com',        '11111111-0000-0000-0000-000000000002'),
  ('cc000001-0000-0000-0000-000000000005', 'Fábio Luchesi',           '567.890.123-05', '(11) 99105-1005', 'fabio.l@email.com',         '11111111-0000-0000-0000-000000000001'),
  ('cc000001-0000-0000-0000-000000000006', 'Ana Paula Ramos',         '678.901.234-06', '(21) 99106-1006', 'ana.ramos@email.com',       '11111111-0000-0000-0000-000000000002'),
  ('cc000001-0000-0000-0000-000000000007', 'Thiago Barbosa',          '789.012.345-07', '(11) 99107-1007', 'thiago.b@email.com',        '11111111-0000-0000-0000-000000000001'),
  ('cc000001-0000-0000-0000-000000000008', 'Luciana Torres',          '890.123.456-08', '(21) 99108-1008', 'lu.torres@email.com',       '11111111-0000-0000-0000-000000000002'),
  ('cc000001-0000-0000-0000-000000000009', 'Marcelo Cunha',           '901.234.567-09', '(11) 99109-1009', 'marcelo.c@email.com',       '11111111-0000-0000-0000-000000000001'),
  ('cc000001-0000-0000-0000-000000000010', 'Patrícia Neves Oliveira', '012.345.678-10', '(21) 99110-1010', 'patricia.no@email.com',     '11111111-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- ECU JOBS — spread across last 3 months, 2 units, varied statuses
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.ecu_jobs
  (id, customer_id, unit_id, service_type, status, amount_charged_to_customer, problem_description, created_at)
VALUES
  -- SP Centro — last 7 days
  ('ee000001-0000-0000-0000-000000000001','cc000001-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','Remapeamento Estágio 1','concluido',        650.00,'Ganho de torque pedido pelo cliente',   now() - interval '1 day'),
  ('ee000001-0000-0000-0000-000000000002','cc000001-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001','Remapeamento Estágio 2','em_processamento', 980.00,'Ajuste de combustível e turbo',         now() - interval '2 days'),
  ('ee000001-0000-0000-0000-000000000003','cc000001-0000-0000-0000-000000000005','11111111-0000-0000-0000-000000000001','EGR/DPF Off',          'recebido',         420.00,'Remoção de EGR e DPF',                  now() - interval '3 days'),
  ('ee000001-0000-0000-0000-000000000004','cc000001-0000-0000-0000-000000000007','11111111-0000-0000-0000-000000000001','Remapeamento Estágio 1','em_triagem',       650.00,'Verificação inicial solicitada',        now() - interval '4 days'),
  ('ee000001-0000-0000-0000-000000000005','cc000001-0000-0000-0000-000000000009','11111111-0000-0000-0000-000000000001','Pop & Bang',           'concluido',        380.00,'Ativação de Pop & Bang',                now() - interval '5 days'),
  -- SP Centro — last 30 days
  ('ee000001-0000-0000-0000-000000000006','cc000001-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','Remapeamento Estágio 2','concluido',        980.00,'Segunda etapa concluída',               now() - interval '10 days'),
  ('ee000001-0000-0000-0000-000000000007','cc000001-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001','Launch Control',       'concluido',        450.00,'Ativação de Launch Control',            now() - interval '12 days'),
  ('ee000001-0000-0000-0000-000000000008','cc000001-0000-0000-0000-000000000005','11111111-0000-0000-0000-000000000001','Remapeamento Estágio 1','concluido',        650.00,'Estágio 1 concluído com êxito',         now() - interval '15 days'),
  ('ee000001-0000-0000-0000-000000000009','cc000001-0000-0000-0000-000000000007','11111111-0000-0000-0000-000000000001','EGR/DPF Off',          'aguardando_cliente',420.00,'Aguardando aprovação do cliente',       now() - interval '18 days'),
  ('ee000001-0000-0000-0000-000000000010','cc000001-0000-0000-0000-000000000009','11111111-0000-0000-0000-000000000001','Remapeamento Agrícola','concluido',        780.00,'Trator John Deere 5075E',               now() - interval '22 days'),
  ('ee000001-0000-0000-0000-000000000011','cc000001-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','Remapeamento Estágio 1','concluido',        650.00,'Golf GTI — cliente frequente',          now() - interval '25 days'),
  ('ee000001-0000-0000-0000-000000000012','cc000001-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001','Correção de Erros',    'concluido',        280.00,'Remoção de erros de catalisador',       now() - interval '28 days'),
  -- SP Centro — 2–3 months ago
  ('ee000001-0000-0000-0000-000000000013','cc000001-0000-0000-0000-000000000005','11111111-0000-0000-0000-000000000001','Remapeamento Estágio 2','concluido',        980.00,'Estágio 2 — Amarok TDI',                now() - interval '35 days'),
  ('ee000001-0000-0000-0000-000000000014','cc000001-0000-0000-0000-000000000007','11111111-0000-0000-0000-000000000001','Remapeamento Estágio 1','concluido',        650.00,'Tiguan 2.0 TSI 200cv',                  now() - interval '42 days'),
  ('ee000001-0000-0000-0000-000000000015','cc000001-0000-0000-0000-000000000009','11111111-0000-0000-0000-000000000001','EGR/DPF Off',          'concluido',        420.00,'S10 2.8 diesel EGR off',                now() - interval '50 days'),
  ('ee000001-0000-0000-0000-000000000016','cc000001-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','Remapeamento Agrícola','concluido',        850.00,'Massey Ferguson 7245 XFD',              now() - interval '60 days'),
  ('ee000001-0000-0000-0000-000000000017','cc000001-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001','Pop & Bang',           'concluido',        380.00,'Cupra Formentor',                       now() - interval '70 days'),
  ('ee000001-0000-0000-0000-000000000018','cc000001-0000-0000-0000-000000000005','11111111-0000-0000-0000-000000000001','Remapeamento Estágio 1','concluido',        650.00,'Jetta 1.4 TSI GLi',                     now() - interval '80 days'),
  -- RJ Norte — last 7 days
  ('ee000001-0000-0000-0000-000000000019','cc000001-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000002','Remapeamento Estágio 1','concluido',        720.00,'Hilux SW4 2.8 TDI 204cv',               now() - interval '1 day'),
  ('ee000001-0000-0000-0000-000000000020','cc000001-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000002','Remapeamento Estágio 2','em_processamento',1100.00,'Ranger Raptor — ajuste de turbo',       now() - interval '2 days'),
  ('ee000001-0000-0000-0000-000000000021','cc000001-0000-0000-0000-000000000006','11111111-0000-0000-0000-000000000002','EGR/DPF Off',          'em_triagem',       480.00,'F-250 6.7 — remoção de DPF',           now() - interval '3 days'),
  ('ee000001-0000-0000-0000-000000000022','cc000001-0000-0000-0000-000000000008','11111111-0000-0000-0000-000000000002','Remapeamento Estágio 1','recebido',         720.00,'Corolla Cross hybrid',                  now() - interval '4 days'),
  -- RJ Norte — last 30 days
  ('ee000001-0000-0000-0000-000000000023','cc000001-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000002','Remapeamento Agrícola','concluido',        900.00,'Valtra T215 — remap potência',          now() - interval '9 days'),
  ('ee000001-0000-0000-0000-000000000024','cc000001-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000002','Remapeamento Estágio 2','concluido',       1100.00,'X5 xDrive 40d — Estágio 2',            now() - interval '14 days'),
  ('ee000001-0000-0000-0000-000000000025','cc000001-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000002','Launch Control',       'concluido',        500.00,'BMW M340i xDrive',                     now() - interval '17 days'),
  ('ee000001-0000-0000-0000-000000000026','cc000001-0000-0000-0000-000000000006','11111111-0000-0000-0000-000000000002','Pop & Bang',           'concluido',        420.00,'Golf R 300cv',                          now() - interval '20 days'),
  ('ee000001-0000-0000-0000-000000000027','cc000001-0000-0000-0000-000000000008','11111111-0000-0000-0000-000000000002','Remapeamento Estágio 1','concluido',        720.00,'Amarok Extreme 3.0 V6',                 now() - interval '24 days'),
  ('ee000001-0000-0000-0000-000000000028','cc000001-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000002','EGR/DPF Off',          'concluido',        480.00,'Hilux 2.8 diesel EGR/DPF off',         now() - interval '27 days'),
  -- RJ Norte — 2–3 months ago
  ('ee000001-0000-0000-0000-000000000029','cc000001-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000002','Remapeamento Estágio 2','concluido',       1100.00,'GLA 250 — Estágio 2 completo',         now() - interval '36 days'),
  ('ee000001-0000-0000-0000-000000000030','cc000001-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000002','Remapeamento Estágio 1','concluido',        720.00,'Classe C 220d — torque + consumo',     now() - interval '45 days'),
  ('ee000001-0000-0000-0000-000000000031','cc000001-0000-0000-0000-000000000006','11111111-0000-0000-0000-000000000002','Remapeamento Agrícola','concluido',        850.00,'John Deere 6155R — potência máxima',   now() - interval '55 days'),
  ('ee000001-0000-0000-0000-000000000032','cc000001-0000-0000-0000-000000000008','11111111-0000-0000-0000-000000000002','Correção de Erros',    'concluido',        310.00,'Remoção de lambdas e adblue',          now() - interval '65 days'),
  ('ee000001-0000-0000-0000-000000000033','cc000001-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000002','Remapeamento Estágio 1','concluido',        720.00,'Tiguan Allspace 2.0 TSI',              now() - interval '75 days'),
  ('ee000001-0000-0000-0000-000000000034','cc000001-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000002','EGR/DPF Off',          'concluido',        480.00,'Sprinter 415 CDI — DPF off',           now() - interval '85 days')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- ECU CATALOG — registros realistas de remapeamento Brasil
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.ecu_catalog
  (categoria, categoria_slug, marca, secao_original, modelo_descricao, ano, ganho,
   cv_original, cv_tuned, aparelho, protocolo, preco_franqueado, preco_cliente_final, ativo)
VALUES
  -- ── CARROS & SUVs ───────────────────────────────────────────
  ('Carros & SUVs','carros-e-suvs','VW',      'A1','Polo 1.0 TSI - 116CV',         '2020-2024','ATÉ +24CV E 3KG',   116,140,'Kess v2',     'OBD',  380.00, 580.00, true),
  ('Carros & SUVs','carros-e-suvs','VW',      'A3','Golf GTI 2.0 TSI - 230CV',     '2020-2024','ATÉ +45CV E 7KG',   230,275,'CMD Flash',   'OBD',  680.00,1050.00, true),
  ('Carros & SUVs','carros-e-suvs','VW',      'A3','Golf R 2.0 TSI - 300CV',       '2021-2024','ATÉ +55CV E 9KG',   300,355,'CMD Flash',   'OBD',  780.00,1200.00, true),
  ('Carros & SUVs','carros-e-suvs','VW',      'B7','Jetta 1.4 TSI GLi - 150CV',    '2019-2023','ATÉ +35CV E 5KG',   150,185,'Kess v2',     'OBD',  480.00, 750.00, true),
  ('Carros & SUVs','carros-e-suvs','VW',      'B8','Jetta GLi 2.0 TSI - 230CV',    '2022-2024','ATÉ +45CV E 7KG',   230,275,'CMD Flash',   'OBD',  680.00,1050.00, true),
  ('Carros & SUVs','carros-e-suvs','VW',      'C5','Tiguan 2.0 TSI R-Line 200CV',  '2019-2024','ATÉ +40CV E 6KG',   200,240,'Kess v2',     'OBD',  580.00, 890.00, true),
  ('Carros & SUVs','carros-e-suvs','BMW',     'F30','320i 2.0 TwinPower 184CV',    '2018-2022','ATÉ +50CV E 8KG',   184,234,'CMD Flash',   'OBD',  650.00,1000.00, true),
  ('Carros & SUVs','carros-e-suvs','BMW',     'G20','320i 2.0 - 184CV',            '2022-2024','ATÉ +50CV E 8KG',   184,234,'Autotuner',   'OBD',  680.00,1050.00, true),
  ('Carros & SUVs','carros-e-suvs','BMW',     'G20','M340i xDrive 3.0 - 374CV',    '2020-2024','ATÉ +60CV E 10KG',  374,434,'Autotuner',   'OBD',  950.00,1450.00, true),
  ('Carros & SUVs','carros-e-suvs','Audi',    'A3','A3 Sportback 1.4 TFSI 122CV',  '2019-2022','ATÉ +30CV E 4,2KG', 122,152,'Kess v2',     'OBD',  450.00, 690.00, true),
  ('Carros & SUVs','carros-e-suvs','Audi',    'A4','A4 2.0 TFSI 190CV',            '2019-2023','ATÉ +45CV E 7KG',   190,235,'CMD Flash',   'OBD',  650.00,1000.00, true),
  ('Carros & SUVs','carros-e-suvs','Audi',    'B9','RS3 2.5 TFSI 400CV',           '2021-2024','ATÉ +50CV E 8KG',   400,450,'Autotuner',   'OBD', 1100.00,1680.00, true),
  ('Carros & SUVs','carros-e-suvs','Mercedes','W213','C 200 2.0 Turbo 197CV',      '2019-2023','ATÉ +48CV E 7,5KG', 197,245,'CMD Flash',   'OBD',  680.00,1050.00, true),
  ('Carros & SUVs','carros-e-suvs','Mercedes','W206','C 300 2.0 Turbo 258CV',      '2022-2024','ATÉ +52CV E 8KG',   258,310,'Autotuner',   'OBD',  780.00,1200.00, true),
  ('Carros & SUVs','carros-e-suvs','Toyota',  'E21','Corolla Cross 2.0 Dynamic 177CV','2022-2024','ATÉ +25CV E 4KG', 177,202,'Kess v2',    'OBD',  480.00, 750.00, true),
  ('Carros & SUVs','carros-e-suvs','Chevrolet','J300','Tracker 1.0 Turbo 116CV',   '2020-2024','ATÉ +28CV E 4,5KG', 116,144,'Kess v2',    'OBD',  380.00, 590.00, true),
  ('Carros & SUVs','carros-e-suvs','Fiat',    'Pulse','Pulse 1.0 Turbo 130CV',     '2022-2024','ATÉ +25CV E 4KG',   130,155,'Kess v2',     'OBD',  350.00, 540.00, true),
  ('Carros & SUVs','carros-e-suvs','Cupra',   'KM8','Formentor VZ 2.0 TSI 310CV',  '2021-2024','ATÉ +55CV E 9KG',   310,365,'CMD Flash',   'OBD',  850.00,1300.00, true),

  -- ── PICKUPS ─────────────────────────────────────────────────
  ('Pickups','pickups','VW',        'SQ','Amarok TDI 2.0 204CV',         '2017-2022','ATÉ +45CV E 10KG', 204,249,'Kess v2',     'OBD',  580.00, 890.00, true),
  ('Pickups','pickups','VW',        'CR','Amarok V6 3.0 TDI 258CV',      '2019-2024','ATÉ +60CV E 13KG', 258,318,'CMD Flash',   'OBD',  780.00,1200.00, true),
  ('Pickups','pickups','VW',        'CR','Amarok Extreme V6 3.0 TDI 258CV','2022-2024','ATÉ +60CV E 13KG',258,318,'Autotuner',  'OBD',  850.00,1300.00, true),
  ('Pickups','pickups','Toyota',    'N80','Hilux 2.8 TDI 204CV',         '2016-2023','ATÉ +50CV E 10KG', 204,254,'Kess v2',     'OBD',  650.00,1000.00, true),
  ('Pickups','pickups','Toyota',    'N80','Hilux SW4 2.8 TDI 204CV',     '2016-2023','ATÉ +50CV E 10KG', 204,254,'CMD Flash',   'OBD',  680.00,1050.00, true),
  ('Pickups','pickups','Ford',      'P703','Ranger Storm 3.2 TDCi 200CV','2017-2022','ATÉ +55CV E 12KG', 200,255,'Kess v2',     'OBD',  680.00,1050.00, true),
  ('Pickups','pickups','Ford',      'P703','Ranger Raptor 2.0 Bi-Turbo 213CV','2019-2023','ATÉ +50CV E 10KG',213,263,'CMD Flash', 'OBD', 750.00,1150.00, true),
  ('Pickups','pickups','GM',        'RG','S10 2.8 TDI 200CV',            '2017-2023','ATÉ +50CV E 12KG', 200,250,'Kess v2',     'OBD',  650.00,1000.00, true),
  ('Pickups','pickups','GM',        'RG','S10 High Country 2.8 200CV',   '2020-2024','ATÉ +50CV E 12KG', 200,250,'CMD Flash',   'OBD',  680.00,1050.00, true),
  ('Pickups','pickups','RAM',       'DS','RAM 1500 5.7 HEMI V8 395CV',   '2020-2024','ATÉ +40CV E 6KG',  395,435,'Autotuner',   'OBD',  950.00,1450.00, true),
  ('Pickups','pickups','Mitsubishi','KB4T','L200 Triton Sport 2.4 190CV','2020-2024','ATÉ +40CV E 9KG',  190,230,'Kess v2',     'OBD',  580.00, 890.00, true),

  -- ── TRUCKS ──────────────────────────────────────────────────
  ('Trucks','trucks','Mercedes','OM936','Axor 2536 360CV',               '2017-2022','ATÉ +40CV E 15KG', 360,400,'Ktag',        'BOOT', 850.00,1300.00, true),
  ('Trucks','trucks','Mercedes','OM471','Actros 2651 510CV',             '2019-2024','ATÉ +50CV E 18KG', 510,560,'Ktag',        'JTAG', 950.00,1450.00, true),
  ('Trucks','trucks','Volvo',   'D13','FH 540 6x4 540CV',               '2018-2023','ATÉ +50CV E 20KG', 540,590,'CMD Flash',   'OBD', 1000.00,1550.00, true),
  ('Trucks','trucks','Scania',  'DC13','R450 450CV',                     '2019-2024','ATÉ +55CV E 18KG', 450,505,'CMD Flash',   'OBD',  950.00,1450.00, true),
  ('Trucks','trucks','MAN',     'D2676','TGX 540 6x4 540CV',            '2020-2024','ATÉ +50CV E 20KG', 540,590,'Ktag',        'BDM', 1000.00,1550.00, true),
  ('Trucks','trucks','Ford',    'P415','F-4000 4x4 Turbo 163CV',        '2016-2022','ATÉ +40CV E 12KG', 163,203,'Kess v2',     'OBD',  680.00,1050.00, true),
  ('Trucks','trucks','Ford',    'P688','F-250 6.7 Power Stroke 400CV',  '2019-2024','ATÉ +60CV E 15KG', 400,460,'CMD Flash',   'OBD',  850.00,1300.00, true),
  ('Trucks','trucks','Iveco',   'F1C','Daily 70C17 170CV',              '2018-2023','ATÉ +40CV E 10KG', 170,210,'Ktag',        'BOOT', 720.00,1100.00, true),

  -- ── AGRÍCOLA ────────────────────────────────────────────────
  ('Agrícola','agricola','John Deere','PowerTech','5075E 75CV',          '2018-2023','ATÉ +20CV E 8KG',   75, 95,'Ktag',        'BDM',  780.00,1200.00, true),
  ('Agrícola','agricola','John Deere','PowerTech','6110J 110CV',         '2018-2023','ATÉ +28CV E 10KG', 110,138,'Ktag',        'BDM',  850.00,1300.00, true),
  ('Agrícola','agricola','John Deere','PowerTech','6155R 155CV',         '2019-2024','ATÉ +35CV E 12KG', 155,190,'Ktag',        'JTAG', 950.00,1450.00, true),
  ('Agrícola','agricola','John Deere','FT4',      '8R 340 340CV',        '2020-2024','ATÉ +40CV E 15KG', 340,380,'Ktag',        'JTAG',1100.00,1680.00, true),
  ('Agrícola','agricola','Massey Ferguson','AGCO Power','7245 XFD 245CV','2018-2023','ATÉ +35CV E 12KG', 245,280,'Kess v2',    'OBD',  950.00,1450.00, true),
  ('Agrícola','agricola','Massey Ferguson','AGCO Power','8780 280CV',    '2019-2024','ATÉ +45CV E 15KG', 280,325,'Kess v2',    'OBD', 1050.00,1600.00, true),
  ('Agrícola','agricola','Valtra',      'AGCO Power','T215 215CV',       '2019-2024','ATÉ +35CV E 12KG', 215,250,'Kess v2',    'OBD',  900.00,1380.00, true),
  ('Agrícola','agricola','Valtra',      'AGCO Power','S305 305CV',       '2020-2024','ATÉ +45CV E 15KG', 305,350,'Autotuner',  'OBD', 1050.00,1600.00, true),
  ('Agrícola','agricola','New Holland', 'NEF',      'T7.260 260CV',      '2019-2024','ATÉ +40CV E 14KG', 260,300,'Ktag',       'BDM',  980.00,1500.00, true),
  ('Agrícola','agricola','Case',        'FPT',      'Farmall 115C 115CV','2018-2023','ATÉ +25CV E 9KG',  115,140,'Ktag',       'BOOT', 780.00,1200.00, true),

  -- ── MÁQUINAS ────────────────────────────────────────────────
  ('Máquinas','maquinas','Caterpillar','C7.1','320 Escavadeira 161CV',   '2018-2023','ATÉ +30CV E 12KG', 161,191,'Ktag',        'JTAG',1000.00,1550.00, true),
  ('Máquinas','maquinas','Caterpillar','C9.3','330 Escavadeira 235CV',   '2020-2024','ATÉ +40CV E 14KG', 235,275,'Ktag',        'JTAG',1100.00,1680.00, true),
  ('Máquinas','maquinas','Komatsu',    'SAA6D','PC300 220CV',            '2018-2023','ATÉ +35CV E 12KG', 220,255,'Ktag',        'BDM', 1050.00,1600.00, true),
  ('Máquinas','maquinas','Volvo',      'D4E','ECR145E Miniescavadeira 114CV','2019-2023','ATÉ +20CV E 8KG',114,134,'CMD Flash', 'OBD',  850.00,1300.00, true),
  ('Máquinas','maquinas','JCB',        'EcoMAX','3CX Retroescavadeira 109CV','2018-2023','ATÉ +22CV E 9KG',109,131,'Kess v2',  'OBD',  780.00,1200.00, true),
  ('Máquinas','maquinas','Liebherr',   'D946','R926 Escavadeira 220CV', '2019-2024','ATÉ +35CV E 12KG', 220,255,'Ktag',        'BDM', 1050.00,1600.00, true),

  -- ── MOTOS ───────────────────────────────────────────────────
  ('Motos','motos','BMW',     'S1000RR','S1000RR 210CV',                 '2019-2023','ATÉ +15CV',         210,225,'Autotuner',   'OBD',  550.00, 850.00, true),
  ('Motos','motos','BMW',     'F900R','F900R 105CV',                     '2020-2024','ATÉ +12CV',         105,117,'Autotuner',   'OBD',  420.00, 650.00, true),
  ('Motos','motos','Ducati',  'V4','Panigale V4 214CV',                  '2019-2024','ATÉ +16CV',         214,230,'Autotuner',   'OBD',  680.00,1050.00, true),
  ('Motos','motos','Honda',   'CBR','CBR 1000RR-R Fireblade 217CV',     '2020-2024','ATÉ +15CV',         217,232,'Autotuner',   'OBD',  620.00, 950.00, true),
  ('Motos','motos','Kawasaki','ZX','ZX-10R 210CV',                       '2020-2024','ATÉ +15CV',         210,225,'Autotuner',   'OBD',  580.00, 890.00, true),
  ('Motos','motos','Yamaha',  'YZF','YZF-R1 200CV',                      '2019-2023','ATÉ +12CV',         200,212,'Autotuner',   'OBD',  550.00, 850.00, true),
  ('Motos','motos','KTM',     '1290','1290 Super Duke R 180CV',          '2020-2024','ATÉ +15CV',         180,195,'Autotuner',   'OBD',  520.00, 800.00, true)

ON CONFLICT DO NOTHING;
