// Whitelist canônica de extensões de arquivo ECU — fonte única pro front
// (EcuJobForm.tsx, EcuJobDetail.tsx). Antes eram 3 listas hardcoded
// divergentes entre si (uma tinha .hex, outra não, nenhuma tinha .txt).
//
// ATENÇÃO: scan-ecu-file/index.ts (Deno, runtime separado — não dá pra
// importar isso de lá) tem a MESMA lista duplicada manualmente. Mudar
// aqui exige mudar lá também, ou o backend rejeita o que o front aceitou.
export const ECU_FILE_EXTENSIONS = [
  // binários universais
  'bin', 'ori', 'hex', 's19', 's28', 's37', 'srec', 'mot', 'mxt',
  // proprietários de ferramentas de tuning
  'kfg', 'bck', 'eprom', 'cod', 'dtf', 'bbf', 'srf', 'tun', 'cal', 'map',
  'ecu', 'rom', 'img', 'frf', 'fpf', 'sgm', 'sgo', 'sox', 'odx', 'a2l', 'xdf', 'damos', 'dam',
  // dados/calibração
  'csv', 'xml', 'json', 'dat', 'log',
  // containers/compactados
  'zip', 'rar', '7z', 'gz', 'tar',
  // texto/documentação
  'txt', 'pdf',
] as const

// Dica do seletor de arquivos (accept=). É só sugestão — o usuário pode escolher
// "todos os arquivos" e a validação abaixo (blocklist) é quem realmente decide.
export const ECU_ACCEPTED_EXTENSIONS = ECU_FILE_EXTENSIONS.map((e) => `.${e}`).join(',')

// BLOCKLIST: só executáveis/scripts perigosos são barrados. QUALQUER outro arquivo
// (todos os formatos de ECU do mundo, inclusive sem extensão) é aceito. Mantida em
// sync manual com scan-ecu-file/index.ts (BLOCKED_EXTENSIONS).
export const BLOCKED_ECU_EXTENSIONS = [
  'exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'ps1', 'vbs', 'vbe',
  'js', 'mjs', 'jse', 'wsf', 'hta', 'sh', 'bash', 'php', 'phtml',
  'py', 'pl', 'rb', 'jar', 'app', 'apk', 'dll', 'so',
  'html', 'htm', 'xhtml', 'svg', 'lnk',
] as const

export function isEcuFileExtensionAllowed(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  // Sem extensão: aceita (muitos dumps de ECU não têm). Bloqueia só a blocklist.
  if (!ext || ext === fileName.toLowerCase()) return true
  return !(BLOCKED_ECU_EXTENSIONS as readonly string[]).includes(ext)
}
