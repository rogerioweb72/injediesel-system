import { useState } from 'react'
import { toast } from 'sonner'
import { translateError } from '@/lib/errors'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFranchiseProducts, useUpdateFranchiseProduct, type FranchiseProduct } from '@/hooks/useFranchiseProducts'

// Converte texto de moeda pt-BR (ou plano) em número.
// Aceita "80000", "80000.00", "80.000,00", "80.000", "1.234.567,89", "R$ 5.000".
// Retorna NaN se realmente inválido (aí o save é abortado, nunca grava 0).
function parseBRNumber(raw: string): number {
  let s = String(raw ?? '').trim().replace(/[R$\s]/gi, '')
  if (!s) return NaN
  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  if (hasComma) {
    // vírgula = separador decimal; pontos (se houver) = milhar
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (hasDot) {
    // sem vírgula: ponto pode ser milhar (grupos de 3) ou decimal
    const parts = s.split('.')
    const allGroupsOf3 = parts.slice(1).every((g) => g.length === 3)
    if (parts.length > 1 && allGroupsOf3) s = s.replace(/\./g, '') // milhar → remove
    // senão, mantém ponto como decimal
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

function ProductCard({ p }: { p: FranchiseProduct }) {
  const update = useUpdateFranchiseProduct()
  const [fee, setFee]     = useState(String(p.default_fee))
  const [ctype, setCtype] = useState<FranchiseProduct['commission_type']>(p.commission_type)
  const [cval, setCval]   = useState(String(p.commission_value))
  const [active, setActive] = useState(p.active)

  async function save() {
    const feeNum = parseBRNumber(fee)
    if (Number.isNaN(feeNum)) { toast.error('Valor base inválido. Ex.: 80.000,00'); return }
    const cvalNum = parseBRNumber(cval)
    if (Number.isNaN(cvalNum)) { toast.error('Comissão inválida.'); return }
    try {
      const saved = await update.mutateAsync({
        id: p.id,
        default_fee: feeNum,
        commission_type: ctype,
        commission_value: cvalNum,
        active,
      })
      // ressincroniza os campos com o que o banco confirmou
      setFee(String(saved.default_fee))
      setCval(String(saved.commission_value))
      toast.success(`${p.name} salvo`)
    } catch (e) {
      toast.error(translateError(e))
    }
  }

  return (
    <div className="pm-card space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">{p.name}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{active ? 'Ativo' : 'Inativo'}</span>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Valor base do contrato (R$)</Label>
        <Input type="text" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="80.000,00" />
        <p className="text-[11px] text-muted-foreground">Preenche o valor por padrão no Novo Contrato (editável na venda).</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Comissão do vendedor</Label>
          <Select value={ctype} onValueChange={(v) => setCtype(v as FranchiseProduct['commission_type'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percentual (%)</SelectItem>
              <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{ctype === 'percent' ? 'Percentual (%)' : 'Valor (R$)'}</Label>
          <Input type="text" inputMode="decimal" value={cval} onChange={(e) => setCval(e.target.value)} placeholder={ctype === 'percent' ? '10' : '5.000,00'} />
        </div>
      </div>

      <Button onClick={save} disabled={update.isPending} style={{ background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)' }}>
        {update.isPending ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}

export function FranchiseProductsTab() {
  const { data: products = [], isLoading } = useFranchiseProducts()

  if (isLoading) return <div className="pm-skeleton h-64 rounded" />

  return (
    <div className="max-w-5xl">
      <p className="text-sm text-muted-foreground mb-4">
        Valor base e regra de comissão da venda de franquia, por tipo de contrato. O vendedor
        da matriz recebe a comissão na ativação do contrato.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {products.map((p) => <ProductCard key={p.id} p={p} />)}
        {products.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum produto de franquia. Aplique a migration 110.</p>
        )}
      </div>
    </div>
  )
}
