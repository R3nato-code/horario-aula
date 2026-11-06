import type { Aula, ConfiguracaoHorarios, PeriodoAula } from '@/types/dominio';
import { HORARIOS_PADRAO } from '@/lib/constantes';

export function criarIdAula(turmaId: string, diaSemana: number, periodo: number): string {
  return `${turmaId}_${diaSemana}_${periodo}`;
}

export function gerarId(prefixo: string): string {
  const aleatorio = Math.random().toString(36).slice(2, 8);
  return `${prefixo}-${Date.now().toString(36)}-${aleatorio}`;
}

export function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function configuracaoInicial(): ConfiguracaoHorarios {
  return {
    abertura: HORARIOS_PADRAO.abertura,
    fechamento: HORARIOS_PADRAO.fechamento,
    periodos: HORARIOS_PADRAO.periodos.map((periodo) => ({ ...periodo })),
    intervalo: { ...HORARIOS_PADRAO.intervalo },
    atualizadoEm: new Date().toISOString(),
  };
}

export function horarioDoPeriodo(
  configuracao: ConfiguracaoHorarios,
  periodo: PeriodoAula,
): { inicio: string; fim: string } {
  const encontrado = configuracao.periodos.find((item) => item.numero === periodo);
  return encontrado ? { inicio: encontrado.inicio, fim: encontrado.fim } : { inicio: '--:--', fim: '--:--' };
}

export function aulaEmConflito(
  aulas: Aula[],
  candidata: Pick<Aula, 'id' | 'professorId' | 'diaSemana' | 'periodo'>,
): Aula | undefined {
  return aulas.find(
    (aula) =>
      aula.id !== candidata.id &&
      aula.professorId === candidata.professorId &&
      aula.diaSemana === candidata.diaSemana &&
      aula.periodo === candidata.periodo,
  );
}

export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data);
}

export function formatarData(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(data);
}

export function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
  return `${primeira}${ultima}`.toUpperCase();
}
