import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'

export interface PdvSettings {
  interest_rate: number                // monthly %, default 3.5
  interest_free_installments: number   // default 2
  cash_pix_discount: number            // % discount, default 0
  max_installments: number             // default 12
}

export const PDV_DEFAULTS: PdvSettings = {
  interest_rate: 3.5,
  interest_free_installments: 2,
  cash_pix_discount: 0,
  max_installments: 12,
}

export interface CompanySettings {
  id: string
  name: string
  cnpj: string | null
  email: string | null
  phone: string | null
  address: {
    street?: string
    city?: string
    state?: string
    zip?: string
  } | null
  pdv_settings: PdvSettings | null
  updated_at: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export function useCompanySettings() {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await sb()
        .from('company_settings')
        .select('*')
        .single()
      if (error) throw error
      return data as CompanySettings
    },
  })
}

type UpdatePayload = Partial<Omit<CompanySettings, 'id' | 'updated_at'>>

export function useUpdateCompanySettings() {
  const qc = useQueryClient()
  const { log } = useAuditLog()

  return useMutation({
    mutationFn: async (fields: UpdatePayload) => {
      const { data, error } = await sb()
        .from('company_settings')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .select()
        .single()
      if (error) throw error
      return data as CompanySettings
    },
    onSuccess: (settings) => {
      qc.invalidateQueries({ queryKey: ['company-settings'] })
      log({ entity: 'company_settings', entityId: settings.id, action: 'updated', metadata: {} })
    },
  })
}
