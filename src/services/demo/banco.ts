import type {
  Aula,
  ConfiguracaoHorarios,
  Disciplina,
  Favorito,
  Professor,
  RegistroHistorico,
  Turma,
} from '@/types/dominio';

export const VERSAO_BANCO_DEMO = 1;

export interface BancoDemo {
  versao: number;
  professores: Professor[];
  disciplinas: Disciplina[];
  turmas: Turma[];
  aulas: Aula[];
  configuracao: ConfiguracaoHorarios;
  historico: RegistroHistorico[];
  favoritos: Favorito[];
  /** Momento em que os dados de demonstração foram gerados. */
  geradoEm: string;
}
