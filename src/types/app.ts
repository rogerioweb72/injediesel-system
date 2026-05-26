export type UserRole =
  | 'system_ti'
  | 'company_admin'
  | 'operations_admin'
  | 'finance_admin'
  | 'support_agent'
  | 'seller'
  | 'franchise_manager'
  | 'unit_manager'
  | 'unit_operator'
  | 'ecu_technician'
  | 'unit_seller'
  | 'receptionist'
  | 'finance_staff'
  | 'auditor'

export type AccountTier = 'system' | 'matrix' | 'franchise'

export function getAccountTier(role: UserRole): AccountTier {
  if (role === 'system_ti') return 'system'
  if (
    role === 'franchise_manager' ||
    role === 'unit_manager' ||
    role === 'unit_operator' ||
    role === 'ecu_technician' ||
    role === 'unit_seller' ||
    role === 'receptionist' ||
    role === 'finance_staff'
  ) return 'franchise'
  return 'matrix'
}

export type RbacModule =
  | 'dashboard'
  | 'clientes'
  | 'veiculos'
  | 'produtos'
  | 'pedidos'
  | 'ecu_arquivos'
  | 'financeiro'
  | 'franqueados'
  | 'suporte'
  | 'pdv'
  | 'configuracoes'
  | 'relatorios'
  | 'tabela_remap'

export interface PermissionEntry {
  module: RbacModule
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

export interface PermissionProfile {
  id: string
  name: string
  scope: 'matrix' | 'franchise'
  description: string | null
  entries: PermissionEntry[]
}

export type ContractType = 'full' | 'linha_leve'

export type PriceTier = 'franqueado_full' | 'franqueado_linha_leve' | 'cliente_final'

export type VehicleType = 'automotivo' | 'maquina_agricola' | 'maquina_pesada' | 'nautica'

export type FileStatus =
  | 'recebido'
  | 'em_triagem'
  | 'em_processamento'
  | 'aguardando_cliente'
  | 'concluido'
  | 'cancelado'

export type PriorityLevel = 'normal' | 'alta' | 'critica'

export type TicketPriority = 'baixa' | 'media' | 'alta' | 'critica'

export type TicketStatus =
  | 'aberto'
  | 'em_atendimento'
  | 'aguardando_cliente'
  | 'resolvido'
  | 'fechado'

export type TicketCategory = 'tecnico' | 'financeiro' | 'operacional' | 'ecu_arquivo' | 'outro'

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  tecnico:     'Técnico',
  financeiro:  'Financeiro',
  operacional: 'Operacional',
  ecu_arquivo: 'ECU / Arquivo',
  outro:       'Outro',
}

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
  max_discount_pct?: number
  commission_rate?: number
  permissions?: PermissionEntry[] | null
  permission_profile_id?: string | null
  unit_id?: string | null
}

export const SYSTEM_ROLES: UserRole[] = ['system_ti']

export const MATRIX_ROLES: UserRole[] = [
  'company_admin',
  'operations_admin',
  'finance_admin',
  'support_agent',
  'seller',
  'auditor',
]

export const FRANCHISE_ROLES: UserRole[] = [
  'franchise_manager',
  'unit_manager',
  'unit_operator',
  'ecu_technician',
  'unit_seller',
  'receptionist',
  'finance_staff',
]

export function canAccess(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  if (userRole === 'system_ti') return true
  return allowedRoles.includes(userRole)
}

export const ROLE_LABELS: Record<UserRole, string> = {
  system_ti:         'Suporte TI (Master)',
  company_admin:     'Administrador da Matriz',
  operations_admin:  'Gerente de Operações',
  finance_admin:     'Gerente Financeiro',
  support_agent:     'Agente de Suporte',
  seller:            'Vendedor (Matriz)',
  franchise_manager: 'Administrador de Franquia',
  unit_manager:      'Gerente',
  unit_operator:     'Operador da Unidade',
  ecu_technician:    'Técnico de ECU',
  unit_seller:       'Vendedor',
  receptionist:      'Atendente',
  finance_staff:     'Financeiro',
  auditor:           'Auditor',
}

export const MODULE_LABELS: Record<RbacModule, string> = {
  dashboard:    'Dashboard',
  clientes:     'Clientes',
  veiculos:     'Veículos',
  produtos:     'Produtos',
  pedidos:      'Pedidos / OS',
  ecu_arquivos: 'Arquivos ECU',
  financeiro:   'Financeiro',
  franqueados:  'Franqueados',
  suporte:      'Suporte',
  pdv:          'PDV / Vendas',
  configuracoes:'Configurações',
  relatorios:   'Relatórios',
  tabela_remap: 'Tabela de Remap',
}

// ─── Permission helpers ────────────────────────────────────────────────────────

function p(
  module: RbacModule,
  can_view: boolean,
  can_create: boolean,
  can_edit: boolean,
  can_delete: boolean,
): PermissionEntry {
  return { module, can_view, can_create, can_edit, can_delete }
}

const FRANCHISE_MODULES: RbacModule[] = [
  'dashboard', 'clientes', 'veiculos', 'produtos', 'pedidos',
  'ecu_arquivos', 'financeiro', 'pdv', 'relatorios', 'configuracoes', 'tabela_remap',
]

const MATRIX_MODULES: RbacModule[] = [
  'dashboard', 'clientes', 'veiculos', 'produtos', 'pedidos',
  'ecu_arquivos', 'financeiro', 'franqueados', 'suporte', 'pdv',
  'relatorios', 'tabela_remap', 'configuracoes',
]

export const ROLE_SCOPE_MODULES: Partial<Record<UserRole, RbacModule[]>> = {
  franchise_manager: FRANCHISE_MODULES,
  unit_manager:      FRANCHISE_MODULES,
  unit_operator:     FRANCHISE_MODULES,
  ecu_technician:    FRANCHISE_MODULES,
  unit_seller:       FRANCHISE_MODULES,
  receptionist:      FRANCHISE_MODULES,
  finance_staff:     FRANCHISE_MODULES,
}

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, PermissionEntry[]> = {
  system_ti: MATRIX_MODULES.map((m) => p(m, true, true, true, true)),

  company_admin: MATRIX_MODULES.map((m) => p(m, true, true, true, true)),

  operations_admin: MATRIX_MODULES.map((m) =>
    m === 'configuracoes' ? p(m, true, false, false, false) : p(m, true, true, true, true),
  ),

  finance_admin: MATRIX_MODULES.map((m) => {
    if (m === 'financeiro' || m === 'relatorios') return p(m, true, true, true, false)
    if (m === 'dashboard' || m === 'pedidos' || m === 'clientes') return p(m, true, false, false, false)
    return p(m, false, false, false, false)
  }),

  support_agent: MATRIX_MODULES.map((m) => {
    if (m === 'suporte') return p(m, true, true, true, false)
    if (m === 'clientes' || m === 'franqueados' || m === 'dashboard') return p(m, true, false, false, false)
    return p(m, false, false, false, false)
  }),

  seller: MATRIX_MODULES.map((m) => {
    if (m === 'clientes' || m === 'pedidos') return p(m, true, true, true, false)
    if (m === 'produtos' || m === 'pdv' || m === 'dashboard') return p(m, true, true, false, false)
    if (m === 'veiculos') return p(m, true, false, false, false)
    return p(m, false, false, false, false)
  }),

  auditor: MATRIX_MODULES.map((m) => p(m, true, false, false, false)),

  franchise_manager: FRANCHISE_MODULES.map((m) => p(m, true, true, true, true)),

  unit_manager: FRANCHISE_MODULES.map((m) => p(m, true, true, true, true)),

  unit_operator: FRANCHISE_MODULES.map((m) => {
    if (m === 'configuracoes') return p(m, true, false, false, false)
    if (m === 'financeiro') return p(m, true, false, false, false)
    return p(m, true, true, true, false)
  }),

  ecu_technician: FRANCHISE_MODULES.map((m) => {
    if (m === 'financeiro' || m === 'configuracoes' || m === 'relatorios') return p(m, false, false, false, false)
    if (m === 'ecu_arquivos' || m === 'clientes' || m === 'veiculos') return p(m, true, true, true, false)
    if (m === 'pedidos') return p(m, true, false, true, false)
    if (m === 'dashboard' || m === 'produtos' || m === 'tabela_remap') return p(m, true, false, false, false)
    return p(m, false, false, false, false)
  }),

  unit_seller: FRANCHISE_MODULES.map((m) => {
    if (m === 'financeiro' || m === 'configuracoes' || m === 'ecu_arquivos') return p(m, false, false, false, false)
    if (m === 'clientes' || m === 'pedidos') return p(m, true, true, true, false)
    if (m === 'pdv') return p(m, true, true, false, false)
    if (m === 'veiculos') return p(m, true, true, false, false)
    if (m === 'dashboard' || m === 'produtos') return p(m, true, false, false, false)
    return p(m, false, false, false, false)
  }),

  receptionist: FRANCHISE_MODULES.map((m) => {
    if (m === 'financeiro' || m === 'configuracoes' || m === 'relatorios') return p(m, false, false, false, false)
    if (m === 'clientes' || m === 'veiculos') return p(m, true, true, true, false)
    if (m === 'pedidos' || m === 'pdv') return p(m, true, true, true, false)
    if (m === 'dashboard' || m === 'produtos' || m === 'ecu_arquivos') return p(m, true, false, false, false)
    return p(m, false, false, false, false)
  }),

  finance_staff: FRANCHISE_MODULES.map((m) => {
    if (m === 'financeiro') return p(m, true, true, true, false)
    if (m === 'relatorios') return p(m, true, false, false, false)
    if (m === 'dashboard' || m === 'pedidos' || m === 'clientes') return p(m, true, false, false, false)
    return p(m, false, false, false, false)
  }),
}

