export function traduz(m) {
  // Garante uma string legível: o SDK às vezes entrega objeto, "{}" ou vazio.
  const s = (typeof m === 'string' ? m : (m && (m.message || m.msg)) || '').trim()
  if (/Invalid login credentials/i.test(s)) return 'Email ou senha incorretos.'
  if (/already registered|already been registered/i.test(s)) return 'Esse email já tem conta. Faça login.'
  if (/Email not confirmed/i.test(s)) return 'Confirme seu email antes de entrar (veja sua caixa de entrada).'
  if (/Password should be|weak_password/i.test(s)) return 'A senha precisa ter ao menos 6 caracteres.'
  if (/sending (the )?confirmation email|error sending|smtp/i.test(s)) {
    return 'Não consegui enviar o e-mail de confirmação agora. Tente de novo em alguns minutos.'
  }
  if (/rate limit|too many/i.test(s)) return 'Muitas tentativas. Espere um pouco e tente de novo.'
  if (!s || s === '{}' || s === '[object Object]') return 'Algo deu errado. Tente de novo em instantes.'
  return s
}
