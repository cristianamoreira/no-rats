export function traduz(m) {
  if (/Invalid login credentials/i.test(m)) return 'Email ou senha incorretos.'
  if (/already registered/i.test(m)) return 'Esse email já tem conta. Faça login.'
  if (/Email not confirmed/i.test(m)) return 'Confirme seu email antes de entrar (veja sua caixa de entrada).'
  if (/Password should be/i.test(m)) return 'A senha precisa ter ao menos 6 caracteres.'
  return m
}
