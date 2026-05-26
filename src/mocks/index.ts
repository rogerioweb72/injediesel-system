/**
 * Mock mode — active when VITE_MOCK=true.
 * Patches supabase auth + from() to return fake data. No real backend needed.
 */
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

// ─── Mock identity ────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  email: 'admin@promaxtuner.com',
  role: 'authenticated',
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
} as unknown as User

const MOCK_SESSION = {
  user: MOCK_USER,
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 9999999,
  token_type: 'bearer',
} as unknown as Session

const MOCK_PROFILE = {
  id: MOCK_USER.id,
  name: 'Admin Master',
  email: 'admin@promaxtuner.com',
  role: 'company_admin' as const,
  active: true,
}

// ─── Mock data tables ─────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>

const MOCK_DB: Record<string, AnyRecord[]> = {
  profiles: [
    { id: MOCK_USER.id,                              name: 'Admin Master',     role: 'company_admin',     active: true,  created_at: '2024-01-01T00:00:00Z' },
    { id: 'bbbbbbbb-0000-0000-0000-000000000002',    name: 'Carlos Operações', role: 'operations_admin',  active: true,  created_at: '2024-01-15T00:00:00Z' },
    { id: 'cccccccc-0000-0000-0000-000000000003',    name: 'Fernanda Suporte', role: 'support_agent',     active: true,  created_at: '2024-02-01T00:00:00Z' },
    { id: 'dddddddd-0000-0000-0000-000000000004',    name: 'Rafael Vendas',    role: 'seller',            active: true,  created_at: '2024-03-01T00:00:00Z' },
    { id: 'eeeeeeee-0000-0000-0000-000000000005',    name: 'Lucia Financeiro', role: 'finance_admin',     active: false, created_at: '2024-04-01T00:00:00Z' },
    { id: 'ffffffff-0000-0000-0000-000000000006',    name: 'André Auditor',    role: 'auditor',           active: true,  created_at: '2024-05-01T00:00:00Z' },
  ],

  company_settings: [
    {
      id: 'settings-0000-0000-0000-000000000001',
      name: 'Promax Tuner',
      cnpj: '00.000.000/0001-00',
      email: 'contato@promaxtuner.com',
      phone: '(11) 3000-4000',
      address: { street: 'Av. Paulista, 1000', city: 'São Paulo', state: 'SP', zip: '01310-100' },
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],

  customers: [
    {
      id: 'c1000', name: 'João Silva', email: 'joao@email.com',
      phone: '(11) 99999-1111', document: '123.456.789-00',
      active: true, price_tier: 'cliente_final', franchise_unit_id: null,
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'c1001', name: 'Maria Oliveira', email: 'maria@empresa.com',
      phone: '(21) 98888-2222', document: '98.765.432/0001-11',
      active: true, price_tier: 'franqueado_linha_leve', franchise_unit_id: 'fu-001',
      created_at: '2024-02-10T14:00:00Z',
    },
    {
      id: 'c1002', name: 'Carlos Mendes', email: null,
      phone: '(31) 97777-3333', document: null,
      active: false, price_tier: 'cliente_final', franchise_unit_id: null,
      created_at: '2024-03-05T09:00:00Z',
    },
    {
      id: 'c1003', name: 'Frota Agro Ltda', email: 'frota@agro.com',
      phone: '(65) 96666-4444', document: '11.222.333/0001-44',
      active: true, price_tier: 'franqueado_full', franchise_unit_id: 'fu-002',
      created_at: '2024-04-20T11:00:00Z',
    },
  ],

  vehicles: [
    {
      id: 'v1', customer_id: 'c1000', plate: 'ABC1234',
      brand: 'Volkswagen', model: 'Golf GTI', year: 2021,
      vehicle_type: 'automotivo', engine: '2.0 TSI', notes: null,
      created_at: '2024-01-16T10:00:00Z',
    },
    {
      id: 'v2', customer_id: 'c1000', plate: 'XYZ9876',
      brand: 'BMW', model: '320i', year: 2019,
      vehicle_type: 'automotivo', engine: '2.0 Turbo', notes: 'Stage 2 solicitado',
      created_at: '2024-02-01T10:00:00Z',
    },
    {
      id: 'v3', customer_id: 'c1003', plate: null,
      brand: 'John Deere', model: 'S790', year: 2022,
      vehicle_type: 'maquina_agricola', engine: '9.0L PowerTech', notes: 'Colheitadeira',
      created_at: '2024-04-21T10:00:00Z',
    },
  ],

  products: [
    {
      id: 'p001', sku: '1001', code: null, name: 'BOTÃO PRO BOOSTER 5V',
      category: 'Man. e Acessórios', description: null, active: true, stock: 15, cost_price: null,
      image_url: 'https://images.tcdn.com.br/img/img_prod/1392966/botao_pro_booster_5v_1001_1_376c6a34cd5783ec5d5f71e05480c2fd.jpg',
      created_at: '2024-01-01T00:00:00Z',
      product_prices: [
        { id: 'pp-001-cf', product_id: 'p001', tier: 'cliente_final',           price: 60.00 },
        { id: 'pp-001-ll', product_id: 'p001', tier: 'franqueado_linha_leve',   price: 54.00 },
        { id: 'pp-001-fu', product_id: 'p001', tier: 'franqueado_full',         price: 48.00 },
      ],
    },
    {
      id: 'p002', sku: '1005', code: null, name: 'FILTRO DE AR ESPORTIVO K&N UNIVERSAL',
      category: 'Filtros de Ar', description: 'Alta performance, lavável', active: true, stock: 8, cost_price: null,
      image_url: 'https://images.tcdn.com.br/img/img_prod/1392966/conj_5_refil_20_para_c_5_1005_1_8774642e6c9be01d9cae1a9a2edb60a6.jpg',
      created_at: '2024-01-01T00:00:00Z',
      product_prices: [
        { id: 'pp-002-cf', product_id: 'p002', tier: 'cliente_final',           price: 350.00 },
        { id: 'pp-002-ll', product_id: 'p002', tier: 'franqueado_linha_leve',   price: 315.00 },
        { id: 'pp-002-fu', product_id: 'p002', tier: 'franqueado_full',         price: 280.00 },
      ],
    },
    {
      id: 'p003', sku: '1012', code: null, name: 'PIGGY BACK STAGE 1 FLEX',
      category: 'Piggy Back', description: 'Compatível com motores flex 1.0 a 2.0', active: true, stock: 5, cost_price: null,
      image_url: null,
      created_at: '2024-01-01T00:00:00Z',
      product_prices: [
        { id: 'pp-003-cf', product_id: 'p003', tier: 'cliente_final',           price: 890.00 },
        { id: 'pp-003-ll', product_id: 'p003', tier: 'franqueado_linha_leve',   price: 801.00 },
        { id: 'pp-003-fu', product_id: 'p003', tier: 'franqueado_full',         price: 712.00 },
      ],
    },
    {
      id: 'p004', sku: '1020', code: null, name: 'DOWNPIPE INOX 3" UNIVERSAL',
      category: 'Downpipe', description: null, active: true, stock: 3, cost_price: null,
      image_url: null,
      created_at: '2024-01-01T00:00:00Z',
      product_prices: [
        { id: 'pp-004-cf', product_id: 'p004', tier: 'cliente_final',           price: 1200.00 },
        { id: 'pp-004-ll', product_id: 'p004', tier: 'franqueado_linha_leve',   price: 1080.00 },
        { id: 'pp-004-fu', product_id: 'p004', tier: 'franqueado_full',         price: 960.00 },
      ],
    },
    {
      id: 'p005', sku: '1031', code: null, name: 'FILTRO DE COMBUSTÍVEL RACOR',
      category: 'Filtros de Combustível', description: 'Alta filtragem diesel', active: true, stock: 0, cost_price: null,
      image_url: null,
      created_at: '2024-01-01T00:00:00Z',
      product_prices: [
        { id: 'pp-005-cf', product_id: 'p005', tier: 'cliente_final',           price: 180.00 },
        { id: 'pp-005-ll', product_id: 'p005', tier: 'franqueado_linha_leve',   price: 162.00 },
        { id: 'pp-005-fu', product_id: 'p005', tier: 'franqueado_full',         price: 144.00 },
      ],
    },
  ],

  product_prices: [], // queried via join on products, not directly

  ecu_jobs: [
    {
      id: 'job-0001-0000-0000-000000000001', customer_id: 'c1000', vehicle_id: 'v1',
      unit_id: 'fu-001', service_type: 'Remapeamento Estágio 1', priority: 'alta',
      status: 'em_processamento', problem_description: 'Cliente quer mais torque na faixa baixa.',
      assigned_to: null, due_at: '2026-05-20T00:00:00Z',
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-10T09:00:00Z', updated_at: '2026-05-12T14:00:00Z',
      amount_charged_to_customer: 500.00,
      amount_charged_by_matrix: 150.00,
      franchise_margin_amount: 350.00,
      franchise_margin_percentage: 70.00,
      customers: { name: 'João Silva', email: 'joao@email.com' },
      vehicles: { brand: 'Volkswagen', model: 'Golf GTI', plate: 'ABC1234' },
      franchise_units: { name: 'Promax SP Centro', city: 'São Paulo', state: 'SP' },
      ecu_job_files: [
        {
          id: 'file-001', job_id: 'job-0001-0000-0000-000000000001',
          file_type: 'original', r2_key: 'mock/job-0001/original/golf_gti_original.bin',
          file_name: 'golf_gti_original.bin', mime_type: 'application/octet-stream',
          size_bytes: 524288, created_at: '2026-05-10T09:05:00Z',
        },
      ],
      ecu_job_events: [
        {
          id: 'ev-001', job_id: 'job-0001-0000-0000-000000000001',
          actor_id: 'aaaaaaaa-0000-0000-0000-000000000001',
          event_type: 'status_change', payload: { new_status: 'em_triagem' },
          created_at: '2026-05-10T09:10:00Z',
        },
        {
          id: 'ev-002', job_id: 'job-0001-0000-0000-000000000001',
          actor_id: 'aaaaaaaa-0000-0000-0000-000000000001',
          event_type: 'status_change', payload: { new_status: 'em_processamento' },
          created_at: '2026-05-12T14:00:00Z',
        },
      ],
    },
    {
      id: 'job-0002-0000-0000-000000000002', customer_id: 'c1001', vehicle_id: null,
      unit_id: 'fu-001', service_type: 'Remoção EGR', priority: 'normal',
      status: 'recebido', problem_description: null,
      assigned_to: null, due_at: null,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-13T11:00:00Z', updated_at: '2026-05-13T11:00:00Z',
      amount_charged_to_customer: 280.00,
      amount_charged_by_matrix: null,
      franchise_margin_amount: null,
      franchise_margin_percentage: null,
      customers: { name: 'Maria Oliveira', email: 'maria@empresa.com' },
      vehicles: null,
      franchise_units: { name: 'Promax SP Centro', city: 'São Paulo', state: 'SP' },
      ecu_job_files: [],
      ecu_job_events: [],
    },
    {
      id: 'job-0003-0000-0000-000000000003', customer_id: 'c1003', vehicle_id: 'v3',
      unit_id: 'fu-002', service_type: 'Ajuste de Injeção', priority: 'critica',
      status: 'concluido', problem_description: 'Motor agrícola consumindo muito.',
      assigned_to: null, due_at: '2026-05-10T00:00:00Z',
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-05T08:00:00Z', updated_at: '2026-05-09T16:30:00Z',
      amount_charged_to_customer: 750.00,
      amount_charged_by_matrix: 200.00,
      franchise_margin_amount: 550.00,
      franchise_margin_percentage: 73.33,
      customers: { name: 'Frota Agro Ltda', email: 'frota@agro.com' },
      vehicles: { brand: 'John Deere', model: 'S790', plate: null },
      franchise_units: { name: 'Promax MT Agro', city: 'Sorriso', state: 'MT' },
      ecu_job_files: [
        {
          id: 'file-002', job_id: 'job-0003-0000-0000-000000000003',
          file_type: 'original', r2_key: 'mock/job-0003/original/s790_original.bin',
          file_name: 's790_original.bin', mime_type: 'application/octet-stream',
          size_bytes: 1048576, created_at: '2026-05-05T08:10:00Z',
        },
        {
          id: 'file-003', job_id: 'job-0003-0000-0000-000000000003',
          file_type: 'entrega', r2_key: 'mock/job-0003/entrega/s790_tuned.bin',
          file_name: 's790_tuned.bin', mime_type: 'application/octet-stream',
          size_bytes: 1048576, created_at: '2026-05-09T16:00:00Z',
        },
      ],
      ecu_job_events: [
        {
          id: 'ev-003', job_id: 'job-0003-0000-0000-000000000003',
          actor_id: 'aaaaaaaa-0000-0000-0000-000000000001',
          event_type: 'status_change', payload: { new_status: 'em_triagem' },
          created_at: '2026-05-05T09:00:00Z',
        },
        {
          id: 'ev-004', job_id: 'job-0003-0000-0000-000000000003',
          actor_id: 'aaaaaaaa-0000-0000-0000-000000000001',
          event_type: 'status_change', payload: { new_status: 'em_processamento' },
          created_at: '2026-05-06T08:00:00Z',
        },
        {
          id: 'ev-005', job_id: 'job-0003-0000-0000-000000000003',
          actor_id: 'aaaaaaaa-0000-0000-0000-000000000001',
          event_type: 'status_change', payload: { new_status: 'concluido' },
          created_at: '2026-05-09T16:30:00Z',
        },
      ],
    },
    // ── Additional jobs for dashboard rankings ─────────────────────────────────
    {
      id: 'job-0004-0000-0000-000000000004', customer_id: 'c1000', vehicle_id: 'v1',
      unit_id: 'fu-001', service_type: 'Remapeamento Estágio 2', priority: 'normal',
      status: 'concluido', problem_description: null, assigned_to: null, due_at: null,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-14T10:00:00Z', updated_at: '2026-05-14T16:00:00Z',
      amount_charged_to_customer: 800.00, amount_charged_by_matrix: 220.00,
      franchise_margin_amount: 580.00, franchise_margin_percentage: 72.50,
      customers: { name: 'João Silva', email: 'joao@email.com' },
      vehicles: { brand: 'Volkswagen', model: 'Golf GTI', plate: 'ABC1234' },
      franchise_units: { name: 'Promax SP Centro', city: 'São Paulo', state: 'SP' },
      ecu_job_files: [], ecu_job_events: [],
    },
    {
      id: 'job-0005-0000-0000-000000000005', customer_id: 'c1001', vehicle_id: null,
      unit_id: 'fu-001', service_type: 'Remoção DPF/FAP', priority: 'alta',
      status: 'concluido', problem_description: null, assigned_to: null, due_at: null,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-08T09:00:00Z', updated_at: '2026-05-09T15:00:00Z',
      amount_charged_to_customer: 600.00, amount_charged_by_matrix: 180.00,
      franchise_margin_amount: 420.00, franchise_margin_percentage: 70.00,
      customers: { name: 'Maria Oliveira', email: 'maria@empresa.com' },
      vehicles: null,
      franchise_units: { name: 'Promax SP Centro', city: 'São Paulo', state: 'SP' },
      ecu_job_files: [], ecu_job_events: [],
    },
    {
      id: 'job-0006-0000-0000-000000000006', customer_id: 'c1000', vehicle_id: 'v2',
      unit_id: 'fu-001', service_type: 'Remapeamento Estágio 1', priority: 'normal',
      status: 'recebido', problem_description: null, assigned_to: null, due_at: null,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-15T08:30:00Z', updated_at: '2026-05-15T08:30:00Z',
      amount_charged_to_customer: 500.00, amount_charged_by_matrix: null,
      franchise_margin_amount: null, franchise_margin_percentage: null,
      customers: { name: 'João Silva', email: 'joao@email.com' },
      vehicles: { brand: 'BMW', model: '320i', plate: 'XYZ9876' },
      franchise_units: { name: 'Promax SP Centro', city: 'São Paulo', state: 'SP' },
      ecu_job_files: [], ecu_job_events: [],
    },
    {
      id: 'job-0007-0000-0000-000000000007', customer_id: 'c1001', vehicle_id: null,
      unit_id: 'fu-001', service_type: 'Remoção EGR', priority: 'normal',
      status: 'cancelado', problem_description: 'Cliente desistiu.', assigned_to: null, due_at: null,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-01T11:00:00Z', updated_at: '2026-05-02T09:00:00Z',
      amount_charged_to_customer: 350.00, amount_charged_by_matrix: null,
      franchise_margin_amount: null, franchise_margin_percentage: null,
      customers: { name: 'Maria Oliveira', email: 'maria@empresa.com' },
      vehicles: null,
      franchise_units: { name: 'Promax SP Centro', city: 'São Paulo', state: 'SP' },
      ecu_job_files: [], ecu_job_events: [],
    },
    {
      id: 'job-0008-0000-0000-000000000008', customer_id: 'c1003', vehicle_id: 'v3',
      unit_id: 'fu-002', service_type: 'Remoção DPF/FAP', priority: 'alta',
      status: 'concluido', problem_description: null, assigned_to: null, due_at: null,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-11T08:00:00Z', updated_at: '2026-05-12T17:00:00Z',
      amount_charged_to_customer: 900.00, amount_charged_by_matrix: 250.00,
      franchise_margin_amount: 650.00, franchise_margin_percentage: 72.22,
      customers: { name: 'Frota Agro Ltda', email: 'frota@agro.com' },
      vehicles: { brand: 'John Deere', model: 'S790', plate: null },
      franchise_units: { name: 'Promax MT Agro', city: 'Sorriso', state: 'MT' },
      ecu_job_files: [], ecu_job_events: [],
    },
    {
      id: 'job-0009-0000-0000-000000000009', customer_id: 'c1003', vehicle_id: null,
      unit_id: 'fu-002', service_type: 'Remapeamento Estágio 3', priority: 'critica',
      status: 'em_triagem', problem_description: 'Tratora com baixa potência.', assigned_to: null, due_at: null,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-13T07:00:00Z', updated_at: '2026-05-13T07:00:00Z',
      amount_charged_to_customer: 1200.00, amount_charged_by_matrix: null,
      franchise_margin_amount: null, franchise_margin_percentage: null,
      customers: { name: 'Frota Agro Ltda', email: 'frota@agro.com' },
      vehicles: null,
      franchise_units: { name: 'Promax MT Agro', city: 'Sorriso', state: 'MT' },
      ecu_job_files: [], ecu_job_events: [],
    },
    {
      id: 'job-0010-0000-0000-000000000010', customer_id: 'c1003', vehicle_id: 'v3',
      unit_id: 'fu-002', service_type: 'Ajuste de Injeção', priority: 'normal',
      status: 'aguardando_cliente', problem_description: null, assigned_to: null, due_at: null,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-07T09:00:00Z', updated_at: '2026-05-08T11:00:00Z',
      amount_charged_to_customer: 400.00, amount_charged_by_matrix: 120.00,
      franchise_margin_amount: 280.00, franchise_margin_percentage: 70.00,
      customers: { name: 'Frota Agro Ltda', email: 'frota@agro.com' },
      vehicles: { brand: 'John Deere', model: 'S790', plate: null },
      franchise_units: { name: 'Promax MT Agro', city: 'Sorriso', state: 'MT' },
      ecu_job_files: [], ecu_job_events: [],
    },
    {
      id: 'job-0011-0000-0000-000000000011', customer_id: 'c1000', vehicle_id: null,
      unit_id: 'fu-003', service_type: 'Remapeamento Estágio 1', priority: 'normal',
      status: 'concluido', problem_description: null, assigned_to: null, due_at: null,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-12T10:00:00Z', updated_at: '2026-05-13T14:00:00Z',
      amount_charged_to_customer: 550.00, amount_charged_by_matrix: 160.00,
      franchise_margin_amount: 390.00, franchise_margin_percentage: 70.91,
      customers: { name: 'João Silva', email: 'joao@email.com' },
      vehicles: null,
      franchise_units: { name: 'Promax PR Cascavel', city: 'Cascavel', state: 'PR' },
      ecu_job_files: [], ecu_job_events: [],
    },
    {
      id: 'job-0012-0000-0000-000000000012', customer_id: 'c1001', vehicle_id: null,
      unit_id: 'fu-003', service_type: 'Remoção AdBlue', priority: 'alta',
      status: 'em_processamento', problem_description: null, assigned_to: null, due_at: null,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-14T08:00:00Z', updated_at: '2026-05-14T08:00:00Z',
      amount_charged_to_customer: 700.00, amount_charged_by_matrix: null,
      franchise_margin_amount: null, franchise_margin_percentage: null,
      customers: { name: 'Maria Oliveira', email: 'maria@empresa.com' },
      vehicles: null,
      franchise_units: { name: 'Promax PR Cascavel', city: 'Cascavel', state: 'PR' },
      ecu_job_files: [], ecu_job_events: [],
    },
    {
      id: 'job-0013-0000-0000-000000000013', customer_id: 'c1002', vehicle_id: null,
      unit_id: 'fu-003', service_type: 'Correção de Marcha Lenta', priority: 'normal',
      status: 'recebido', problem_description: null, assigned_to: null, due_at: null,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-15T07:30:00Z', updated_at: '2026-05-15T07:30:00Z',
      amount_charged_to_customer: 300.00, amount_charged_by_matrix: null,
      franchise_margin_amount: null, franchise_margin_percentage: null,
      customers: { name: 'Carlos Mendes', email: null },
      vehicles: null,
      franchise_units: { name: 'Promax PR Cascavel', city: 'Cascavel', state: 'PR' },
      ecu_job_files: [], ecu_job_events: [],
    },
    {
      id: 'job-0014-0000-0000-000000000014', customer_id: 'c1000', vehicle_id: 'v2',
      unit_id: 'fu-004', service_type: 'Remapeamento Estágio 2', priority: 'normal',
      status: 'concluido', problem_description: null, assigned_to: null, due_at: null,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-10T11:00:00Z', updated_at: '2026-05-11T15:00:00Z',
      amount_charged_to_customer: 750.00, amount_charged_by_matrix: 200.00,
      franchise_margin_amount: 550.00, franchise_margin_percentage: 73.33,
      customers: { name: 'João Silva', email: 'joao@email.com' },
      vehicles: { brand: 'BMW', model: '320i', plate: 'XYZ9876' },
      franchise_units: { name: 'Promax RS Porto Alegre', city: 'Porto Alegre', state: 'RS' },
      ecu_job_files: [], ecu_job_events: [],
    },
    {
      id: 'job-0015-0000-0000-000000000015', customer_id: 'c1001', vehicle_id: null,
      unit_id: 'fu-004', service_type: 'Remoção EGR', priority: 'normal',
      status: 'recebido', problem_description: null, assigned_to: null, due_at: null,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-15T09:00:00Z', updated_at: '2026-05-15T09:00:00Z',
      amount_charged_to_customer: 450.00, amount_charged_by_matrix: null,
      franchise_margin_amount: null, franchise_margin_percentage: null,
      customers: { name: 'Maria Oliveira', email: 'maria@empresa.com' },
      vehicles: null,
      franchise_units: { name: 'Promax RS Porto Alegre', city: 'Porto Alegre', state: 'RS' },
      ecu_job_files: [], ecu_job_events: [],
    },
  ],

  ecu_job_files: [],
  ecu_job_events: [],

  user_unit_roles: [
    // Mock: matrix admin não tem unit_role (isMatrixUser() = true → useMyUnit desabilitado)
    // Adicionar aqui para simular usuário de franquia se necessário
  ],

  franchise_units: [
    {
      id: 'fu-001', name: 'Promax SP Centro',
      cnpj: '00.000.000/0001-01', phone: '(11) 3333-4444', email: 'sp@promaxtuner.com',
      address: 'Av. Paulista, 1000', city: 'São Paulo', state: 'SP',
      contract_type: 'full', active: true, commission_rate: 15,
      manager_id: null, created_at: '2024-01-01T00:00:00Z',
      document: '00.000.000/0001-01',
    },
    {
      id: 'fu-002', name: 'Promax MT Agro',
      cnpj: '00.000.000/0002-02', phone: '(65) 9999-8888', email: 'mt@promaxtuner.com',
      address: 'Rod. BR-163, Km 10', city: 'Sorriso', state: 'MT',
      contract_type: 'linha_leve', active: true, commission_rate: 10,
      manager_id: null, created_at: '2024-02-01T00:00:00Z',
      document: '00.000.000/0002-02',
    },
    {
      id: 'fu-003', name: 'Promax PR Cascavel',
      cnpj: '00.000.000/0003-03', phone: '(45) 3333-5555', email: 'cascavel@promaxtuner.com',
      address: 'Rua XV de Novembro, 500', city: 'Cascavel', state: 'PR',
      contract_type: 'full', active: true, commission_rate: 15,
      manager_id: null, created_at: '2024-03-01T00:00:00Z',
      document: '00.000.000/0003-03',
    },
    {
      id: 'fu-004', name: 'Promax RS Porto Alegre',
      cnpj: '00.000.000/0004-04', phone: '(51) 4444-6666', email: 'poa@promaxtuner.com',
      address: 'Av. Ipiranga, 1200', city: 'Porto Alegre', state: 'RS',
      contract_type: 'linha_leve', active: true, commission_rate: 10,
      manager_id: null, created_at: '2024-04-01T00:00:00Z',
      document: '00.000.000/0004-04',
    },
  ],

  pos_sales: [
    {
      id: 'sale-0001-0000-0000-000000000001',
      customer_id: 'c1000',
      price_tier: 'cliente_final',
      total: 410.00,
      payment_method: 'pix',
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-10T15:30:00Z',
      customers: { name: 'João Silva' },
      pos_sale_items: [
        { id: 'si-001', sale_id: 'sale-0001-0000-0000-000000000001', product_id: 'p001', description: 'BOTÃO PRO BOOSTER 5V', quantity: 1, unit_price: 60.00, total: 60.00 },
        { id: 'si-002', sale_id: 'sale-0001-0000-0000-000000000001', product_id: 'p002', description: 'FILTRO DE AR ESPORTIVO K&N UNIVERSAL', quantity: 1, unit_price: 350.00, total: 350.00 },
      ],
    },
    {
      id: 'sale-0002-0000-0000-000000000002',
      customer_id: null,
      price_tier: 'cliente_final',
      total: 180.00,
      payment_method: 'dinheiro',
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-12T10:15:00Z',
      customers: null,
      pos_sale_items: [
        { id: 'si-003', sale_id: 'sale-0002-0000-0000-000000000002', product_id: 'p005', description: 'FILTRO DE COMBUSTÍVEL RACOR', quantity: 1, unit_price: 180.00, total: 180.00 },
      ],
    },
    {
      id: 'sale-0003-0000-0000-000000000003',
      customer_id: 'c1003',
      price_tier: 'franqueado_full',
      total: 1920.00,
      payment_method: 'cartao',
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-14T09:00:00Z',
      customers: { name: 'Frota Agro Ltda' },
      pos_sale_items: [
        { id: 'si-004', sale_id: 'sale-0003-0000-0000-000000000003', product_id: 'p004', description: 'DOWNPIPE INOX 3" UNIVERSAL', quantity: 2, unit_price: 960.00, total: 1920.00 },
      ],
    },
  ],

  pos_sale_items: [],

  support_tickets: [
    {
      id: 'ticket-0001-0000-0000-000000000001',
      protocol: 'PT-202605-000001',
      customer_id: 'c1000',
      unit_id: null,
      ecu_job_id: 'job-0001-0000-0000-000000000001',
      category: 'Problema com Arquivo ECU',
      priority: 'alta',
      status: 'em_atendimento',
      assigned_to: null,
      sla_due_at: '2026-05-16T18:00:00Z',
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-12T10:00:00Z',
      updated_at: '2026-05-12T14:30:00Z',
      customers: { name: 'João Silva' },
      support_messages: [
        {
          id: 'msg-001',
          ticket_id: 'ticket-0001-0000-0000-000000000001',
          author_id: 'aaaaaaaa-0000-0000-0000-000000000001',
          body: 'O arquivo ECU do Golf GTI foi enviado mas não recebi retorno do processamento. Estou aguardando há 2 dias.',
          created_at: '2026-05-12T10:00:00Z',
          profiles: { name: 'João Silva' },
        },
        {
          id: 'msg-002',
          ticket_id: 'ticket-0001-0000-0000-000000000001',
          author_id: 'aaaaaaaa-0000-0000-0000-000000000001',
          body: 'Olá João! Identificamos o arquivo e já iniciamos o processamento. Retornaremos em até 24h com o arquivo finalizado.',
          created_at: '2026-05-12T14:30:00Z',
          profiles: { name: 'Admin Master' },
        },
      ],
    },
    {
      id: 'ticket-0002-0000-0000-000000000002',
      protocol: 'PT-202605-000002',
      customer_id: 'c1003',
      unit_id: null,
      ecu_job_id: null,
      category: 'Dúvida Técnica',
      priority: 'media',
      status: 'aberto',
      assigned_to: null,
      sla_due_at: null,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-14T08:00:00Z',
      updated_at: '2026-05-14T08:00:00Z',
      customers: { name: 'Frota Agro Ltda' },
      support_messages: [
        {
          id: 'msg-003',
          ticket_id: 'ticket-0002-0000-0000-000000000002',
          author_id: 'aaaaaaaa-0000-0000-0000-000000000001',
          body: 'Quero saber se vocês atendem colheitadeiras John Deere série S com motor PowerTech Plus 9.0L.',
          created_at: '2026-05-14T08:00:00Z',
          profiles: { name: 'Frota Agro Ltda' },
        },
      ],
    },
    {
      id: 'ticket-0003-0000-0000-000000000003',
      protocol: 'PT-202604-000015',
      customer_id: 'c1001',
      unit_id: 'fu-001',
      ecu_job_id: null,
      category: 'Solicitação',
      priority: 'baixa',
      status: 'resolvido',
      assigned_to: null,
      sla_due_at: null,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-04-20T11:00:00Z',
      updated_at: '2026-04-22T09:00:00Z',
      customers: { name: 'Maria Oliveira' },
      support_messages: [
        {
          id: 'msg-004',
          ticket_id: 'ticket-0003-0000-0000-000000000003',
          author_id: 'aaaaaaaa-0000-0000-0000-000000000001',
          body: 'Preciso atualizar o contato de e-mail cadastrado na minha conta.',
          created_at: '2026-04-20T11:00:00Z',
          profiles: { name: 'Maria Oliveira' },
        },
        {
          id: 'msg-005',
          ticket_id: 'ticket-0003-0000-0000-000000000003',
          author_id: 'aaaaaaaa-0000-0000-0000-000000000001',
          body: 'E-mail atualizado com sucesso. Ticket encerrado.',
          created_at: '2026-04-22T09:00:00Z',
          profiles: { name: 'Admin Master' },
        },
      ],
    },
  ],

  support_messages: [],

  financial_categories: [
    { id: 'fc-01', name: 'Venda de Produtos',    type: 'receita' },
    { id: 'fc-02', name: 'Serviço ECU',          type: 'receita' },
    { id: 'fc-03', name: 'Comissão Franqueado',  type: 'receita' },
    { id: 'fc-04', name: 'Aluguel',              type: 'despesa' },
    { id: 'fc-05', name: 'Salários',             type: 'despesa' },
    { id: 'fc-06', name: 'Infraestrutura TI',    type: 'despesa' },
    { id: 'fc-07', name: 'Marketing',            type: 'despesa' },
  ],

  financial_entries: [
    {
      id: 'fe-001', category_id: 'fc-02', unit_id: null, type: 'receita',
      amount: 890.00, description: 'Remapeamento Golf GTI - Job #0001',
      reference_id: 'job-0001-0000-0000-000000000001',
      period_year: 2026, period_month: 5,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-10T09:30:00Z',
      financial_categories: { id: 'fc-02', name: 'Serviço ECU', type: 'receita' },
    },
    {
      id: 'fe-002', category_id: 'fc-01', unit_id: null, type: 'receita',
      amount: 410.00, description: 'Venda PDV - João Silva',
      reference_id: 'sale-0001-0000-0000-000000000001',
      period_year: 2026, period_month: 5,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-10T15:30:00Z',
      financial_categories: { id: 'fc-01', name: 'Venda de Produtos', type: 'receita' },
    },
    {
      id: 'fe-003', category_id: 'fc-01', unit_id: null, type: 'receita',
      amount: 1920.00, description: 'Venda PDV - Frota Agro Ltda',
      reference_id: 'sale-0003-0000-0000-000000000003',
      period_year: 2026, period_month: 5,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-14T09:10:00Z',
      financial_categories: { id: 'fc-01', name: 'Venda de Produtos', type: 'receita' },
    },
    {
      id: 'fe-004', category_id: 'fc-05', unit_id: null, type: 'despesa',
      amount: 8500.00, description: 'Folha de pagamento — Maio/2026',
      reference_id: null,
      period_year: 2026, period_month: 5,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-05T10:00:00Z',
      financial_categories: { id: 'fc-05', name: 'Salários', type: 'despesa' },
    },
    {
      id: 'fe-005', category_id: 'fc-06', unit_id: null, type: 'despesa',
      amount: 650.00, description: 'Supabase + Cloudflare R2 — Maio/2026',
      reference_id: null,
      period_year: 2026, period_month: 5,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-01T08:00:00Z',
      financial_categories: { id: 'fc-06', name: 'Infraestrutura TI', type: 'despesa' },
    },
    {
      id: 'fe-006', category_id: 'fc-04', unit_id: null, type: 'despesa',
      amount: 3200.00, description: 'Aluguel sede — Maio/2026',
      reference_id: null,
      period_year: 2026, period_month: 5,
      created_by: 'aaaaaaaa-0000-0000-0000-000000000001',
      created_at: '2026-05-02T09:00:00Z',
      financial_categories: { id: 'fc-04', name: 'Aluguel', type: 'despesa' },
    },
  ],

  monthly_closings: [],

  commissions: [],

  audit_logs: [],
}

// ─── Mock query chain ─────────────────────────────────────────────────────────

function createMockChain(initialData: AnyRecord[], table: string) {
  let rows = [...initialData]
  let isSingle = false
  const originalCount = initialData.length

  const chain: AnyRecord = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    select(_cols: string, _opts?: unknown) { return chain },
    insert(payload: AnyRecord | AnyRecord[]) {
      const items = Array.isArray(payload) ? payload : [payload]
      rows = items.map((item) => ({
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...item,
      }))
      return chain
    },
    update(payload: AnyRecord) {
      rows = rows.map((r) => ({ ...r, ...payload }))
      return chain
    },
    delete() { rows = []; return chain },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    upsert(_payload: unknown, _opts?: unknown) { return chain },
    eq(col: string, val: unknown) {
      rows = rows.filter((r) => r[col] === val)
      return chain
    },
    neq(col: string, val: unknown) {
      rows = rows.filter((r) => r[col] !== val)
      return chain
    },
    ilike(col: string, pattern: string) {
      const term = pattern.replace(/%/g, '').toLowerCase()
      rows = rows.filter((r) => String(r[col] ?? '').toLowerCase().includes(term))
      return chain
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    order(_col: string, _opts?: unknown) { return chain },
    range(from: number, to: number) { rows = rows.slice(from, to + 1); return chain },
    limit(n: number) { rows = rows.slice(0, n); return chain },
    single() { isSingle = true; return chain },
    then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
      const response = isSingle
        ? { data: rows[0] ?? null, error: null }
        : { data: rows, error: null, count: originalCount }
      return Promise.resolve(response).then(resolve, reject)
    },
  }

  void table // suppress unused warning — kept for future per-table overrides
  return chain
}

// ─── Public setup ──────────────────────────────────────────────────────────────

export function setupMocks() {
  // Pre-fill auth store so AuthGuard passes immediately (loading: false)
  useAuthStore.setState({
    session: MOCK_SESSION,
    user: MOCK_USER,
    profile: MOCK_PROFILE,
    loading: false,
  })

  // Patch supabase.auth so useAuth's useEffect doesn't override the store
   
  const sb = supabase as unknown as AnyRecord
  const mockAuth: AnyRecord = {
    getSession: async () => ({ data: { session: MOCK_SESSION }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ data: { session: MOCK_SESSION }, error: null }),
    signOut: async () => ({ error: null }),
  }
  sb.auth = mockAuth

  // Patch supabase.from to return mock data
  sb.from = (table: string) => {
    const data = MOCK_DB[table] ?? []
    return createMockChain(data as AnyRecord[], table)
  }

   
  console.info('[mock] Mock mode active — using fake data, no Supabase connection.')
}
