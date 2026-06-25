import { supabase } from '@/lib/supabase'

export interface VehicleInfo {
  marca: string
  modelo: string
  ano: string | null
  motorSugestao: string | null
  cilindradas: string | null
}

export function useBrasilAPI() {
  async function lookupPlate(plate: string): Promise<VehicleInfo | null> {
    try {
      const { data, error } = await supabase.functions.invoke('plate-lookup', {
        body: { plate: plate.toUpperCase() },
      })
      if (error) return null
      const info = data?.data
      if (!info?.marca) return null
      return {
        marca: info.marca ?? '',
        modelo: info.modelo ?? '',
        ano: info.ano ?? null,
        motorSugestao: info.motorSugestao ?? null,
        cilindradas: info.cilindradas ?? null,
      }
    } catch {
      return null
    }
  }

  return { lookupPlate }
}
