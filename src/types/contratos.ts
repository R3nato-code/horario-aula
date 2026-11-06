import type {
  DiaSemana,
  IntervaloHorario,
  Modalidade,
  PeriodoAula,
  PeriodoHorario,
  TipoCadastro,
  ValorJson,
} from '@/types/dominio';

/**
 * DTOs das callables documentadas em `docs/backend/contratos.md`.
 * Espelho do contrato do servidor: o cliente não envia campos fora destes tipos.
 */

export interface EntradaSalvarAula {
  turmaId: string;
  diaSemana: DiaSemana;
  periodo: PeriodoAula;
  disciplinaId: string;
  professorId: string;
}

export interface AulaResposta {
  id: string;
  turmaId: string;
  diaSemana: DiaSemana;
  periodo: PeriodoAula;
  disciplinaId: string;
  professorId: string;
  inicio: string;
  fim: string;
  criadoEm: string | null;
  atualizadoEm: string | null;
}

export interface RespostaSalvarAula {
  aula: AulaResposta;
  alterado: boolean;
}

export interface EntradaSalvarConfiguracao {
  abertura: string;
  fechamento: string;
  periodos: PeriodoHorario[];
  intervalo: IntervaloHorario | null;
}

export interface ConfiguracaoResposta {
  abertura: string;
  fechamento: string;
  periodos: PeriodoHorario[];
  intervalo: IntervaloHorario | null;
  atualizadoEm: string | null;
  atualizadoPor: string | null;
}

export interface RespostaSalvarConfiguracao {
  configuracao: ConfiguracaoResposta;
  aulasAfetadas: number;
}

export type EntradaSalvarCadastroCallable =
  | { tipo: 'professor'; id?: string | undefined; nome: string }
  | { tipo: 'disciplina'; id?: string | undefined; nome: string }
  | {
      tipo: 'turma';
      id?: string | undefined;
      nome: string;
      serie: string;
      modalidade: Modalidade;
      turno: 'manha';
    };

export interface EntradaAlterarStatusCadastro {
  tipo: TipoCadastro;
  id: string;
  status: 'ativo' | 'arquivado';
}

export interface EntradaExcluirCadastro {
  tipo: TipoCadastro;
  id: string;
}

export interface EntradaListarHistorico {
  tipo?: string | undefined;
  entidade?: string | undefined;
  entidadeId?: string | undefined;
  responsavelId?: string | undefined;
  de?: string | undefined;
  ate?: string | undefined;
  limite?: number | undefined;
  cursor?: string | undefined;
}

export interface ItemHistoricoResposta {
  id: string;
  tipo: string;
  entidade: string;
  entidadeId: string;
  entidadeNome: string;
  descricao: string;
  alteracao: { antes: ValorJson; depois: ValorJson };
  responsavelId: string;
  responsavelNome: string;
  responsavelEmail: string;
  timestamp: string | null;
  operacaoId: string | null;
  correlacao: string | null;
}

export interface RespostaListarHistorico {
  itens: ItemHistoricoResposta[];
  proximoCursor: string | null;
}
