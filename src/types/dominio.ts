/** Contratos de domínio do front-end.
 *
 * Observação: campos como identidade de aula, sala e estrutura de notificações
 * dependem de lacunas ainda abertas (LAC-02, LAC-08, LAC-13, LAC-23).
 * Este arquivo reflete apenas o que já está documentado na arquitetura.
 */

export type Papel = 'gestor' | 'admin' | 'professor' | 'aluno';

export type StatusCadastro = 'ativo' | 'arquivado';

export type Modalidade = 'ensino-medio' | 'tecnico';

export type DiaSemana = 1 | 2 | 3 | 4 | 5;

export type PeriodoAula = 1 | 2 | 3 | 4 | 5 | 6;

export interface Usuario {
  uid: string;
  email: string;
  nome: string;
  papel: Papel;
  fotoUrl?: string;
}

export interface Professor {
  id: string;
  nome: string;
  status: StatusCadastro;
  criadoEm: string;
}

export interface Disciplina {
  id: string;
  nome: string;
  status: StatusCadastro;
  criadoEm: string;
}

export interface Turma {
  id: string;
  nome: string;
  serie: string;
  modalidade: Modalidade;
  status: StatusCadastro;
  criadoEm: string;
}

/**
 * Aula de um slot semanal.
 * A identidade composta segue a proposta de LAC-02 e é usada apenas no ambiente
 * de demonstração; a chave definitiva depende de decisão do arquiteto.
 */
export interface Aula {
  id: string;
  turmaId: string;
  diaSemana: DiaSemana;
  periodo: PeriodoAula;
  disciplinaId: string;
  professorId: string;
  atualizadoEm: string;
}

export interface PeriodoHorario {
  numero: PeriodoAula;
  inicio: string;
  fim: string;
}

export interface IntervaloHorario {
  inicio: string;
  fim: string;
}

export interface ConfiguracaoHorarios {
  abertura: string;
  fechamento: string;
  periodos: PeriodoHorario[];
  intervalo: IntervaloHorario | null;
  atualizadoEm: string;
}

export type TipoCadastro = 'professor' | 'disciplina' | 'turma';

/** Registro de catálogo, independentemente do tipo, para listagens administrativas. */
export type Cadastro = Professor | Disciplina | Turma;

export type TipoRegistroHistorico =
  | 'aula'
  | 'configuracao'
  | 'cadastro'
  | 'permissao'
  | 'sistema';

/** Valor JSON aceito em `historico.alteracao` (antes/depois). */
export type ValorJson =
  | string
  | number
  | boolean
  | null
  | ValorJson[]
  | { [chave: string]: ValorJson };

export interface AlteracaoHistorico {
  antes: Record<string, ValorJson>;
  depois: Record<string, ValorJson>;
}

export interface RegistroHistorico {
  id: string;
  tipo: TipoRegistroHistorico;
  entidade: string;
  entidadeId: string;
  descricao: string;
  alteracao: AlteracaoHistorico;
  responsavelId: string;
  responsavelNome: string;
  timestamp: string;
}

export interface Notificacao {
  id: string;
  uid: string;
  turmaId: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criadoEm: string;
  agrupamento?: {
    totalAulas: number;
  };
}

export interface Favorito {
  uid: string;
  turmaId: string;
  criadoEm: string;
}

export interface Catalogo {
  professores: Professor[];
  disciplinas: Disciplina[];
  turmas: Turma[];
  configuracao: ConfiguracaoHorarios;
}

export interface AulaDetalhada extends Aula {
  turmaNome: string;
  disciplinaNome: string;
  professorNome: string;
  inicio: string;
  fim: string;
}

export interface AulaComTurma extends AulaDetalhada {
  diaNome: string;
  turmaModalidade: Modalidade;
}
