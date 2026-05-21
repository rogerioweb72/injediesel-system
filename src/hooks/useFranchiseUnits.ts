import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import type { ContractType } from '@/types/app'

export type UnitStatus = 'em_implantacao' | 'ativa' | 'suspensa' | 'encerrada'

export interface FranchiseUnit {
  id: string
  name: string
  status: UnitStatus
  logo_url: string | null
  razao_social: string | null
  cnpj: string | null
  inscricao_estadual: string | null
  cidade_fiscal: string | null
  website: string | null
  phone: string | null
  email: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  city: string | null
  state: string | null
  address: string | null
  raio_atendimento_km: number | null
  cidades_atendidas: string[] | null
  perimetro_exclusivo: boolean
  responsavel_legal_nome: string | null
  responsavel_legal_cpf: string | null
  responsavel_legal_email: string | null
  responsavel_legal_telefone: string | null
  responsavel_legal_cargo: string | null
  responsavel_op_mesmo_legal: boolean
  responsavel_op_nome: string | null
  responsavel_op_email: string | null
  responsavel_op_telefone: string | null
  contract_type: ContractType
  contract_start_date: string | null
  contract_end_date: string | null
  contract_blocked: boolean
  contract_blocked_reason: string | null
  contract_blocked_at: string | null
  active: boolean
  commission_rate: number
  manager_id: string | null
  limite_colaboradores: number | null
  observacoes_internas: string | null
  created_at: string
}

interface ListFilter {
  q?: string
  page?: number
  pageSize?: number
}

export function useFranchiseUnits({ q = '', page = 0, pageSize = 20 }: ListFilter = {}) {
  return useQuery({
    queryKey: ['franchise-units', q, page, pageSize],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('franchise_units')
        .select('*', { count: 'exact' })
        .order('name')
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (q) query = query.ilike('name', `%${q}%`)
      const { data, error, count } = await query
      if (error) throw error
      return { data: data as FranchiseUnit[], total: (count as number) ?? 0 }
    },
  })
}

export function useFranchiseUnit(id: string) {
  return useQuery({
    queryKey: ['franchise-unit', id],
    enabled: !!id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('franchise_units').select('*').eq('id', id).single()
      if (error) throw error
      return data as FranchiseUnit
    },
  })
}

export function useExpiringContracts(days = 90) {
  return useQuery({
    queryKey: ['franchise-units-expiring', days],
    queryFn: async () => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() + days)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('franchise_units')
        .select('id, name, contract_end_date, contract_type')
        .eq('active', true)
        .not('contract_end_date', 'is', null)
        .lte('contract_end_date', cutoff.toISOString().split('T')[0])
        .order('contract_end_date')
      if (error) throw error
      return (data ?? []) as Pick<FranchiseUnit, 'id' | 'name' | 'contract_end_date' | 'contract_type'>[]
    },
    staleTime: 300_000,
  })
}

type CreatePayload = Omit<FranchiseUnit, 'id' | 'created_at'>

export function useCreateFranchiseUnit() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async (payload: CreatePayload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('franchise_units').insert(payload).select().single()
      if (error) throw error
      return data as FranchiseUnit
    },
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ['franchise-units'] })
      log({ entity: 'franchise_unit', entityId: u.id, action: 'created' })
    },
  })
}

export function useUpdateFranchiseUnit() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<FranchiseUnit> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('franchise_units').update(payload).eq('id', id).select().single()
      if (error) throw error
      return data as FranchiseUnit
    },
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ['franchise-units'] })
      qc.invalidateQueries({ queryKey: ['franchise-unit', u.id] })
      log({ entity: 'franchise_unit', entityId: u.id, action: 'updated' })
    },
  })
}

export function useDeleteFranchiseUnit() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('franchise_units').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['franchise-units'] })
      log({ entity: 'franchise_unit', entityId: id, action: 'deleted' })
    },
  })
}

export async function uploadLogo(unitId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${unitId}/logo.${ext}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).storage
    .from('logos-unidades')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (supabase as any).storage
    .from('logos-unidades')
    .getPublicUrl(path)
  return data.publicUrl as string
}
