export type UserRole =
  | 'company_admin'
  | 'operations_admin'
  | 'finance_admin'
  | 'support_agent'
  | 'seller'
  | 'franchise_manager'
  | 'unit_operator'
  | 'auditor'

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

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
}

export const MATRIX_ROLES: UserRole[] = [
  'company_admin',
  'operations_admin',
  'finance_admin',
  'support_agent',
  'seller',
]

export const FRANCHISE_ROLES: UserRole[] = ['franchise_manager', 'unit_operator']

export function canAccess(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}
