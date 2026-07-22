// Whitelist canônica de extensões de arquivo ECU — fonte única pro front
// (EcuJobForm.tsx, EcuJobDetail.tsx). Antes eram 3 listas hardcoded
// divergentes entre si (uma tinha .hex, outra não, nenhuma tinha .txt).
//
// ATENÇÃO: scan-ecu-file/index.ts (Deno, runtime separado — não dá pra
// importar isso de lá) tem a MESMA lista duplicada manualmente. Mudar
// aqui exige mudar lá também, ou o backend rejeita o que o front aceitou.
export const ECU_FILE_EXTENSIONS = ['bin', 'ori', 'kfg', 'bck', 'eprom', 'zip', 'rar', 'hex', 'txt'] as const

export const ECU_ACCEPTED_EXTENSIONS = ECU_FILE_EXTENSIONS.map((e) => `.${e}`).join(',')

export function isEcuFileExtensionAllowed(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return (ECU_FILE_EXTENSIONS as readonly string[]).includes(ext)
}
