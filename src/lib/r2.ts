const PRESIGN_API_URL = import.meta.env.VITE_R2_PRESIGN_URL as string

export interface UploadResult {
  key: string
}

export interface PresignedDownloadUrl {
  downloadUrl: string
  expiresAt?: string
}

export async function uploadFileToR2(params: {
  bucket: 'originals' | 'delivered'
  file: File
  accessToken: string
  jobId?: string
}): Promise<UploadResult> {
  const form = new FormData()
  form.append('bucket', params.bucket)
  form.append('file', params.file, params.file.name)
  if (params.jobId) form.append('jobId', params.jobId)

  const res = await fetch(`${PRESIGN_API_URL}/r2-presign-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.accessToken}` },
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Falha ao enviar arquivo: ${text}`)
  }

  return res.json()
}

export async function downloadFileFromR2(params: {
  bucket: 'originals' | 'delivered'
  r2Key: string
  fileName: string
  accessToken: string
}): Promise<void> {
  const res = await fetch(`${PRESIGN_API_URL}/r2-presign-download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({ bucket: params.bucket, r2Key: params.r2Key }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Falha ao baixar arquivo: ${text}`)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = params.fileName
  a.click()
  URL.revokeObjectURL(url)
}

// -----------------------------------------------------------------
// Marketing Materials — R2 via Worker
// -----------------------------------------------------------------

export interface MktUploadResult {
  key: string
  size: number
  type: string
}

export async function uploadMktMaterialToR2(params: {
  file: File
  category: string
  accessToken: string
}): Promise<MktUploadResult> {
  const form = new FormData()
  form.append('category', params.category)
  form.append('file', params.file, params.file.name)

  const res = await fetch(`${PRESIGN_API_URL}/r2-mkt-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.accessToken}` },
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Falha ao enviar material: ${text}`)
  }

  return res.json()
}

export async function downloadMktMaterialFromR2(params: {
  r2Key: string
  fileName: string
  accessToken: string
}): Promise<void> {
  const res = await fetch(`${PRESIGN_API_URL}/r2-mkt-download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({ r2Key: params.r2Key, fileName: params.fileName }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Falha ao baixar material: ${text}`)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = params.fileName
  a.click()
  URL.revokeObjectURL(url)
}

export async function deleteMktMaterialFromR2(params: {
  r2Key: string
  accessToken: string
}): Promise<void> {
  const res = await fetch(`${PRESIGN_API_URL}/r2-mkt-delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({ r2Key: params.r2Key }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Falha ao excluir material: ${text}`)
  }
}

// -----------------------------------------------------------------
// Firmware — R2 via Worker
// -----------------------------------------------------------------

export interface FirmwareUploadResult {
  key: string
  size?: number
  fileName?: string
}

export async function uploadFirmwareImageToR2(params: {
  file: File
  accessToken: string
}): Promise<FirmwareUploadResult> {
  const form = new FormData()
  form.append('file', params.file, params.file.name)

  const res = await fetch(`${PRESIGN_API_URL}/r2-firmware-img-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.accessToken}` },
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Falha ao enviar imagem: ${text}`)
  }

  return res.json()
}

export async function uploadFirmwareFileToR2(params: {
  file: File
  accessToken: string
}): Promise<FirmwareUploadResult> {
  const form = new FormData()
  form.append('file', params.file, params.file.name)

  const res = await fetch(`${PRESIGN_API_URL}/r2-firmware-file-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.accessToken}` },
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Falha ao enviar arquivo de firmware: ${text}`)
  }

  return res.json()
}

export async function downloadFirmwareFileFromR2(params: {
  r2Key: string
  updateId: string
  fileName: string
  accessToken: string
}): Promise<void> {
  const res = await fetch(`${PRESIGN_API_URL}/r2-firmware-download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      r2Key: params.r2Key,
      updateId: params.updateId,
      fileName: params.fileName,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Falha ao baixar arquivo: ${text}`)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = params.fileName
  a.click()
  URL.revokeObjectURL(url)
}
