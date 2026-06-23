import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

export interface Column<T> {
  key: string
  header: string
  cell?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onSearch?: (q: string) => void
  searchValue?: string
  searchPlaceholder?: string
  onRowClick?: (row: T) => void
  emptyTitle?: string
  emptyDescription?: string
}

export function DataTable<T extends { id: string }>({
  columns, data, isLoading, total, page, pageSize,
  onPageChange, onSearch, searchValue = '', searchPlaceholder = 'Buscar...',
  onRowClick, emptyTitle = 'Nenhum registro', emptyDescription = 'Nenhum item encontrado.',
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {onSearch && (
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      )}

      <div className="pm-card p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-12 text-center">
                  <p className="font-medium text-foreground">{emptyTitle}</p>
                  <p className="text-sm text-muted-foreground mt-1">{emptyDescription}</p>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? 'cursor-pointer hover:bg-[hsl(var(--pm-gray-800))]' : ''}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell
                        ? col.cell(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>

          {/* left — total */}
          <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
            {total} registros
          </span>

          {/* center — current slice / total */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.01em' }}>
              {Math.min((page + 1) * pageSize, total)}
              <span style={{ fontSize: 12, fontWeight: 400, color: 'hsl(var(--muted-foreground))', margin: '0 4px' }}>de</span>
              {total}
            </span>
            {/* progress bar */}
            <div style={{ width: 80, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                background: 'var(--pm-accent-gradient)',
                width: `${Math.min(((page + 1) * pageSize) / total * 100, 100)}%`,
                transition: 'width 300ms ease',
              }} />
            </div>
          </div>

          {/* right — nav buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            <button
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 34, padding: '0 14px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: page === 0 ? 'transparent' : 'rgba(255,255,255,0.05)',
                color: page === 0 ? 'rgba(255,255,255,0.2)' : '#F8FAFC',
                fontSize: 12, fontWeight: 600, cursor: page === 0 ? 'not-allowed' : 'pointer',
                transition: 'background 150ms ease, border-color 150ms ease',
              }}
              onMouseEnter={(e) => { if (page !== 0) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={(e) => { if (page !== 0) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            >
              <ChevronLeft size={14} />
              Anterior
            </button>

            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums', minWidth: 60, textAlign: 'center' }}>
              {page + 1} / {totalPages}
            </span>

            <button
              disabled={page >= totalPages - 1}
              onClick={() => onPageChange(page + 1)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 34, padding: '0 14px', borderRadius: 8,
                border: `1px solid ${page >= totalPages - 1 ? 'rgba(255,255,255,0.06)' : 'rgba(177,40,37,0.4)'}`,
                background: page >= totalPages - 1 ? 'transparent' : 'rgba(177,40,37,0.1)',
                color: page >= totalPages - 1 ? 'rgba(255,255,255,0.2)' : '#B12825',
                fontSize: 12, fontWeight: 600, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                transition: 'background 150ms ease, border-color 150ms ease',
              }}
              onMouseEnter={(e) => { if (page < totalPages - 1) e.currentTarget.style.background = 'rgba(177,40,37,0.18)' }}
              onMouseLeave={(e) => { if (page < totalPages - 1) e.currentTarget.style.background = 'rgba(177,40,37,0.1)' }}
            >
              Próxima
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
