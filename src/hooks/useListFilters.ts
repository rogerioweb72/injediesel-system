import { useState } from 'react'

/**
 * Gerencia estado de filtros + paginação para listas com DataTable.
 * Qualquer mudança de filtro reseta automaticamente a página para 0.
 */
export function useListFilters<F extends Record<string, unknown>>(initialFilters: F) {
  const [filters, setFilters] = useState<F>(initialFilters)
  const [page, setPage] = useState(0)

  function setFilter<K extends keyof F>(key: K, value: F[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(0)
  }

  function reset() {
    setFilters(initialFilters)
    setPage(0)
  }

  return { filters, page, setPage, setFilter, reset }
}
