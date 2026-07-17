import type { EcuCatalogRow } from '@/types/ecu-catalog'
import type { EcuCategory } from '@/hooks/useEcuCategories'

function escapeXml(v: string | number | boolean | null | undefined): string {
  if (v == null) return ''
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function rowToXml(row: EcuCatalogRow): string {
  return `    <registro>
      <id>${escapeXml(row.id)}</id>
      <marca>${escapeXml(row.marca)}</marca>
      <secao_original>${escapeXml(row.secao_original)}</secao_original>
      <modelo_descricao>${escapeXml(row.modelo_descricao)}</modelo_descricao>
      <ano>${escapeXml(row.ano)}</ano>
      <tipo_registro>${escapeXml(row.tipo_registro)}</tipo_registro>
      <aparelho>${escapeXml(row.aparelho)}</aparelho>
      <protocolo>${escapeXml(row.protocolo)}</protocolo>
      <cabo>${escapeXml(row.cabo)}</cabo>
      <ganho>${escapeXml(row.ganho)}</ganho>
      <cv_original>${row.cv_original ?? ''}</cv_original>
      <cv_tuned>${row.cv_tuned ?? ''}</cv_tuned>
      <kgfm_original>${row.kgfm_original ?? ''}</kgfm_original>
      <kgfm_tuned>${row.kgfm_tuned ?? ''}</kgfm_tuned>
      <preco_franqueado>${row.preco_franqueado ?? ''}</preco_franqueado>
      <preco_cliente_final>${row.preco_cliente_final ?? ''}</preco_cliente_final>
      <ativo>${row.ativo}</ativo>
      <ativo_ecommerce>${row.ativo_ecommerce}</ativo_ecommerce>
      <observacoes>${escapeXml(row.observacoes)}</observacoes>
      <arquivo_origem>${escapeXml(row.arquivo_origem)}</arquivo_origem>
    </registro>`
}

export function buildEcuXml(rows: EcuCatalogRow[], categories: EcuCategory[]): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- Injediesel System — Catálogo ECU — Exportado em ${new Date().toISOString()} -->`,
    '<catalogo-ecu>',
  ]
  for (const cat of categories) {
    const catRows = rows.filter(r => r.categoria_slug === cat.slug)
    if (catRows.length === 0) continue
    lines.push(`  <categoria nome="${escapeXml(cat.label)}" slug="${cat.slug}">`)
    catRows.forEach(r => lines.push(rowToXml(r)))
    lines.push('  </categoria>')
  }
  lines.push('</catalogo-ecu>')
  return lines.join('\n')
}

function triggerDownload(content: string, filename: string, mime = 'application/xml; charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadEcuXml(rows: EcuCatalogRow[], categories: EcuCategory[]) {
  const xml = buildEcuXml(rows, categories)
  const date = new Date().toISOString().slice(0, 10)
  triggerDownload(xml, `injediesel-catalogo-ecu-${date}.xml`)
}

export function downloadEcuXmlTemplate() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- ============================================================
     MODELO DE IMPORTAÇÃO — Injediesel System ECU Catalog
     ============================================================
     Instruções:
       - Não modifique os nomes das tags.
       - Para ATUALIZAR um registro existente: inclua <id> com o UUID.
       - Para CRIAR um novo registro: omita <id> ou deixe vazio.
       - tipo_registro: Dados | Serviço/Adicional | Observação
       - ativo / ativo_ecommerce: true | false
       - Slugs de categoria disponíveis:
           carros-e-suvs | pickups | trucks | agricola | maquinas | motos
     ============================================================ -->
<catalogo-ecu>
  <categoria nome="Carros &amp; SUVs" slug="carros-e-suvs">
    <registro>
      <id></id>
      <marca>Volkswagen</marca>
      <secao_original>Golf</secao_original>
      <modelo_descricao>1.4 TSI 125cv</modelo_descricao>
      <ano>2014/2020</ano>
      <tipo_registro>Dados</tipo_registro>
      <aparelho>KESS V2</aparelho>
      <protocolo>OBD</protocolo>
      <cabo>K-TAG</cabo>
      <ganho>+30CV +4,8KG</ganho>
      <cv_original>125</cv_original>
      <cv_tuned>155</cv_tuned>
      <kgfm_original></kgfm_original>
      <kgfm_tuned></kgfm_tuned>
      <preco_franqueado>380</preco_franqueado>
      <preco_cliente_final>520</preco_cliente_final>
      <ativo>true</ativo>
      <ativo_ecommerce>true</ativo_ecommerce>
      <observacoes></observacoes>
      <arquivo_origem></arquivo_origem>
    </registro>
  </categoria>
  <categoria nome="Pickups" slug="pickups">
    <registro>
      <id></id>
      <marca></marca>
      <secao_original></secao_original>
      <modelo_descricao></modelo_descricao>
      <ano></ano>
      <tipo_registro>Dados</tipo_registro>
      <aparelho></aparelho>
      <protocolo></protocolo>
      <cabo></cabo>
      <ganho></ganho>
      <cv_original></cv_original>
      <cv_tuned></cv_tuned>
      <kgfm_original></kgfm_original>
      <kgfm_tuned></kgfm_tuned>
      <preco_franqueado></preco_franqueado>
      <preco_cliente_final></preco_cliente_final>
      <ativo>true</ativo>
      <ativo_ecommerce>true</ativo_ecommerce>
      <observacoes></observacoes>
      <arquivo_origem></arquivo_origem>
    </registro>
  </categoria>
</catalogo-ecu>`
  triggerDownload(xml, 'injediesel-modelo-importacao-ecu.xml')
}

// ─── Shared ParseResult ────────────────────────────────────────────────────────

export interface ParseResult {
  records: Array<Omit<EcuCatalogRow, 'created_at' | 'updated_at'>>
  inserted: number
  updated: number
}

// ─── CSV support ──────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  'id','categoria','secao_original','marca','modelo_descricao','ano',
  'aparelho','protocolo','cabo','ganho','cv_original','cv_tuned',
  'kgfm_original','kgfm_tuned','preco_franqueado','preco_cliente_final',
  'observacoes','ativo','ativo_ecommerce','arquivo_origem',
] as const

function csvEscape(v: string | number | boolean | null | undefined): string {
  if (v == null) return ''
  const s = String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function rowToCsv(row: EcuCatalogRow): string {
  return CSV_HEADERS.map(h => csvEscape((row as unknown as Record<string, unknown>)[h] as string | number | boolean | null)).join(',')
}

export function buildEcuCsv(rows: EcuCatalogRow[]): string {
  const lines = [CSV_HEADERS.join(',')]
  for (const r of rows) lines.push(rowToCsv(r))
  return lines.join('\n')
}

export function downloadEcuCsv(rows: EcuCatalogRow[]) {
  const date = new Date().toISOString().slice(0, 10)
  triggerDownload(buildEcuCsv(rows), `injediesel-catalogo-ecu-${date}.csv`, 'text/csv; charset=utf-8')
}

export function downloadEcuCsvTemplate() {
  const header = CSV_HEADERS.join(',')
  const sample = [
    'id1,Carros & SUVs,Golf,Volkswagen,1.4 TSI 125cv,2014/2020,KESS V2,OBD,K-TAG,+30CV +4.8KG,125,155,,,380,520,,true,true,tabela_2024.csv',
    ',Pickups,Amarok,Volkswagen,3.0 V6 TDI 224cv,2018/2023,KESS V2,OBD,,+66CV +14KG,224,290,,,780,1050,Atenção: cabo especial 226,true,true,',
    ',Máquinas,ESCAVADEIRA,Caterpillar,CATERPILLAR 315D,,KESS,FAMILIA 358(ID),226/246,,,,,,3500,,Verificar versão de firmware,true,true,',
  ]
  triggerDownload([header, ...sample].join('\n'), 'injediesel-modelo-importacao-ecu.csv', 'text/csv; charset=utf-8')
}

export function parseEcuCsv(csvText: string): ParseResult {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) throw new Error('CSV sem dados.')

  // eslint-disable-next-line no-irregular-whitespace
  const rawHeader = lines[0].replace(/^﻿/, '') // strip BOM
  const headers = rawHeader.split(',').map(h => h.trim().toLowerCase())

  const col = (row: string[], name: string) => {
    const i = headers.indexOf(name)
    return i >= 0 ? row[i]?.trim() || null : null
  }
  const numCol = (row: string[], name: string) => {
    const v = col(row, name)
    if (!v) return null
    const n = parseFloat(v.replace(',', '.'))
    return isNaN(n) ? null : n
  }
  const boolCol = (row: string[], name: string, fallback = true) => {
    const v = col(row, name)
    if (!v) return fallback
    return v.toLowerCase() !== 'false'
  }

  // Detect categoria_slug from categoria label
  const CAT_MAP: Record<string, string> = {
    'carros & suvs': 'carros-e-suvs', 'carros e suvs': 'carros-e-suvs',
    'pickups': 'pickups', 'trucks': 'trucks',
    'agrícola': 'agricola', 'agricola': 'agricola',
    'máquinas': 'maquinas', 'maquinas': 'maquinas',
    'motos': 'motos',
  }

  function parseLine(raw: string): string[] {
    const result: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i]
      if (c === '"') {
        if (inQ && raw[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (c === ',' && !inQ) {
        result.push(cur); cur = ''
      } else {
        cur += c
      }
    }
    result.push(cur)
    return result
  }

  const records: Array<Omit<EcuCatalogRow, 'created_at' | 'updated_at'>> = []
  let inserted = 0, updated = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const row = parseLine(line)

    const rawId = col(row, 'id')
    const id = rawId && rawId.length > 10 ? rawId : crypto.randomUUID()
    if (rawId && rawId.length > 10) updated++; else inserted++

    const catLabel = col(row, 'categoria') ?? ''
    const catSlug = CAT_MAP[catLabel.toLowerCase()] ?? catLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    records.push({
      id,
      categoria: catLabel,
      categoria_slug: catSlug,
      arquivo_origem: col(row, 'arquivo_origem'),
      marca: col(row, 'marca'),
      secao_original: col(row, 'secao_original'),
      modelo_descricao: col(row, 'modelo_descricao'),
      ano: col(row, 'ano'),
      tipo_registro: 'Dados',
      aparelho: col(row, 'aparelho'),
      protocolo: col(row, 'protocolo'),
      cabo: col(row, 'cabo'),
      ganho: col(row, 'ganho'),
      cv_original: numCol(row, 'cv_original'),
      cv_tuned: numCol(row, 'cv_tuned'),
      kgfm_original: numCol(row, 'kgfm_original'),
      kgfm_tuned: numCol(row, 'kgfm_tuned'),
      preco_franqueado: numCol(row, 'preco_franqueado'),
      preco_cliente_final: numCol(row, 'preco_cliente_final'),
      ativo: boolCol(row, 'ativo'),
      ativo_ecommerce: boolCol(row, 'ativo_ecommerce'),
      observacoes: col(row, 'observacoes'),
      foto_url: null,
    })
  }

  return { records, inserted, updated }
}

export function parseEcuXml(xmlText: string): ParseResult {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')
  const parserError = doc.querySelector('parsererror')
  if (parserError) throw new Error(`XML inválido: ${parserError.textContent?.slice(0, 200)}`)

  const records: Array<Omit<EcuCatalogRow, 'created_at' | 'updated_at'>> = []
  let inserted = 0
  let updated = 0

  const getText = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || null
  const getNum = (el: Element, tag: string) => {
    const t = getText(el, tag)
    if (!t) return null
    const n = parseFloat(t.replace(',', '.'))
    return isNaN(n) ? null : n
  }
  const getBool = (el: Element, tag: string, fallback = true) => {
    const t = getText(el, tag)
    if (!t) return fallback
    return t.toLowerCase() !== 'false'
  }

  for (const cat of Array.from(doc.querySelectorAll('categoria'))) {
    const catSlug = cat.getAttribute('slug') ?? ''
    const catLabel = cat.getAttribute('nome') ?? ''

    for (const reg of Array.from(cat.querySelectorAll('registro'))) {
      const rawId = getText(reg, 'id')
      const id = rawId && rawId.length > 0 ? rawId : crypto.randomUUID()
      if (rawId && rawId.length > 0) updated++ ; else inserted++

      records.push({
        id,
        categoria: catLabel,
        categoria_slug: catSlug,
        arquivo_origem: getText(reg, 'arquivo_origem'),
        marca: getText(reg, 'marca'),
        secao_original: getText(reg, 'secao_original'),
        modelo_descricao: getText(reg, 'modelo_descricao'),
        ano: getText(reg, 'ano'),
        tipo_registro: (getText(reg, 'tipo_registro') as EcuCatalogRow['tipo_registro']) ?? 'Dados',
        aparelho: getText(reg, 'aparelho'),
        protocolo: getText(reg, 'protocolo'),
        cabo: getText(reg, 'cabo'),
        ganho: getText(reg, 'ganho'),
        cv_original: getNum(reg, 'cv_original'),
        cv_tuned: getNum(reg, 'cv_tuned'),
        kgfm_original: getNum(reg, 'kgfm_original'),
        kgfm_tuned: getNum(reg, 'kgfm_tuned'),
        preco_franqueado: getNum(reg, 'preco_franqueado'),
        preco_cliente_final: getNum(reg, 'preco_cliente_final'),
        ativo: getBool(reg, 'ativo'),
        ativo_ecommerce: getBool(reg, 'ativo_ecommerce'),
        observacoes: getText(reg, 'observacoes'),
        foto_url: null,
      })
    }
  }

  return { records, inserted, updated }
}
