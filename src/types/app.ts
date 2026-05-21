export type UserRole =
  | 'system_ti'
  | 'company_admin'
  | 'operations_admin'
  | 'finance_admin'
  | 'support_agent'
  | 'seller'
  | 'franchise_manager'
  | 'unit_operator'
  | 'auditor'

export type AccountTier = 'system' | 'matrix' | 'franchise'

export function getAccountTier(role: UserRole): AccountTier {
  if (role === 'system_ti') return 'system'
  if (role === 'franchise_manager' || role === 'unit_operator') return 'franchise'
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

export const FRANCHISE_ROLES: UserRole[] = ['franchise_manager', 'unit_operator']

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
  unit_operator:     'Operador da Unidade',
  auditor:           'Auditor',
}
