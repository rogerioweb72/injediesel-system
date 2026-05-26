import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useCreateEcuRecord } from '@/hooks/useEcuCatalog'
import { ECU_CATEGORIES } from '@/data/ecu-categories'

const TIPOS = ['Dados', 'Serviço/Adicional', 'Observação']

type Props = {
  open: boolean
  onClose: () => void
}

const EMPTY = {
  categoria: 'Carros & SUVs',
  categoria_slug: 'carros-e-suvs',
  marca: '',
  secao_original: '',
  tipo_registro: 'Dados' as 'Dados' | 'Serviço/Adicional' | 'Observação',
  modelo_descricao: '',
  ano: '',
  ganho: '',
  cv_original: '',
  cv_tuned: '',
  kgfm_original: '',
  kgfm_tuned: '',
  aparelho: '',
  protocolo: '',
  cabo: '',
  preco_franqueado: '',
  preco_cliente_final: '',
  observacoes: '',
  arquivo_origem: '',
  ativo: true,
  ativo_ecommerce: true,
}

type FormState = typeof EMPTY

const label = 'text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-1 block'
const field = 'bg-[hsl(var(--pm-gray-950))] border-[hsl(var(--pm-gray-700))]'

export function EcuRecordForm({ open, onClose }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const { mutate: create, isPending } = useCreateEcuRecord()

  const set = (key: keyof FormState, val: string | boolean) =>
    setForm(f => ({ ...f, [key]: val }))

  const handleCategoriaChange = (val: string) => {
    const cat = ECU_CATEGORIES.find(c => c.value === val)!
    setForm(f => ({ ...f, categoria: cat.value, categoria_slug: cat.slug }))
  }

  const num = (v: string) => {
    const n = parseFloat(v.replace(',', '.'))
    return isNaN(n) ? null : n
  }

  const handleSubmit = () => {
    if (!form.marca.trim() || !form.modelo_descricao.trim()) return
    create({
      categoria: form.categoria,
      categoria_slug: form.categoria_slug,
      marca: form.marca.trim(),
      secao_original: form.secao_original.trim(),
      tipo_registro: form.tipo_registro,
      modelo_descricao: form.modelo_descricao.trim(),
      ano: form.ano.trim(),
      ganho: form.ganho.trim(),
      cv_original: num(form.cv_original),
      cv_tuned: num(form.cv_tuned),
      kgfm_original: num(form.kgfm_original),
      kgfm_tuned: num(form.kgfm_tuned),
      aparelho: form.aparelho.trim(),
      protocolo: form.protocolo.trim(),
      cabo: form.cabo.trim(),
      preco_franqueado: num(form.preco_franqueado),
      preco_cliente_final: num(form.preco_cliente_final),
      observacoes: form.observacoes.trim() || null,
      arquivo_origem: form.arquivo_origem.trim() || null,
      foto_url: null,
      ativo: form.ativo,
      ativo_ecommerce: form.ativo_ecommerce,
    }, {
      onSuccess: () => {
        setForm(EMPTY)
        onClose()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl bg-[hsl(var(--pm-gray-900))] border-[hsl(var(--pm-gray-800))] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-white tracking-wide">Novo Registro ECU</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {/* Categoria */}
          <div>
            <label className={label}>Categoria</label>
            <Select value={form.categoria} onValueChange={handleCategoriaChange}>
              <SelectTrigger className={field}><SelectValue /></SelectTrigger>
              <SelectContent>
                {ECU_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo */}
          <div>
            <label className={label}>Tipo de Registro</label>
            <Select value={form.tipo_registro} onValueChange={v => set('tipo_registro', v)}>
              <SelectTrigger className={field}><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Marca */}
          <div>
            <label className={label}>Marca *</label>
            <Input className={field} value={form.marca} onChange={e => set('marca', e.target.value)} placeholder="Ex: Volkswagen" />
          </div>

          {/* Seção */}
          <div>
            <label className={label}>Seção / Modelo</label>
            <Input className={field} value={form.secao_original} onChange={e => set('secao_original', e.target.value)} placeholder="Ex: Golf" />
          </div>

          {/* Modelo/Descrição */}
          <div className="col-span-2">
            <label className={label}>Motorização / Descrição *</label>
            <Input className={field} value={form.modelo_descricao} onChange={e => set('modelo_descricao', e.target.value)} placeholder="Ex: 1.4 TSI 150CV" />
          </div>

          {/* Ano */}
          <div>
            <label className={label}>Ano</label>
            <Input className={field} value={form.ano} onChange={e => set('ano', e.target.value)} placeholder="Ex: 2018-2023" />
          </div>

          {/* Ganho */}
          <div>
            <label className={label}>Ganho</label>
            <Input className={field} value={form.ganho} onChange={e => set('ganho', e.target.value)} placeholder="Ex: ATÉ +30CV E 4,2KG" />
          </div>

          {/* CV Original */}
          <div>
            <label className={label}>CV Original</label>
            <Input type="number" className={field} value={form.cv_original} onChange={e => set('cv_original', e.target.value)} placeholder="Ex: 150" />
          </div>

          {/* CV Tuned */}
          <div>
            <label className={label}>CV Reprogramado</label>
            <Input type="number" className={field} value={form.cv_tuned} onChange={e => set('cv_tuned', e.target.value)} placeholder="Ex: 180" />
          </div>

          {/* KGFM Original */}
          <div>
            <label className={label}>KGFM Original</label>
            <Input type="number" className={field} value={form.kgfm_original} onChange={e => set('kgfm_original', e.target.value)} placeholder="Ex: 25.4" />
          </div>

          {/* KGFM Tuned */}
          <div>
            <label className={label}>KGFM Reprogramado</label>
            <Input type="number" className={field} value={form.kgfm_tuned} onChange={e => set('kgfm_tuned', e.target.value)} placeholder="Ex: 30.4" />
          </div>

          {/* Aparelho */}
          <div>
            <label className={label}>Aparelho</label>
            <Input className={field} value={form.aparelho} onChange={e => set('aparelho', e.target.value)} placeholder="Ex: KESS V2" />
          </div>

          {/* Protocolo */}
          <div>
            <label className={label}>Protocolo</label>
            <Input className={field} value={form.protocolo} onChange={e => set('protocolo', e.target.value)} placeholder="Ex: OBD" />
          </div>

          {/* Cabo */}
          <div>
            <label className={label}>Cabo</label>
            <Input className={field} value={form.cabo} onChange={e => set('cabo', e.target.value)} placeholder="Ex: K-TAG" />
          </div>

          {/* Arquivo Origem */}
          <div>
            <label className={label}>Arquivo Origem</label>
            <Input className={field} value={form.arquivo_origem} onChange={e => set('arquivo_origem', e.target.value)} placeholder="Ex: tabela_2024.pdf" />
          </div>

          {/* Preço Franqueado */}
          <div>
            <label className={label}>Custo Franqueado (R$)</label>
            <Input type="number" className={field} value={form.preco_franqueado} onChange={e => set('preco_franqueado', e.target.value)} placeholder="Ex: 1600" />
          </div>

          {/* Preço Cliente Final */}
          <div>
            <label className={label}>Preço Final Cliente (R$)</label>
            <Input type="number" className={field} value={form.preco_cliente_final} onChange={e => set('preco_cliente_final', e.target.value)} placeholder="Ex: 2200" />
          </div>

          {/* Observações */}
          <div className="col-span-2">
            <label className={label}>Observações</label>
            <Textarea className={`${field} resize-none`} rows={2} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Informações adicionais..." />
          </div>

          {/* Switches */}
          <div className="col-span-2 flex gap-8 pt-2">
            <div className="flex items-center gap-3">
              <Switch checked={form.ativo} onCheckedChange={v => set('ativo', v)} />
              <span className="text-xs font-mono text-muted-foreground uppercase">Ativo</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.ativo_ecommerce} onCheckedChange={v => set('ativo_ecommerce', v)} />
              <span className="text-xs font-mono text-muted-foreground uppercase">Ativo E-commerce</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button
            disabled={isPending || !form.marca.trim() || !form.modelo_descricao.trim()}
            style={{ background: 'hsl(var(--pm-red-500))' }}
            onClick={handleSubmit}
          >
            {isPending ? 'Salvando...' : 'Criar Registro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
