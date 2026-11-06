import type { ConfiguracaoHorarios, PeriodoAula } from '@/types/dominio';
import { NUMEROS_PERIODOS } from '@/lib/constantes';

const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export function converterParaMinutos(hora: string): number | null {
  if (!FORMATO_HORA.test(hora)) return null;
  const [horas, minutos] = hora.split(':');
  return Number(horas) * 60 + Number(minutos);
}

export function validarConfiguracao(configuracao: ConfiguracaoHorarios): string[] {
  const erros: string[] = [];
  const abertura = converterParaMinutos(configuracao.abertura);
  const fechamento = converterParaMinutos(configuracao.fechamento);

  if (abertura === null) erros.push('Horário de abertura inválido.');
  if (fechamento === null) erros.push('Horário de fechamento inválido.');

  if (configuracao.periodos.length !== NUMEROS_PERIODOS.length) {
    erros.push('A configuração deve conter exatamente seis aulas.');
  }

  const periodosOrdenados = [...configuracao.periodos].sort((a, b) => a.numero - b.numero);
  const numeros = periodosOrdenados.map((periodo) => periodo.numero);
  const numerosEsperados = NUMEROS_PERIODOS as readonly number[];
  const numeracaoValida =
    numeros.length === numerosEsperados.length &&
    numeros.every((numero, indice) => numero === numerosEsperados[indice]);
  if (!numeracaoValida) {
    erros.push('A numeração das aulas deve ser sequencial, de 1 a 6.');
  }

  const faixas = periodosOrdenados.map((periodo) => {
    const inicio = converterParaMinutos(periodo.inicio);
    const fim = converterParaMinutos(periodo.fim);
    if (inicio === null || fim === null) {
      erros.push(`A ${periodo.numero}ª aula possui horário inválido.`);
    } else if (inicio >= fim) {
      erros.push(`A ${periodo.numero}ª aula deve terminar depois de começar.`);
    }
    return { periodo: periodo.numero, inicio, fim };
  });

  for (let indice = 1; indice < faixas.length; indice += 1) {
    const anterior = faixas[indice - 1];
    const atual = faixas[indice];
    if (
      anterior !== undefined &&
      atual !== undefined &&
      anterior.fim !== null &&
      atual.inicio !== null &&
      atual.inicio < anterior.fim
    ) {
      erros.push(
        `A ${atual.periodo}ª aula começa antes do término da ${anterior.periodo}ª aula.`,
      );
    }
  }

  const primeiro = faixas[0];
  const ultimo = faixas[faixas.length - 1];
  if (
    abertura !== null &&
    primeiro?.inicio !== null &&
    primeiro?.inicio !== undefined &&
    primeiro.inicio < abertura
  ) {
    erros.push('A primeira aula não pode começar antes da abertura da escola.');
  }
  if (
    fechamento !== null &&
    ultimo?.fim !== null &&
    ultimo?.fim !== undefined &&
    ultimo.fim > fechamento
  ) {
    erros.push('A última aula não pode terminar depois do fechamento da escola.');
  }

  if (configuracao.intervalo) {
    const inicioIntervalo = converterParaMinutos(configuracao.intervalo.inicio);
    const fimIntervalo = converterParaMinutos(configuracao.intervalo.fim);
    if (inicioIntervalo === null || fimIntervalo === null) {
      erros.push('Horário de intervalo inválido.');
    } else if (inicioIntervalo >= fimIntervalo) {
      erros.push('O intervalo deve terminar depois de começar.');
    } else {
      const terceira = faixas.find((faixa) => faixa.periodo === 3);
      const quarta = faixas.find((faixa) => faixa.periodo === 4);
      if (terceira?.fim != null && inicioIntervalo < terceira.fim) {
        erros.push('O intervalo não pode começar antes do término da 3ª aula.');
      }
      if (quarta?.inicio != null && fimIntervalo > quarta.inicio) {
        erros.push('O intervalo não pode terminar depois do início da 4ª aula.');
      }
      const sobrepoe = faixas.some(
        (faixa) =>
          faixa.inicio !== null &&
          faixa.fim !== null &&
          inicioIntervalo < faixa.fim &&
          fimIntervalo > faixa.inicio,
      );
      if (sobrepoe) {
        erros.push('O intervalo não pode se sobrepor a uma aula.');
      }
    }
  }

  return [...new Set(erros)];
}

export function periodoDaConfiguracao(
  configuracao: ConfiguracaoHorarios,
  numero: PeriodoAula,
): { inicio: string; fim: string } | undefined {
  const periodo = configuracao.periodos.find((item) => item.numero === numero);
  return periodo ? { inicio: periodo.inicio, fim: periodo.fim } : undefined;
}
