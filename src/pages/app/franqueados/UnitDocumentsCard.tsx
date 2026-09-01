import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { FileText, Upload, ExternalLink, Trash2, Loader2 } from 'lucide-react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { translateError } from '@/lib/errors'
import {
  useUnitDocuments, useUploadUnitDocument, useDeleteUnitDocument, getDocumentUrl,
  type UnitDocument,
} from '@/hooks/useUnitDocuments'

const KIND_LABEL: Record<UnitDocument['kind'], string> = {
  contract_generated: 'Contrato gerado',
  contract_uploaded:  'Contrato anexado',
  other:              'Documento',
}
const KIND_COLOR: Record<UnitDocument['kind'], string> = {
  contract_generated: '#F59E0B',
  contract_uploaded:  '#60A5FA',
  other:              '#94A3B8',
}

export function UnitDocumentsCard({ unitId }: { unitId: string }) {
  const { data: docs = [], isLoading } = useUnitDocuments(unitId)
  const upload = useUploadUnitDocument()
  const del = useDeleteUnitDocument()
  const fileRef = useRef<HTMLInputElement>(null)
  const [opening, setOpening] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande (máx. 10MB).'); return }
    try {
      await upload.mutateAsync({ unitId, file: f, name: f.name, kind: 'contract_uploaded' })
      toast.success('Documento anexado')
    } catch (err) {
      toast.error(translateError(err))
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function view(doc: UnitDocument) {
    setOpening(doc.id)
    const url = await getDocumentUrl(doc.storage_path)
    setOpening(null)
    if (url) window.open(url, '_blank', 'noopener')
    else toast.error('Não foi possível abrir o documento.')
  }

  async function remove(doc: UnitDocument) {
    try { await del.mutateAsync(doc); toast.success('Documento removido') }
    catch (e) { toast.error(translateError(e)) }
  }

  return (
    <div className="pm-card space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <FileText size={12} /> Documentos / Contratos
        </p>
        <RoleGuard roles={['company_admin', 'operations_admin', 'system_ti', 'seller', 'finance_admin']}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
            className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 bg-amber-500/[0.08] px-3 py-1.5 rounded-lg transition-all"
          >
            {upload.isPending ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            Anexar contrato
          </button>
        </RoleGuard>
        <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      </div>

      {isLoading ? (
        <div className="pm-skeleton h-12 rounded" />
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum documento. Anexe o contrato antigo ou gere um novo pela venda.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
              style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{doc.name}</p>
                <p className="text-[11px]" style={{ color: KIND_COLOR[doc.kind] }}>
                  {KIND_LABEL[doc.kind]} · {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => view(doc)} disabled={opening === doc.id}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md text-zinc-200 hover:bg-white/[0.06] transition-colors">
                  {opening === doc.id ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />} Ver
                </button>
                <RoleGuard roles={['company_admin', 'operations_admin', 'system_ti']}>
                  <button type="button" onClick={() => remove(doc)} disabled={del.isPending}
                    className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-white/[0.06] transition-colors" title="Remover">
                    <Trash2 size={14} />
                  </button>
                </RoleGuard>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
