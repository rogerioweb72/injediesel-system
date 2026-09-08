import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BR_STATES, PY_DEPARTMENTS, PY_CITIES, fetchBrCities } from '@/lib/locations'

interface Props {
  country: 'BR' | 'PY'
  estado: string
  cidade: string
  onEstado: (v: string) => void
  onCidade: (v: string) => void
  /** prefixo único p/ os ids de datalist (2 forms na mesma página não colidem) */
  idPrefix?: string
}

/**
 * Cidade (autocomplete) + Estado/Departamento (seletor com typeahead) para BR/PY.
 * Usa <datalist> nativo: dropdown + filtra pelas primeiras letras, e ainda aceita
 * digitação livre. BR: 27 UFs + cidades do IBGE (por UF). PY: 17 departamentos +
 * principais cidades. Renderiza 2 campos (fragmento) — o pai controla o grid.
 */
export function LocationFields({ country, estado, cidade, onEstado, onCidade, idPrefix = 'loc' }: Props) {
  const isPY = country === 'PY'
  const states = isPY ? PY_DEPARTMENTS : BR_STATES
  const [brCities, setBrCities] = useState<string[]>([])

  useEffect(() => {
    if (isPY) { setBrCities([]); return }
    const uf = estado.trim().toUpperCase()
    if (uf.length === 2) { void fetchBrCities(uf).then(setBrCities) }
    else setBrCities([])
  }, [country, estado, isPY])

  const cityOptions = isPY ? PY_CITIES : brCities
  const estadoListId = `${idPrefix}-estados`
  const cidadeListId = `${idPrefix}-cidades`

  return (
    <>
      <div className="space-y-1">
        <Label>Cidade</Label>
        <Input
          list={cidadeListId}
          value={cidade}
          onChange={e => onCidade(e.target.value)}
          placeholder={isPY ? 'Ex.: Ciudad del Este' : 'Ex.: São Paulo'}
          autoComplete="off"
        />
        <datalist id={cidadeListId}>
          {cityOptions.map(c => <option key={c} value={c} />)}
        </datalist>
      </div>
      <div className="space-y-1">
        <Label>{isPY ? 'Departamento' : 'Estado'}</Label>
        <Input
          list={estadoListId}
          value={estado}
          onChange={e => onEstado(isPY ? e.target.value : e.target.value.toUpperCase())}
          placeholder={isPY ? 'Ex.: Central' : 'Ex.: SP'}
          autoComplete="off"
          maxLength={isPY ? 40 : 2}
        />
        <datalist id={estadoListId}>
          {states.map(s => (
            <option key={s.code} value={isPY ? s.name : s.code}>{s.name}</option>
          ))}
        </datalist>
      </div>
    </>
  )
}
