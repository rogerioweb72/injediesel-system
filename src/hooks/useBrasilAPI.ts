export interface VehicleInfo {
  marca: string
  modelo: string
  anoModelo: number | null
  combustivel: string | null
  motor: string | null
}

export function useBrasilAPI() {
  async function lookupPlate(plate: string): Promise<VehicleInfo | null> {
    try {
      const res = await fetch(`https://apiplacas.com.br/api/v1/placa/${plate.toUpperCase()}`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) return null
      const data = await res.json()
      if (!data?.marca) return null
      return {
        marca: data.marca ?? '',
        modelo: data.modelo ?? '',
        anoModelo: data.anoModelo ?? null,
        combustivel: data.combustivel ?? null,
        motor: data.motor ?? null,
      }
    } catch {
      return null
    }
  }

  return { lookupPlate }
}
