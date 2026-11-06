import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type {
  Aula,
  AulaDetalhada,
  Catalogo,
  ConfiguracaoHorarios,
  Disciplina,
  Favorito,
  Notificacao,
  Professor,
  RegistroHistorico,
  TipoCadastro,
  TipoRegistroHistorico,
  Turma,
  Usuario,
} from '@/types/dominio';
import type {
  ConfiguracaoResposta,
  EntradaAlterarStatusCadastro,
  EntradaExcluirCadastro,
  EntradaListarHistorico,
  EntradaSalvarAula,
  EntradaSalvarCadastroCallable,
  EntradaSalvarConfiguracao,
  ItemHistoricoResposta,
  RespostaListarHistorico,
  RespostaSalvarAula,
  RespostaSalvarConfiguracao,
} from '@/types/contratos';
import type {
  EntradaAula,
  EntradaSalvarCadastro,
  FiltroAulas,
  FiltroHistorico,
  ServicoEscola,
} from '@/services/contratos';
import { ErroDeServico, ehErroDeServico, type CodigoErroServico } from '@/services/erros';
import { obterFirestore, obterFuncoesFirebase } from '@/lib/firebase/cliente';
import {
  configuracaoDoDocumento,
  diaSemanaValido,
  intervaloDoValor,
  mapaJson,
  modalidadeCadastro,
  paraIso,
  periodoValido,
  periodosDoValor,
  statusCadastro,
  texto,
  textoNaoVazio,
} from '@/lib/firebase/conversoes';
import { criarIdAula, horarioDoPeriodo } from '@/lib/utilidades';

interface MensagemTraduzida {
  codigo: CodigoErroServico;
  mensagem: string;
}

function codigoDoErro(erro: unknown): string | null {
  if (typeof erro !== 'object' || erro === null || !('code' in erro)) return null;
  const codigo = (erro as { code?: unknown }).code;
  return typeof codigo === 'string' ? codigo : null;
}

/**
 * Mensagens de leitura direta do Firestore. O detalhe técnico não é exibido.
 */
const MENSAGENS_FIRESTORE: Record<string, MensagemTraduzida> = {
  'permission-denied': {
    codigo: 'permissao',
    mensagem:
      'Você não tem permissão para acessar estes dados. Sua sessão pode ter expirado ou as regras de acesso ainda não foram publicadas.',
  },
  unauthenticated: {
    codigo: 'permissao',
    mensagem: 'Sua sessão expirou. Entre novamente para continuar.',
  },
  unavailable: {
    codigo: 'desconhecido',
    mensagem: 'Não foi possível conectar ao banco de dados. Verifique sua conexão e tente novamente.',
  },
  'failed-precondition': {
    codigo: 'nao-configurado',
    mensagem:
      'A consulta necessária ainda não está disponível neste ambiente. Procure a administração.',
  },
  'not-found': {
    codigo: 'nao-encontrado',
    mensagem: 'O registro solicitado não foi encontrado.',
  },
  'resource-exhausted': {
    codigo: 'validacao',
    mensagem: 'O limite de dados para esta consulta foi excedido. Ajuste os filtros e tente novamente.',
  },
  'invalid-argument': {
    codigo: 'validacao',
    mensagem: 'Os dados informados não são válidos para esta consulta.',
  },
};

const MENSAGENS_CALLABLE: Record<string, MensagemTraduzida> = {
  'functions/unauthenticated': {
    codigo: 'permissao',
    mensagem: 'Sua sessão expirou. Entre novamente para continuar.',
  },
  'functions/permission-denied': {
    codigo: 'permissao',
    mensagem: 'Seu perfil não tem autorização para esta operação.',
  },
  'functions/invalid-argument': {
    codigo: 'validacao',
    mensagem: 'Os dados informados não foram aceitos pelo servidor.',
  },
  'functions/already-exists': {
    codigo: 'validacao',
    mensagem: 'Já existe um registro com estes dados.',
  },
  'functions/failed-precondition': {
    codigo: 'validacao',
    mensagem: 'A operação não pode ser concluída no estado atual dos dados.',
  },
  'functions/aborted': {
    codigo: 'desconhecido',
    mensagem: 'A operação foi interrompida por outra alteração simultânea. Tente novamente.',
  },
  'functions/resource-exhausted': {
    codigo: 'validacao',
    mensagem: 'O limite da operação foi excedido. Reduza a seleção e tente novamente.',
  },
  'functions/deadline-exceeded': {
    codigo: 'desconhecido',
    mensagem: 'A operação demorou mais que o esperado. Tente novamente.',
  },
  'functions/cancelled': {
    codigo: 'desconhecido',
    mensagem: 'A operação foi cancelada. Tente novamente.',
  },
  'functions/not-found': {
    codigo: 'nao-encontrado',
    mensagem: 'O registro solicitado não foi encontrado no servidor.',
  },
};

const CALLABLES_INDISPONIVEIS = new Set([
  'functions/unimplemented',
  'functions/internal',
  'functions/unavailable',
]);

function traduzirErroFirestore(erro: unknown): ErroDeServico {
  if (ehErroDeServico(erro)) return erro;

  const codigo = codigoDoErro(erro);
  const mapeado = codigo ? MENSAGENS_FIRESTORE[codigo] : undefined;
  if (mapeado) return new ErroDeServico(mapeado.codigo, mapeado.mensagem);

  return new ErroDeServico(
    'desconhecido',
    'Não foi possível concluir a operação. Tente novamente.',
  );
}

function traduzirErroCallable(erro: unknown): ErroDeServico {
  if (ehErroDeServico(erro)) return erro;

  const codigo = codigoDoErro(erro);
  if (!codigo || !codigo.startsWith('functions/')) {
    return traduzirErroFirestore(erro);
  }

  if (CALLABLES_INDISPONIVEIS.has(codigo)) {
    return new ErroDeServico(
      'nao-configurado',
      'Esta operação ainda não está disponível neste ambiente.',
    );
  }

  const mapeado = MENSAGENS_CALLABLE[codigo];
  if (!mapeado) {
    return new ErroDeServico(
      'desconhecido',
      'Não foi possível concluir a operação no servidor. Tente novamente.',
    );
  }

  // Para erros de validação/conflito, a mensagem do HttpsError é escrita para
  // o usuário final pelo backend. Códigos internos permanecem ocultos.
  const mensagemServidor =
    codigo === 'functions/invalid-argument' ||
    codigo === 'functions/already-exists' ||
    codigo === 'functions/failed-precondition' ||
    codigo === 'functions/resource-exhausted'
      ? textoNaoVazio(erro instanceof Error ? erro.message : null)
      : '';

  return new ErroDeServico(mapeado.codigo, mensagemServidor || mapeado.mensagem);
}

function porNome(a: { nome: string }, b: { nome: string }): number {
  return a.nome.localeCompare(b.nome, 'pt-BR');
}

function mapearProfessor(documento: QueryDocumentSnapshot<DocumentData>): Professor {
  const dados = documento.data();
  return {
    id: documento.id,
    nome: textoNaoVazio(dados.nome, 'Professor sem nome'),
    status: statusCadastro(dados.status),
    criadoEm: paraIso(dados.criadoEm) || paraIso(dados.atualizadoEm),
  };
}

function mapearDisciplina(documento: QueryDocumentSnapshot<DocumentData>): Disciplina {
  const dados = documento.data();
  return {
    id: documento.id,
    nome: textoNaoVazio(dados.nome, 'Disciplina sem nome'),
    status: statusCadastro(dados.status),
    criadoEm: paraIso(dados.criadoEm) || paraIso(dados.atualizadoEm),
  };
}

function mapearTurma(documento: QueryDocumentSnapshot<DocumentData>): Turma {
  const dados = documento.data();
  return {
    id: documento.id,
    nome: textoNaoVazio(dados.nome, 'Turma sem nome'),
    serie: textoNaoVazio(dados.serie),
    modalidade: modalidadeCadastro(dados.modalidade),
    status: statusCadastro(dados.status),
    criadoEm: paraIso(dados.criadoEm) || paraIso(dados.atualizadoEm),
  };
}

function mapearAula(
  documento: QueryDocumentSnapshot<DocumentData>,
  configuracao: ConfiguracaoHorarios,
  professores: Map<string, string>,
  disciplinas: Map<string, string>,
  turmas: Map<string, string>,
): AulaDetalhada | null {
  const dados = documento.data();
  const diaSemana = diaSemanaValido(dados.diaSemana);
  const periodo = periodoValido(dados.periodo);
  if (diaSemana === null || periodo === null) return null;

  const turmaId = texto(dados.turmaId);
  const disciplinaId = texto(dados.disciplinaId);
  const professorId = texto(dados.professorId);
  const horario = horarioDoPeriodo(configuracao, periodo);

  return {
    id: documento.id,
    turmaId,
    diaSemana,
    periodo,
    disciplinaId,
    professorId,
    atualizadoEm: paraIso(dados.atualizadoEm) || paraIso(dados.criadoEm),
    turmaNome: turmas.get(turmaId) ?? 'Turma removida',
    disciplinaNome: disciplinas.get(disciplinaId) ?? 'Disciplina removida',
    professorNome: professores.get(professorId) ?? 'Professor removido',
    inicio: horario.inicio,
    fim: horario.fim,
  };
}

function normalizarAulaResposta(resposta: RespostaSalvarAula, entrada: EntradaAula): Aula {
  const aula = resposta?.aula;
  if (!aula) {
    throw new ErroDeServico(
      'desconhecido',
      'O servidor não confirmou a alteração da aula. Tente novamente.',
    );
  }

  return {
    id: textoNaoVazio(aula.id, criarIdAula(entrada.turmaId, entrada.diaSemana, entrada.periodo)),
    turmaId: textoNaoVazio(aula.turmaId, entrada.turmaId),
    diaSemana: diaSemanaValido(aula.diaSemana) ?? entrada.diaSemana,
    periodo: periodoValido(aula.periodo) ?? entrada.periodo,
    disciplinaId: textoNaoVazio(aula.disciplinaId, entrada.disciplinaId),
    professorId: textoNaoVazio(aula.professorId, entrada.professorId),
    atualizadoEm: paraIso(aula.atualizadoEm) || new Date().toISOString(),
  };
}

function normalizarConfiguracaoResposta(
  resposta: ConfiguracaoResposta | undefined,
  fallback: ConfiguracaoHorarios,
): ConfiguracaoHorarios {
  const periodos = periodosDoValor(resposta?.periodos);
  return {
    abertura: textoNaoVazio(resposta?.abertura, fallback.abertura),
    fechamento: textoNaoVazio(resposta?.fechamento, fallback.fechamento),
    periodos: periodos.length > 0 ? periodos : fallback.periodos,
    intervalo: resposta ? intervaloDoValor(resposta.intervalo) : fallback.intervalo,
    atualizadoEm: paraIso(resposta?.atualizadoEm) || new Date().toISOString(),
  };
}

function tipoHistorico(valor: unknown): TipoRegistroHistorico {
  return valor === 'aula' ||
    valor === 'configuracao' ||
    valor === 'cadastro' ||
    valor === 'permissao' ||
    valor === 'sistema'
    ? valor
    : 'sistema';
}

function mapearHistorico(item: ItemHistoricoResposta): RegistroHistorico {
  return {
    id: texto(item.id),
    tipo: tipoHistorico(item.tipo),
    entidade: texto(item.entidade),
    entidadeId: texto(item.entidadeId),
    descricao: texto(item.descricao),
    alteracao: {
      antes: mapaJson(item.alteracao?.antes),
      depois: mapaJson(item.alteracao?.depois),
    },
    responsavelId: texto(item.responsavelId),
    responsavelNome: textoNaoVazio(item.responsavelNome, 'Sistema'),
    timestamp: paraIso(item.timestamp),
  };
}

function mapearNotificacao(
  documento: QueryDocumentSnapshot<DocumentData>,
): Notificacao {
  const dados = documento.data();
  const turmaIds = Array.isArray(dados.turmaIds)
    ? dados.turmaIds.filter((item): item is string => typeof item === 'string')
    : [];
  const totalAulas =
    dados.agrupamento && typeof dados.agrupamento === 'object'
      ? (dados.agrupamento as { totalAulas?: unknown }).totalAulas
      : undefined;

  return {
    id: documento.id,
    uid: texto(dados.uid),
    turmaId: turmaIds[0] ?? texto(dados.turmaId),
    titulo: textoNaoVazio(dados.titulo, 'Notificação'),
    mensagem: texto(dados.mensagem),
    lida: dados.lida === true,
    criadoEm: paraIso(dados.criadoEm),
    ...(typeof totalAulas === 'number'
      ? { agrupamento: { totalAulas } }
      : {}),
  };
}

function mapearFavorito(documento: QueryDocumentSnapshot<DocumentData>): Favorito {
  const dados = documento.data();
  return {
    uid: texto(dados.uid),
    turmaId: texto(dados.turmaId),
    criadoEm: paraIso(dados.criadoEm),
  };
}

function ordenarPorCriadoEmDesc<T extends { criadoEm: string }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

/**
 * Implementação do ServicoEscola sobre o Firestore e as callables aprovadas.
 *
 * Leituras de catálogo, aulas, configuração, próprias notificações e próprios
 * favoritos são diretas (PAD-16). Operações administrativas nunca escrevem no
 * cliente: passam por Cloud Functions e falham de forma explícita quando a
 * função não está publicada.
 */
export class EscolaFirebase implements ServicoEscola {
  private readonly db: Firestore;

  constructor(db: Firestore = obterFirestore()) {
    this.db = db;
  }

  async listarTurmas(): Promise<Turma[]> {
    try {
      const resultado = await getDocs(query(collection(this.db, 'turmas'), limit(500)));
      return resultado.docs.map(mapearTurma).sort(porNome);
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }

  async listarCatalogo(): Promise<Catalogo> {
    try {
      const [professores, disciplinas, turmas, configuracao] = await Promise.all([
        getDocs(query(collection(this.db, 'professores'), limit(500))),
        getDocs(query(collection(this.db, 'disciplinas'), limit(500))),
        getDocs(query(collection(this.db, 'turmas'), limit(500))),
        getDoc(doc(this.db, 'configuracao', 'atual')),
      ]);

      return {
        professores: professores.docs.map(mapearProfessor).sort(porNome),
        disciplinas: disciplinas.docs.map(mapearDisciplina).sort(porNome),
        turmas: turmas.docs.map(mapearTurma).sort(porNome),
        configuracao: configuracaoDoDocumento(
          configuracao.exists() ? configuracao.data() : undefined,
        ),
      };
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }

  async listarAulas(filtro: FiltroAulas = {}): Promise<AulaDetalhada[]> {
    try {
      let consulta: Query<DocumentData> = collection(this.db, 'aulas');

      // Um único filtro de igualdade no servidor evita índices compostos
      // adicionais; os demais filtros são aplicados no cliente.
      if (filtro.turmaId) {
        consulta = query(consulta, where('turmaId', '==', filtro.turmaId));
      } else if (filtro.professorId) {
        consulta = query(consulta, where('professorId', '==', filtro.professorId));
      } else if (filtro.diaSemana) {
        consulta = query(consulta, where('diaSemana', '==', filtro.diaSemana));
      }
      consulta = query(consulta, limit(500));

      const [resultado, catalogo] = await Promise.all([
        getDocs(consulta),
        this.listarCatalogo(),
      ]);

      const professores = new Map(
        catalogo.professores.map((item) => [item.id, item.nome] as const),
      );
      const disciplinas = new Map(
        catalogo.disciplinas.map((item) => [item.id, item.nome] as const),
      );
      const turmas = new Map(catalogo.turmas.map((item) => [item.id, item.nome] as const));

      return resultado.docs
        .map((documento) =>
          mapearAula(documento, catalogo.configuracao, professores, disciplinas, turmas),
        )
        .filter((aula): aula is AulaDetalhada => aula !== null)
        .filter((aula) => !filtro.turmaId || aula.turmaId === filtro.turmaId)
        .filter((aula) => !filtro.professorId || aula.professorId === filtro.professorId)
        .filter((aula) => !filtro.diaSemana || aula.diaSemana === filtro.diaSemana)
        .sort(
          (a, b) =>
            a.diaSemana - b.diaSemana ||
            a.periodo - b.periodo ||
            a.turmaNome.localeCompare(b.turmaNome, 'pt-BR'),
        );
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }

  async salvarAula(entrada: EntradaAula, _responsavel: Usuario): Promise<Aula> {
    const resposta = await this.chamar<EntradaSalvarAula, RespostaSalvarAula>(
      'salvarAula',
      entrada,
    );
    return normalizarAulaResposta(resposta, entrada);
  }

  async salvarConfiguracao(
    configuracao: ConfiguracaoHorarios,
    _responsavel: Usuario,
  ): Promise<ConfiguracaoHorarios> {
    const entrada: EntradaSalvarConfiguracao = {
      abertura: configuracao.abertura,
      fechamento: configuracao.fechamento,
      periodos: configuracao.periodos.map((periodo) => ({ ...periodo })),
      intervalo: configuracao.intervalo ? { ...configuracao.intervalo } : null,
    };

    const resposta = await this.chamar<EntradaSalvarConfiguracao, RespostaSalvarConfiguracao>(
      'salvarConfiguracao',
      entrada,
    );

    return normalizarConfiguracaoResposta(resposta?.configuracao, configuracao);
  }

  async salvarCadastro(
    entrada: EntradaSalvarCadastro,
    _responsavel: Usuario,
  ): Promise<Catalogo> {
    const payload: EntradaSalvarCadastroCallable =
      entrada.tipo === 'turma'
        ? {
            tipo: 'turma',
            nome: entrada.nome,
            serie: entrada.serie,
            modalidade: entrada.modalidade,
            turno: 'manha',
            ...(entrada.id ? { id: entrada.id } : {}),
          }
        : {
            tipo: entrada.tipo,
            nome: entrada.nome,
            ...(entrada.id ? { id: entrada.id } : {}),
          };

    await this.chamar<EntradaSalvarCadastroCallable, unknown>('salvarCadastro', payload);
    return this.listarCatalogo();
  }

  async alterarStatusCadastro(
    tipo: TipoCadastro,
    id: string,
    status: 'ativo' | 'arquivado',
    _responsavel: Usuario,
  ): Promise<Catalogo> {
    const entrada: EntradaAlterarStatusCadastro = { tipo, id, status };
    await this.chamar<EntradaAlterarStatusCadastro, unknown>(
      'alterarStatusCadastro',
      entrada,
    );
    return this.listarCatalogo();
  }

  async excluirCadastro(
    tipo: TipoCadastro,
    id: string,
    _responsavel: Usuario,
  ): Promise<Catalogo> {
    const entrada: EntradaExcluirCadastro = { tipo, id };
    await this.chamar<EntradaExcluirCadastro, unknown>('excluirCadastro', entrada);
    return this.listarCatalogo();
  }

  async listarHistorico(filtro: FiltroHistorico = {}): Promise<RegistroHistorico[]> {
    const entrada: EntradaListarHistorico = filtro.tipo ? { tipo: filtro.tipo } : {};

    try {
      const resposta = await this.chamar<EntradaListarHistorico, RespostaListarHistorico>(
        'listarHistorico',
        entrada,
      );

      return (resposta?.itens ?? [])
        .map(mapearHistorico)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (erro) {
      // Sem a callable publicada, o painel continua funcional com histórico
      // vazio. Erros de permissão e validação nunca são mascarados.
      if (
        ehErroDeServico(erro) &&
        (erro.codigo === 'nao-configurado' || erro.codigo === 'nao-encontrado')
      ) {
        return [];
      }
      throw erro;
    }
  }

  async listarNotificacoes(uid: string): Promise<Notificacao[]> {
    if (!uid) return [];

    try {
      // A regra exige o filtro por uid. A ordenação é feita no cliente para
      // não depender do índice IDX-07 durante a implantação.
      const resultado = await getDocs(
        query(collection(this.db, 'notificacoes'), where('uid', '==', uid), limit(100)),
      );
      return ordenarPorCriadoEmDesc(resultado.docs.map(mapearNotificacao));
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }

  async marcarNotificacaoLida(uid: string, notificacaoId: string): Promise<void> {
    if (!uid) {
      throw new ErroDeServico('permissao', 'Sua sessão expirou. Entre novamente.');
    }

    try {
      await updateDoc(doc(this.db, 'notificacoes', notificacaoId), {
        lida: true,
        lidaEm: serverTimestamp(),
      });
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }

  async marcarTodasNotificacoesLidas(uid: string): Promise<void> {
    if (!uid) {
      throw new ErroDeServico('permissao', 'Sua sessão expirou. Entre novamente.');
    }

    try {
      const resultado = await getDocs(
        query(collection(this.db, 'notificacoes'), where('uid', '==', uid), limit(500)),
      );
      const pendentes = resultado.docs.filter((documento) => documento.data().lida !== true);

      for (let inicio = 0; inicio < pendentes.length; inicio += 400) {
        const lote = writeBatch(this.db);
        pendentes.slice(inicio, inicio + 400).forEach((documento) => {
          lote.update(documento.ref, {
            lida: true,
            lidaEm: serverTimestamp(),
          });
        });
        await lote.commit();
      }
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }

  async listarFavoritos(uid: string): Promise<Favorito[]> {
    if (!uid) return [];

    try {
      const resultado = await getDocs(
        query(collection(this.db, 'favoritos'), where('uid', '==', uid), limit(200)),
      );
      return ordenarPorCriadoEmDesc(resultado.docs.map(mapearFavorito));
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }

  async alternarFavorito(uid: string, turmaId: string): Promise<Favorito[]> {
    if (!uid) {
      throw new ErroDeServico('permissao', 'Sua sessão expirou. Entre novamente.');
    }

    try {
      const referencia = doc(this.db, 'favoritos', `${uid}_${turmaId}`);

      await runTransaction(this.db, async (transacao) => {
        const atual = await transacao.get(referencia);
        if (atual.exists()) {
          transacao.delete(referencia);
          return;
        }

        const turma = await transacao.get(doc(this.db, 'turmas', turmaId));
        if (!turma.exists()) {
          throw new ErroDeServico('nao-encontrado', 'Turma não encontrada.');
        }

        transacao.set(referencia, {
          uid,
          turmaId,
          criadoEm: serverTimestamp(),
        });
      });

      return this.listarFavoritos(uid);
    } catch (erro) {
      if (ehErroDeServico(erro)) throw erro;
      throw traduzirErroFirestore(erro);
    }
  }

  private async chamar<TEntrada, TSaida>(
    nome: string,
    entrada: TEntrada,
  ): Promise<TSaida> {
    try {
      const funcao = httpsCallable<TEntrada, TSaida>(obterFuncoesFirebase(), nome);
      const resposta = await funcao(entrada);
      return resposta.data;
    } catch (erro) {
      throw traduzirErroCallable(erro);
    }
  }
}
