import type { BancoDemo } from '@/services/demo/banco';
import { VERSAO_BANCO_DEMO } from '@/services/demo/banco';
import { criarBancoDemonstracao } from '@/services/demo/semente';

const CHAVE_BANCO = 'horario-aula:demo:banco:v1';
const CHAVE_SESSAO = 'horario-aula:demo:sessao:v1';

function bancoValido(valor: unknown): valor is BancoDemo {
  if (typeof valor !== 'object' || valor === null) return false;
  const candidato = valor as Partial<BancoDemo>;
  return (
    candidato.versao === VERSAO_BANCO_DEMO &&
    Array.isArray(candidato.professores) &&
    Array.isArray(candidato.disciplinas) &&
    Array.isArray(candidato.turmas) &&
    Array.isArray(candidato.aulas) &&
    Array.isArray(candidato.historico) &&
    Array.isArray(candidato.favoritos) &&
    typeof candidato.configuracao === 'object' &&
    candidato.configuracao !== null
  );
}

export function carregarBancoDemo(): BancoDemo {
  try {
    const bruto = window.localStorage.getItem(CHAVE_BANCO);
    if (bruto) {
      const valor: unknown = JSON.parse(bruto);
      if (bancoValido(valor)) return valor;
    }
  } catch {
    // Armazenamento indisponível ou conteúdo inválido: recria a base demonstrativa.
  }

  const novoBanco = criarBancoDemonstracao();
  salvarBancoDemo(novoBanco);
  return novoBanco;
}

export function salvarBancoDemo(banco: BancoDemo): void {
  try {
    window.localStorage.setItem(CHAVE_BANCO, JSON.stringify(banco));
  } catch {
    // O modo demonstração continua em memória mesmo sem persistência.
  }
}

export function carregarSessaoDemo(): string | null {
  try {
    return window.localStorage.getItem(CHAVE_SESSAO);
  } catch {
    return null;
  }
}

export function salvarSessaoDemo(uid: string | null): void {
  try {
    if (uid) {
      window.localStorage.setItem(CHAVE_SESSAO, uid);
    } else {
      window.localStorage.removeItem(CHAVE_SESSAO);
    }
  } catch {
    // Sem persistência de sessão demonstrativa.
  }
}
