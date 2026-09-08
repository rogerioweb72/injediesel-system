// Dados de localização BR/PY para os seletores de Estado + autocomplete de Cidade
// no cadastro de cliente. BR: 27 UFs + cidades via IBGE (por UF). PY: 17
// departamentos + principais cidades/distritos (estático — não há API livre boa).

export interface StateOption { code: string; name: string }

// ── Brasil — 27 unidades federativas ────────────────────────────────────────
export const BR_STATES: StateOption[] = [
  { code: 'AC', name: 'Acre' },              { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },             { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },             { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },             { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },       { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },      { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },           { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },        { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },    { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' }, { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },           { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },         { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' },
]

// ── Paraguai — 17 departamentos + Asunción (capital) ────────────────────────
export const PY_DEPARTMENTS: StateOption[] = [
  { code: 'ASU', name: 'Asunción' },
  { code: 'CON', name: 'Concepción' },       { code: 'SPE', name: 'San Pedro' },
  { code: 'COR', name: 'Cordillera' },       { code: 'GUA', name: 'Guairá' },
  { code: 'CAG', name: 'Caaguazú' },         { code: 'CAZ', name: 'Caazapá' },
  { code: 'ITA', name: 'Itapúa' },           { code: 'MIS', name: 'Misiones' },
  { code: 'PAR', name: 'Paraguarí' },        { code: 'APA', name: 'Alto Paraná' },
  { code: 'CEN', name: 'Central' },          { code: 'NEE', name: 'Ñeembucú' },
  { code: 'AMA', name: 'Amambay' },          { code: 'CAN', name: 'Canindeyú' },
  { code: 'PHA', name: 'Presidente Hayes' }, { code: 'BOQ', name: 'Boquerón' },
  { code: 'ALP', name: 'Alto Paraguay' },
]

// ── Paraguai — principais cidades/distritos (autocomplete; digitação livre) ──
export const PY_CITIES: string[] = [
  'Asunción', 'Ciudad del Este', 'San Lorenzo', 'Luque', 'Capiatá', 'Lambaré',
  'Fernando de la Mora', 'Limpio', 'Ñemby', 'Encarnación', 'Mariano Roque Alonso',
  'Pedro Juan Caballero', 'Itauguá', 'Villa Elisa', 'Caaguazú', 'Coronel Oviedo',
  'Presidente Franco', 'Concepción', 'Villarrica', 'Pilar', 'Caacupé', 'Paraguarí',
  'San Juan Bautista', 'Hernandarias', 'Minga Guazú', 'Areguá', 'Itá', 'Villeta',
  'Salto del Guairá', 'Filadelfia', 'San Estanislao', 'Santa Rita', 'Katueté',
  'Nueva Italia', 'Ypacaraí', 'Guarambaré', 'Tobatí', 'Piribebuy', 'Ayolas',
  'San Ignacio', 'Horqueta', 'Curuguaty', 'Bella Vista',
]

// Cache das cidades do IBGE por UF (evita refetch).
const brCityCache = new Map<string, string[]>()

/**
 * Cidades de uma UF brasileira via IBGE. Devolve [] em falha/UF vazia.
 */
export async function fetchBrCities(uf: string): Promise<string[]> {
  const key = uf.trim().toUpperCase()
  if (!key || key.length !== 2) return []
  if (brCityCache.has(key)) return brCityCache.get(key)!
  try {
    const res = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${key}/municipios`,
    )
    if (!res.ok) return []
    const data = await res.json() as Array<{ nome: string }>
    const cities = data.map(c => c.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'))
    brCityCache.set(key, cities)
    return cities
  } catch {
    return []
  }
}
