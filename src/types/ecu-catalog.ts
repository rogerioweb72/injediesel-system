// src/types/ecu-catalog.ts

export interface EcuCatalogRow {
  id: string
  categoria: string
  categoria_slug: string
  arquivo_origem: string | null
  secao_original: string | null
  marca: string | null
  tipo_registro: 'Dados' | 'Serviço/Adicional' | 'Observação'
  modelo_descricao: string | null
  ano: string | null
  ganho: string | null
  cv_original: number | null
  cv_tuned: number | null
  kgfm_original: number | null
  kgfm_tuned: number | null
  aparelho: string | null
  protocolo: string | null
  cabo: string | null
  preco_franqueado: number | null
  preco_cliente_final: number | null
  observacoes: string | null
  foto_url: string | null
  ativo: boolean
  ativo_ecommerce: boolean
  created_at: string
  updated_at: string
}

export interface CatalogFilters {
  categoriaSlug?: string
  marca?: string
  modelo?: string
  ano?: string
  apenasAtivos?: boolean
  page?: number
  pageSize?: number
}

export interface BulkPricePayload {
  target: 'preco_franqueado' | 'preco_cliente_final'
  categoriaSlug: string | 'all'
  percentual: number
}

export type EcuMotorizacao = Pick<
  EcuCatalogRow,
  'id' | 'marca' | 'secao_original' | 'modelo_descricao' | 'ano' | 'ganho' |
  'cv_original' | 'cv_tuned' | 'kgfm_original' | 'kgfm_tuned' |
  'aparelho' | 'protocolo' | 'cabo' | 'arquivo_origem' |
  'preco_franqueado' | 'preco_cliente_final' | 'tipo_registro' |
  'observacoes' | 'foto_url' | 'ativo' | 'ativo_ecommerce'
>

export interface EcuModelo {
  secao: string
  motorizacoes: EcuMotorizacao[]
}

export interface EcuMarca {
  marca: string
  modelos: EcuModelo[]
}

export function groupByMarcaModelo(rows: EcuCatalogRow[]): EcuMarca[] {
  const map = new Map<string, Map<string, EcuMotorizacao[]>>()

  for (const row of rows) {
    const marca  = row.marca  ?? 'Sem marca'
    const secao  = row.secao_original ?? 'Geral'

    if (!map.has(marca)) map.set(marca, new Map())
    const modeloMap = map.get(marca)!
    if (!modeloMap.has(secao)) modeloMap.set(secao, [])
    modeloMap.get(secao)!.push(row)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([marca, modeloMap]) => ({
      marca,
      modelos: Array.from(modeloMap.entries())
        .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
        .map(([secao, motorizacoes]) => ({ secao, motorizacoes })),
    }))
}
