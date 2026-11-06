/**
 * Validações de usabilidade da tela de acesso.
 *
 * Estas regras antecipam erros óbvios antes do envio; a autoridade continua
 * sendo o Firebase Authentication e o servidor. Nenhuma regra de autorização
 * é decidida aqui.
 */

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validarEmail(valor: string): string | null {
  const email = valor.trim();

  if (!email) return 'Informe seu e-mail.';
  if (email.length > 254) return 'O e-mail informado é muito longo.';
  if (!FORMATO_EMAIL.test(email)) return 'Informe um e-mail válido.';

  return null;
}

export function validarSenha(valor: string): string | null {
  if (!valor) return 'Informe sua senha.';
  if (valor.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';

  return null;
}

export function validarNome(valor: string): string | null {
  const nome = valor.trim();

  if (!nome) return 'Informe seu nome.';
  if (nome.length < 2) return 'O nome deve ter pelo menos 2 caracteres.';
  if (nome.length > 120) return 'O nome deve ter no máximo 120 caracteres.';

  return null;
}

export function validarConfirmacao(senha: string, confirmacao: string): string | null {
  if (!confirmacao) return 'Confirme sua senha.';
  if (senha !== confirmacao) return 'As senhas não coincidem.';

  return null;
}
