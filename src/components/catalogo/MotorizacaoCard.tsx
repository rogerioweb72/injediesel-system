// src/components/catalogo/MotorizacaoCard.tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { Trash2, Pencil, ChevronDown, ImagePlus, X, Check, Save, Zap, Gauge } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useUpdateEcuRecord, useDeleteEcuRecord } from '@/hooks/useEcuCatalog'
import { useStorageUpload } from '@/hooks/useStorageUpload'
import type { EcuCatalogRow } from '@/types/ecu-catalog'
import { cn } from '@/lib/utils'

const DEFAULT_FOTO = '/ECU.jpg'
const BUCKET = 'ecu-catalog-fotos'

interface PrecoInputProps {
  value: number | null
  onSave: (v: number | null) => void
  label: string
}

function PrecoInput({ value, onSave, label }: PrecoInputProps) {
  const [local, setLocal] = useState(value != null ? String(value) : '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleChange = useCallback(
    (raw: string) => {
      setLocal(raw)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const n = parseFloat(raw.replace(',', '.'))
        onSave(isNaN(n) || n === 0 ? null : Math.round(n * 100) / 100)
      }, 800)
    },
    [onSave],
  )

  return (
    <div className="space-y-1">
      <span className="block text-[9px] uppercase tracking-widest text-gray-500">{label}</span>
      <div className="flex items-center bg-[hsl(var(--pm-gray-950))] border border-white/[0.06] rounded-lg px-3 py-2">
        <span className="text-gray-500 text-xs mr-2">R$</span>
        <Input
          className="bg-transparent border-0 p-0 h-auto text-sm font-semibold text-white w-20 focus-visible:ring-0 focus-visible:ring-offset-0"
          value={local}
          placeholder="—"
          onChange={e => handleChange(e.target.value)}
        />
      </div>
    </div>
  )
}

interface DraftState {
  aparelho: string
  ganho: string
  observacoes: string
}

interface Props {
  row: EcuCatalogRow
  isOpen: boolean
  onToggle: (id: string) => void
  readOnly?: boolean
}

export function MotorizacaoCard({ row, isOpen: open, onToggle, readOnly = false }: Props) {
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState<DraftState>({
    aparelho: row.aparelho ?? '',
    ganho: row.ganho ?? '',
    observacoes: row.observacoes ?? '',
  })
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload, uploading, uploadError } = useStorageUpload()

  const update = useUpdateEcuRecord()
  const remove = useDeleteEcuRecord()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft({
      aparelho: row.aparelho ?? '',
      ganho: row.ganho ?? '',
      observacoes: row.observacoes ?? '',
    })
  }, [row.aparelho, row.ganho, row.observacoes])

  const patch = useCallback(
    (p: Partial<EcuCatalogRow>) => update.mutate({ id: row.id, patch: p }),
    [row.id, update],
  )

  const handleEnterEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setDraft({
      aparelho: row.aparelho ?? '',
      ganho: row.ganho ?? '',
      observacoes: row.observacoes ?? '',
    })
    setEditMode(true)
  }, [row.aparelho, row.ganho, row.observacoes])

  const handleCancelEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setEditMode(false)
  }, [])

  const handleSaveConfirmed = useCallback(() => {
    patch({
      aparelho: draft.aparelho || null,
      ganho: draft.ganho || null,
      observacoes: draft.observacoes || null,
    })
    setSaveConfirmOpen(false)
    setEditMode(false)
  }, [draft, patch])

  const fotoAtual = row.foto_url || DEFAULT_FOTO

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const { publicUrl } = await upload(BUCKET, `${row.id}/foto.${ext}`, file, { contentType: file.type })
    if (publicUrl) patch({ foto_url: publicUrl })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveFoto = () => patch({ foto_url: null })

  const cvGain = (row.cv_original && row.cv_tuned)
    ? Math.round((row.cv_tuned - row.cv_original) * 10) / 10
    : null
  const kgfmGain = (row.kgfm_original && row.kgfm_tuned)
    ? Math.round((row.kgfm_tuned - row.kgfm_original) * 10) / 10
    : null

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-500 overflow-hidden',
        'bg-gradient-to-br from-[hsl(var(--pm-gray-900))] to-[#0B0C10]',
        open
          ? 'border-[#E60000]/30 shadow-[0_0_30px_rgba(230,0,0,0.12),0_10px_40px_rgba(0,0,0,0.4)]'
          : 'border-white/[0.06] hover:border-white/[0.15] shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
        !row.ativo && 'opacity-50',
      )}
    >
      {/* ── HEADER ── */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => onToggle(row.id)}
      >
        {/* Pulse indicator */}
        <div
          className={cn(
            'w-2 h-2 rounded-full shrink-0 transition-all duration-300',
            open ? 'bg-[#E60000] animate-pulse' : 'bg-white/[0.12]',
          )}
        />

        {/* Title */}
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <h3
            className="text-white text-sm font-bold tracking-widest uppercase truncate leading-tight"
            style={{ transform: 'skewX(-6deg)', display: 'inline-block', transformOrigin: 'left center' }}
          >
            {row.secao_original ?? '—'}
          </h3>
          {row.modelo_descricao && (
            <p className="text-[11px] text-gray-400 font-light truncate">{row.modelo_descricao}</p>
          )}
        </div>

        {/* Right: gain + year + price + chevron */}
        <div className="flex items-center gap-2.5 shrink-0">
          {row.ganho && (
            <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/20 tracking-wider whitespace-nowrap">
              {row.ganho}
            </span>
          )}

          {row.ano && (
            <span className="text-[10px] text-gray-500 border border-white/10 px-2 py-0.5 rounded-full whitespace-nowrap">
              {row.ano}
            </span>
          )}

          <div className="text-right hidden md:block">
            <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-0.5">Parceiro</p>
            <p className="text-sm font-semibold text-white tracking-wider">
              {row.preco_franqueado != null ? `R$ ${row.preco_franqueado}` : '—'}
            </p>
          </div>

          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300',
              open
                ? 'rotate-180 bg-[#E60000]/15 border-[#E60000]/40'
                : 'bg-white/5 border-white/10',
            )}
          >
            <ChevronDown
              size={16}
              className={cn('transition-colors duration-300', open ? 'text-[#E60000]' : 'text-gray-400')}
            />
          </div>
        </div>
      </div>

      {/* ── EXPANDED BODY ── */}
      {open && (
        <div className="px-5 pb-5">
          <div className="h-px bg-gradient-to-r from-[#E60000]/25 via-white/[0.05] to-transparent mb-5" />

          {/* Matrix: action buttons */}
          {!readOnly && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400 font-light tracking-wide">
                {row.modelo_descricao ?? '—'}
              </p>
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button
                      size="sm"
                      className="h-7 gap-1.5 text-xs bg-[#E60000] hover:bg-[#E60000]/90 text-white"
                      onClick={e => { e.stopPropagation(); setSaveConfirmOpen(true) }}
                      disabled={update.isPending}
                    >
                      <Save size={11} /> Salvar
                    </Button>
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 border-0"
                      onClick={handleCancelEdit}
                    >
                      <X size={12} />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 border-0"
                      onClick={handleEnterEdit} title="Editar"
                    >
                      <Pencil size={12} />
                    </Button>
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7 text-gray-500 hover:text-destructive bg-white/5 hover:bg-white/10 border-0"
                      onClick={e => { e.stopPropagation(); setDelOpen(true) }}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Matrix edit inputs */}
          {!readOnly && editMode && (
            <div className="bg-black/20 border border-white/[0.05] rounded-xl p-4 mb-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-gray-500 block">Equipamento</label>
                  <Input
                    className="bg-[hsl(var(--pm-gray-950))] border-white/[0.10] text-sm text-white h-8 focus-visible:ring-0"
                    value={draft.aparelho} placeholder="Ex: KESS3"
                    onClick={e => e.stopPropagation()}
                    onChange={e => setDraft(d => ({ ...d, aparelho: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-gray-500 block">Ganho</label>
                  <Input
                    className="bg-[hsl(var(--pm-gray-950))] border-white/[0.10] text-sm text-white h-8 focus-visible:ring-0"
                    value={draft.ganho} placeholder="Ex: ATÉ +30CV"
                    onClick={e => e.stopPropagation()}
                    onChange={e => setDraft(d => ({ ...d, ganho: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── PERFORMANCE BLOCKS ── */}
          {(row.cv_original || row.cv_tuned || row.kgfm_original || row.kgfm_tuned) && (
            <div className="space-y-3 mb-5">

              {/* HP block */}
              {(row.cv_original || row.cv_tuned) && (
                <div
                  className="rounded-xl p-4 border border-red-500/15"
                  style={{
                    background: 'linear-gradient(135deg, rgba(230,0,0,0.07) 0%, transparent 60%)',
                    borderLeftColor: '#E60000',
                    borderLeftWidth: '3px',
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={12} className="text-[#E60000] shrink-0" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold">
                      Potência
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Original</p>
                      <p className="text-2xl font-light text-slate-400 leading-none">
                        {row.cv_original ?? '—'}
                        <span className="text-sm text-gray-500 ml-1">CV</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Reprogramado</p>
                      <p className="text-3xl font-black text-white leading-none">
                        {row.cv_tuned ?? '—'}
                        <span className="text-sm text-gray-400 ml-1">CV</span>
                      </p>
                    </div>
                  </div>
                  {cvGain !== null && cvGain > 0 && (
                    <div className="flex items-center gap-1.5 mt-3">
                      <Check size={11} className="text-emerald-400" />
                      <span className="text-sm font-bold text-emerald-400 tracking-wider">+{cvGain} CV</span>
                    </div>
                  )}
                </div>
              )}

              {/* Torque block */}
              {(row.kgfm_original || row.kgfm_tuned) && (
                <div
                  className="rounded-xl p-4 border border-blue-500/15"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, transparent 60%)',
                    borderLeftColor: '#3b82f6',
                    borderLeftWidth: '3px',
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Gauge size={12} className="text-blue-400 shrink-0" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold">
                      Torque
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Original</p>
                      <p className="text-2xl font-light text-slate-400 leading-none">
                        {row.kgfm_original ?? '—'}
                        <span className="text-sm text-gray-500 ml-1">kgfm</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Reprogramado</p>
                      <p className="text-3xl font-black text-white leading-none">
                        {row.kgfm_tuned ?? '—'}
                        <span className="text-sm text-gray-400 ml-1">kgfm</span>
                      </p>
                    </div>
                  </div>
                  {kgfmGain !== null && kgfmGain > 0 && (
                    <div className="flex items-center gap-1.5 mt-3">
                      <Check size={11} className="text-blue-400" />
                      <span className="text-sm font-bold text-blue-400 tracking-wider">+{kgfmGain} kgfm</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Equipment info (when no edit mode) */}
          {(!editMode || readOnly) && (row.aparelho || row.protocolo || row.cabo || row.ganho) && (
            <div className="bg-black/20 border border-white/[0.05] rounded-xl p-4 mb-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="border-r border-white/[0.05] pr-4">
                  <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Equipamento</p>
                  <p className="text-sm font-medium text-white tracking-wide">{row.aparelho ?? '—'}</p>
                  {row.protocolo && <p className="text-[10px] text-gray-400 font-mono mt-1">{row.protocolo}</p>}
                  {row.cabo && <p className="text-[10px] text-gray-500 font-mono">{row.cabo}</p>}
                </div>
                <div className="pl-2">
                  <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Ganho</p>
                  {row.ganho ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-[#E60000]/20 flex items-center justify-center shrink-0">
                        <Check size={10} className="text-[#E60000]" />
                      </div>
                      <p className="text-sm font-semibold text-white tracking-wider">{row.ganho}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">—</p>
                  )}
                  {row.tipo_registro && row.tipo_registro !== 'Dados' && (
                    <span className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded font-mono mt-2 inline-block',
                      row.tipo_registro === 'Serviço/Adicional' && 'bg-amber-500/15 text-amber-400',
                      row.tipo_registro === 'Observação' && 'bg-zinc-500/15 text-zinc-400',
                    )}>
                      {row.tipo_registro}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Matrix: foto + observações edit */}
          {!readOnly && editMode && (
            <div className="border border-white/[0.05] rounded-xl p-4 mb-4 space-y-4">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-gray-500 block mb-2">Foto do Produto</span>
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={fotoAtual} alt="foto produto"
                      className="w-20 h-14 object-cover rounded border border-white/10"
                      onError={e => { (e.currentTarget).src = DEFAULT_FOTO }}
                    />
                    {row.foto_url && (
                      <button onClick={handleRemoveFoto}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center hover:bg-red-700 transition-colors">
                        <X size={9} />
                      </button>
                    )}
                    {!row.foto_url && (
                      <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-mono bg-black/60 text-amber-400 rounded-b py-0.5">
                        PADRÃO
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                      className="hidden" onChange={handleFileSelect} />
                    <Button size="sm" variant="outline"
                      className="h-7 text-xs gap-1.5 border-white/10 hover:border-[#E60000] hover:text-[#E60000]"
                      disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                      {uploading ? (
                        <><div className="w-3 h-3 border border-current border-b-transparent rounded-full animate-spin" />Enviando...</>
                      ) : (
                        <><ImagePlus size={12} /> Subir foto</>
                      )}
                    </Button>
                    {uploadError && <p className="text-[10px] text-red-400 font-mono">{uploadError}</p>}
                    {row.foto_url && !uploading && (
                      <p className="text-[10px] text-green-400 font-mono flex items-center gap-1">
                        <Check size={9} /> Foto ativa
                      </p>
                    )}
                    <p className="text-[9px] text-muted-foreground">JPG, PNG ou WebP · max 5MB</p>
                  </div>
                </div>
              </div>

              {row.arquivo_origem && (
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 block">Arquivo Origem</span>
                  <span className="text-xs text-muted-foreground">{row.arquivo_origem}</span>
                </div>
              )}

              <div>
                <span className="text-[9px] uppercase tracking-widest text-gray-500 block mb-1.5">Observações Técnicas</span>
                <Textarea
                  className="bg-[hsl(var(--pm-gray-950))] border-white/[0.06] text-xs text-amber-400/80 placeholder:text-gray-600 resize-none focus-visible:ring-0"
                  rows={3} value={draft.observacoes}
                  placeholder="Alertas técnicos, cabos especiais, restrições..."
                  onClick={e => e.stopPropagation()}
                  onChange={e => setDraft(d => ({ ...d, observacoes: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* ── PRICES ── */}
          {readOnly ? (
            <div className="flex gap-6 mb-4">
              <div className="space-y-1">
                <span className="block text-[9px] uppercase tracking-widest text-gray-500">Parceiro</span>
                <p className="text-base font-semibold text-white tracking-wider">
                  {row.preco_franqueado != null ? `R$ ${row.preco_franqueado}` : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase tracking-widest text-gray-500">Cliente Final</span>
                <p className="text-base font-semibold text-white tracking-wider">
                  {row.preco_cliente_final != null ? `R$ ${row.preco_cliente_final}` : '—'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex gap-3">
                <PrecoInput label="Parceiro" value={row.preco_franqueado} onSave={v => patch({ preco_franqueado: v })} />
                <PrecoInput label="Cliente Final" value={row.preco_cliente_final} onSave={v => patch({ preco_cliente_final: v })} />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400">Ativo</span>
                  <Switch checked={row.ativo} onCheckedChange={v => patch({ ativo: v })} className="scale-75" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400">E-comm</span>
                  <Switch checked={row.ativo_ecommerce} onCheckedChange={v => patch({ ativo_ecommerce: v })} className="scale-75" />
                </div>
              </div>
            </div>
          )}

          {/* Observações técnicas (read view) */}
          {!editMode && row.observacoes && (
            <div className="border-t border-white/[0.05] pt-3 mt-3">
              <p className="text-[9px] uppercase tracking-widest text-amber-500/70 mb-1">Obs. Técnica</p>
              <p className="text-[11px] text-amber-400/80 italic leading-relaxed">{row.observacoes}</p>
            </div>
          )}

        </div>
      )}

      <DeleteConfirmModal
        open={delOpen}
        description={`Excluir: ${row.marca} ${row.secao_original} — ${row.modelo_descricao}`}
        onCancel={() => setDelOpen(false)}
        onConfirm={() => remove.mutate(row.id, { onSuccess: () => setDelOpen(false) })}
        isLoading={remove.isPending}
      />

      <ConfirmDialog
        open={saveConfirmOpen}
        onOpenChange={setSaveConfirmOpen}
        title="Confirmar gravação"
        description={`Salvar alterações em "${row.secao_original ?? row.marca}"? Equipamento, ganho e observações serão atualizados.`}
        confirmLabel="Gravar"
        onConfirm={handleSaveConfirmed}
        isLoading={update.isPending}
      />
    </div>
  )
}
