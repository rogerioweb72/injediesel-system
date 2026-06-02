// Traduz mensagens de erro do Supabase e erros genéricos para PT-BR.
// Usar em TODOS os lugares que exibem err.message ao usuário.

const AUTH_MAP: [RegExp | string, string][] = [
  ['Invalid login credentials',              'E-mail ou senha incorretos.'],
  ['Invalid email or password',              'E-mail ou senha incorretos.'],
  ['Email not confirmed',                    'E-mail não confirmado. Verifique sua caixa de entrada.'],
  ['Email link is invalid or has expired',   'Link inválido ou expirado. Solicite um novo.'],
  ['Token has expired',                      'Link expirado. Solicite um novo.'],
  ['Invalid token',                          'Token inválido ou expirado.'],
  ['User not found',                         'Usuário não encontrado.'],
  ['User already registered',                'Este e-mail já está cadastrado.'],
  ['Password should be at least 6 characters', 'A senha deve ter pelo menos 6 caracteres.'],
  ['New password should be different',       'A nova senha deve ser diferente da atual.'],
  ['Too many requests',                      'Muitas tentativas. Aguarde alguns minutos.'],
  ['Email rate limit exceeded',              'Limite de envio de e-mails atingido. Tente mais tarde.'],
  ['Signup is disabled',                     'Cadastro desabilitado. Contate o administrador.'],
  ['duplicate key value',                    'Registro duplicado.'],
  ['violates foreign key constraint',        'Operação não permitida: referência inválida.'],
  ['violates unique constraint',             'Este valor já está cadastrado.'],
  ['permission denied',                      'Sem permissão para esta ação.'],
  ['JWT expired',                            'Sessão expirada. Faça login novamente.'],
  ['invalid claim',                          'Sessão inválida. Faça login novamente.'],
  [/network/i,                               'Erro de conexão. Verifique sua internet.'],
  [/fetch/i,                                 'Erro de conexão. Verifique sua internet.'],
]

export function translateError(raw: unknown): string {
  const msg = raw instanceof Error ? raw.message
    : typeof raw === 'string' ? raw
    : String(raw)

  for (const [pattern, translation] of AUTH_MAP) {
    if (typeof pattern === 'string' ? msg.includes(pattern) : pattern.test(msg)) {
      return translation
    }
  }

  // Retornar a mensagem original somente se já estiver em PT-BR (sem caracteres só-ASCII suspeitos)
  // Caso contrário, usar mensagem genérica
  const likelyEnglish = /^[A-Za-z0-9 _.,!?'"-]+$/.test(msg.trim())
  return likelyEnglish ? 'Ocorreu um erro inesperado. Tente novamente.' : msg
}

export function translateAuthError(raw: unknown): string {
  const msg = raw instanceof Error ? raw.message
    : typeof raw === 'string' ? raw
    : String(raw)

  for (const [pattern, translation] of AUTH_MAP) {
    if (typeof pattern === 'string' ? msg.includes(pattern) : pattern.test(msg)) {
      return translation
    }
  }
  return 'E-mail ou senha incorretos.'
}
