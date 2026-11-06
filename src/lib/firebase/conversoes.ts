import type { DocumentData } from 'firebase/firestore';
import type {
  ConfiguracaoHorarios,
  DiaSemana,
  IntervaloHorario,
  Modalidade,
  PeriodoAula,
  PeriodoHorario,
  StatusCadastro,
  ValorJson,
} from '@/types/dominio';
import { NUMEROS_PERIODOS } from '@/lib/constantes';
import { configuracaoInicial } from '@/lib/utilidades';

/**
 * Conversões entre o documento do Firestore e o domínio do front-end.
 *
 * O Firestore persiste `Timestamp`; as telas usam ISO 8601. Nenhum componente
 * visual deve manipular `Timestamp` diretamente (PAD-16).
 */
export function paraIso(valor: unknown): string {
  if (typeof valor === 'string') return valor;
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === 'number') return new Date(valor).toISOString();

  const objeto = valor as { toDate?: () => Date; seconds?: number } | null;
  if (objeto && typeof objeto.toDate === 'function') {
    return objeto.toDate().toISOString();
  }
  if (objeto && typeof objeto.seconds === 'number') {
    return new Date(objeto.seconds * 1000).toISOString();
  }
  return '';
}

export function texto(valor: unknown, padrao = ''): string {
  return typeof valor === 'string' ? valor : padrao;
}

export function textoNaoVazio(valor: unknown, padrao = ''): string {
  if (typeof valor !== 'string') return padrao;
  const normalizado = valor.trim();
  return normalizado.length > 0 ? normalizado : padrao;
}

export function diaSemanaValido(valor: unknown): DiaSemana | null {
  const numero = typeof valor === 'number' ? valor : Number(valor);
  return Number.isInteger(numero) && numero >= 1 && numero <= 5
    ? (numero as DiaSemana)
    : null;
}

export function periodoValido(valor: unknown): PeriodoAula | null {
  const numero = typeof valor === 'number' ? valor : Number(valor);
  return (NUMEROS_PERIODOS as readonly number[]).includes(numero)
    ? (numero as PeriodoAula)
    : null;
}

export function statusCadastro(valor: unknown): StatusCadastro {
  return valor === 'arquivado' ? 'arquivado' : 'ativo';
}

export function modalidadeCadastro(valor: unknown): Modalidade {
  return valor === 'tecnico' ? 'tecnico' : 'ensino-medio';
}

export function periodosDoValor(valor: unknown): PeriodoHorario[] {
  if (!Array.isArray(valor)) return [];

  return valor
    .flatMap((item): PeriodoHorario[] => {
      if (!item || typeof item !== 'object') return [];
      const mapa = item as Record<string, unknown>;
      const numero = periodoValido(mapa.numero);
      const inicio = textoNaoVazio(mapa.inicio);
      const fim = textoNaoVazio(mapa.fim);
      if (numero === null || !inicio || !fim) return [];
      return [{ numero, inicio, fim }];
    })
    .sort((a, b) => a.numero - b.numero);
}

export function intervaloDoValor(valor: unknown): IntervaloHorario | null {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  const mapa = valor as Record<string, unknown>;
  const inicio = textoNaoVazio(mapa.inicio);
  const fim = textoNaoVazio(mapa.fim);
  return inicio && fim ? { inicio, fim } : null;
}

/**
 * Converte o documento `configuracao/atual` para o domínio.
 * Sem documento (ou com períodos inválidos), usa a configuração inicial
 * documentada, sem persistir nada.
 */
export function configuracaoDoDocumento(dados: DocumentData | undefined): ConfiguracaoHorarios {
  const inicial = configuracaoInicial();
  const periodos = periodosDoValor(dados?.periodos);

  return {
    abertura: textoNaoVazio(dados?.abertura, inicial.abertura),
    fechamento: textoNaoVazio(dados?.fechamento, inicial.fechamento),
    periodos: periodos.length > 0 ? periodos : inicial.periodos,
    intervalo:
      dados && 'intervalo' in dados ? intervaloDoValor(dados.intervalo) : inicial.intervalo,
    atualizadoEm: paraIso(dados?.atualizadoEm) || inicial.atualizadoEm,
  };
}

/** Converte um valor arbitrário em JSON seguro para exibição no histórico. */
export function valorJson(valor: unknown): ValorJson {
  if (valor === null || typeof valor === 'string' || typeof valor === 'boolean') {
    return valor;
  }
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }
  if (Array.isArray(valor)) {
    return valor.map(valorJson);
  }
  if (typeof valor === 'object') {
    const objeto = valor as { toDate?: () => Date; seconds?: number };
    if (typeof objeto.toDate === 'function') return objeto.toDate().toISOString();
    if (typeof objeto.seconds === 'number') {
      return new Date(objeto.seconds * 1000).toISOString();
    }

    const resultado: Record<string, ValorJson> = {};
    Object.entries(valor as Record<string, unknown>).forEach(([chave, item]) => {
      resultado[chave] = valorJson(item);
    });
    return resultado;
  }
  return null;
}

export function mapaJson(valor: unknown): Record<string, ValorJson> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};
  const resultado: Record<string, ValorJson> = {};
  Object.entries(valor as Record<string, unknown>).forEach(([chave, item]) => {
    resultado[chave] = valorJson(item);
  });
  return resultado;
}
