import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface UnitEmployee {
  id: string
  unit_id: string
  name: string
  position: string
  active: boolean
  created_at: string
}

export interface EmployeeBenefit {
  category: string
  amount: number
}

export interface UnitEmployeeCost {
  id: string
  employee_id: string
  year: number
  month: number
  base_salary: number
  benefits: EmployeeBenefit[]
  created_at: string
}

export function useUnitEmployees(unitId?: string) {
  return useQuery({
    queryKey: ['unit-employees', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('unit_employees')
        .select('*')
        .eq('unit_id', unitId)
        .eq('active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as UnitEmployee[]
    },
  })
}

export function useUpsertUnitEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id?: string
      unit_id: string
      name: string
      position: string
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('unit_employees')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as UnitEmployee
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['unit-employees', vars.unit_id] })
    },
  })
}

export function useDeactivateUnitEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (employee: UnitEmployee) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('unit_employees')
        .update({ active: false })
        .eq('id', employee.id)
      if (error) throw error
    },
    onSuccess: (_data, employee) => {
      qc.invalidateQueries({ queryKey: ['unit-employees', employee.unit_id] })
    },
  })
}

export function useUnitEmployeeCostsForUnit(
  unitId?: string,
  months?: Array<{ year: number; month: number }>
) {
  return useQuery({
    queryKey: ['unit-employee-costs-unit', unitId, months],
    enabled: !!unitId && !!months && months.length > 0,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: employees, error: empErr } = await (supabase as any)
        .from('unit_employees')
        .select('id')
        .eq('unit_id', unitId)
        .eq('active', true)
      if (empErr) throw empErr
      if (!employees?.length) return [] as UnitEmployeeCost[]

      const empIds = employees.map((e: { id: string }) => e.id)
      const periodFilter = months!
        .map((m) => `and(year.eq.${m.year},month.eq.${m.month})`)
        .join(',')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('unit_employee_costs')
        .select('*')
        .in('employee_id', empIds)
        .or(periodFilter)
      if (error) throw error
      return (data ?? []) as UnitEmployeeCost[]
    },
  })
}

export function useUpsertUnitEmployeeCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id?: string
      employee_id: string
      year: number
      month: number
      base_salary: number
      benefits: EmployeeBenefit[]
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('unit_employee_costs')
        .upsert(payload, { onConflict: 'employee_id,year,month' })
        .select()
        .single()
      if (error) throw error
      return data as UnitEmployeeCost
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unit-employee-costs-unit'] })
    },
  })
}
