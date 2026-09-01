import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Search, ChevronRight } from 'lucide-react'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { Input } from '@/components/ui/input'
import { useCustomers } from '@/hooks/useCustomers'

const TIER_LABEL: Record<string, string> = {
  cliente_final: 'Cliente Final',
  franqueado_full: 'Franqueado Full',
  franqueado_linha_leve: 'Linha Leve',
}

// Clientes cadastrados pela unidade (unit_id = esta unidade).
export function ClientesUnidadeTab({ unitId }: { unitId: string }) {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const [q, setQ] = useState('')
  const { data, isLoading } = useCustomers({ unitId, q, pageSize: 50 })
  const rows = data?.data ?? []
  const total = data?.total ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <Users size={12} /> Clientes da unidade ({total})
        </p>
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, CPF, e-mail..." className="pl-9 h-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="pm-skeleton h-24 rounded" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{q ? 'Nenhum cliente para a busca.' : 'Esta unidade ainda não cadastrou clientes.'}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-zinc-500 text-left">
                <th className="py-2 pr-2">Nome</th>
                <th className="py-2 px-2">CPF/CNPJ</th>
                <th className="py-2 px-2">Telefone</th>
                <th className="py-2 px-2">E-mail</th>
                <th className="py-2 px-2">Tier</th>
                <th className="py-2 pl-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} onClick={() => navigate(`${prefix}/clientes/${c.id}`)}
                  className="border-t border-white/5 cursor-pointer hover:bg-white/[0.03]">
                  <td className="py-2 pr-2 text-zinc-100">{c.name}</td>
                  <td className="py-2 px-2 text-zinc-400">{c.document ?? '—'}</td>
                  <td className="py-2 px-2 text-zinc-400">{c.phone ?? '—'}</td>
                  <td className="py-2 px-2 text-zinc-400 truncate max-w-[180px]">{c.email ?? '—'}</td>
                  <td className="py-2 px-2 text-zinc-400">{TIER_LABEL[c.price_tier] ?? c.price_tier}</td>
                  <td className="py-2 pl-2 text-right"><ChevronRight size={15} className="text-zinc-600" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
