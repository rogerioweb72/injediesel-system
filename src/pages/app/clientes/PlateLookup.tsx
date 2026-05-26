import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useBrasilAPI, type VehicleInfo } from '@/hooks/useBrasilAPI'

interface PlateLookupProps {
  value: string
  onChange: (plate: string) => void
  onFound: (info: VehicleInfo) => void
}

export function PlateLookup({ value, onChange, onFound }: PlateLookupProps) {
  const { lookupPlate } = useBrasilAPI()
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  async function handleLookup() {
    if (!value) return
    setLoading(true)
    setNotFound(false)
    const result = await lookupPlate(value)
    setLoading(false)
    if (result) {
      onFound(result)
    } else {
      setNotFound(true)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          placeholder="ABC1234 ou BRA2E19"
          value={value}
          onChange={(e) => { onChange(e.target.value.toUpperCase()); setNotFound(false) }}
          maxLength={8}
        />
        <Button type="button" variant="outline" onClick={handleLookup} disabled={loading || !value}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        </Button>
      </div>
      {notFound && (
        <p className="text-xs text-amber-400">Placa não encontrada — preencha os campos manualmente.</p>
      )}
    </div>
  )
}
