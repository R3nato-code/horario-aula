import type {
  Aula,
  AulaDetalhada,
  Catalogo,
  ConfiguracaoHorarios,
  DiaSemana,
  Favorito,
  Modalidade,
  Notificacao,
  Papel,
  RegistroHistorico,
  TipoCadastro,
  TipoRegistroHistorico,
  Turma,
  Usuario,
} from '@/types/dominio';
import type { ErroDeServico } from '@/services/erros';

export type ModoDados = 'demo' | 'firebase';

export interface CredenciaisEmailSenha {
  email: string;
  senha: string;
}

export interface DadosCadastroConta {
  nome: string;
  email: string;
  senha: string;
}

export interface OpcoesPersistencia {
  /** `true` mantém a sessão entre reinícios do navegador; `false` usa a sessão da aba. */
  manterConectado: boolean;
}

export interface ServicoAutenticacao {
  readonly modo: ModoDados;
  sessaoAtual(): Promise<Usuario | null>;
  entrarComGoogle(opcoes?: OpcoesPersistencia): Promise<Usuario>;
  entrarComEmailSenha(
    credenciais: CredenciaisEmailSenha,
    opcoes?: OpcoesPersistencia,
  ): Promise<Usuario>;
  cadastrarComEmailSenha(
    dados: DadosCadastroConta,
    opcoes?: OpcoesPersistencia,
  ): Promise<Usuario>;
  recuperarSenha(email: string): Promise<void>;
  entrarDemonstracao(papel: Papel): Promise<Usuario>;
  sair(): Promise<void>;
  /**
   * Registra um ouvinte de sessão. Retorna a função de cancelamento.
   *
   * `aoErro` recebe falhas ao preparar o perfil de um usuário que continua
   * autenticado no Firebase Auth. Nesse caso o ouvinte não deve tratar a
   * sessão como encerrada: a interface oferece nova tentativa.
   */
  assinar(
    ouvinte: (usuario: Usuario | null) => void,
    aoErro?: (erro: ErroDeServico) => void,
  ): () => void;
}

export interface FiltroAulas {
  turmaId?: string;
  professorId?: string;
  diaSemana?: DiaSemana;
}

export interface EntradaAula {
  turmaId: string;
  diaSemana: DiaSemana;
  periodo: Aula['periodo'];
  disciplinaId: string;
  professorId: string;
}

export type EntradaCadastro =
  | { tipo: 'professor'; nome: string }
  | { tipo: 'disciplina'; nome: string }
  | { tipo: 'turma'; nome: string; serie: string; modalidade: Modalidade };

export type EntradaSalvarCadastro = EntradaCadastro & { id?: string };

export interface FiltroHistorico {
  tipo?: TipoRegistroHistorico;
}

export interface ServicoEscola {
  listarCatalogo(): Promise<Catalogo>;
  listarAulas(filtro?: FiltroAulas): Promise<AulaDetalhada[]>;
  salvarAula(entrada: EntradaAula, responsavel: Usuario): Promise<Aula>;
  salvarConfiguracao(
    configuracao: ConfiguracaoHorarios,
    responsavel: Usuario,
  ): Promise<ConfiguracaoHorarios>;
  salvarCadastro(
    entrada: EntradaSalvarCadastro,
    responsavel: Usuario,
  ): Promise<Catalogo>;
  alterarStatusCadastro(
    tipo: TipoCadastro,
    id: string,
    status: 'ativo' | 'arquivado',
    responsavel: Usuario,
  ): Promise<Catalogo>;
  excluirCadastro(tipo: TipoCadastro, id: string, responsavel: Usuario): Promise<Catalogo>;
  listarHistorico(filtro?: FiltroHistorico): Promise<RegistroHistorico[]>;
  listarNotificacoes(uid: string): Promise<Notificacao[]>;
  marcarNotificacaoLida(uid: string, notificacaoId: string): Promise<void>;
  marcarTodasNotificacoesLidas(uid: string): Promise<void>;
  listarFavoritos(uid: string): Promise<Favorito[]>;
  alternarFavorito(uid: string, turmaId: string): Promise<Favorito[]>;
  listarTurmas(): Promise<Turma[]>;
}

export interface Servicos {
  modo: ModoDados;
  avisoConfiguracao: string | null;
  auth: ServicoAutenticacao;
  escola: ServicoEscola;
}

export type { ErroDeServico };
