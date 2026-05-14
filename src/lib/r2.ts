// R2 presigned URLs são geradas por Supabase Edge Functions
// Este módulo chama a Edge Function que assina a URL com expiração curta

export interface PresignedUploadUrl {
  uploadUrl: string
  key: string
}

export interface PresignedDownloadUrl {
  downloadUrl: string
  expiresAt: string
}

export async function getPresignedUploadUrl(params: {
  bucket: 'originals' | 'delivered'
  fileName: string
  mimeType: string
  accessToken: string
}): Promise<PresignedUploadUrl> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-presign-upload`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({
        bucket: params.bucket,
        fileName: params.fileName,
        mimeType: params.mimeType,
      }),
    }
  )

  if (!res.ok) throw new Error('Falha ao gerar URL de upload')
  return res.json()
}

export async function getPresignedDownloadUrl(params: {
  r2Key: string
  accessToken: string
}): Promise<PresignedDownloadUrl> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-presign-download`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({ r2Key: params.r2Key }),
    }
  )

  if (!res.ok) throw new Error('Falha ao gerar URL de download')
  return res.json()
}
