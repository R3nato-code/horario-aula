import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
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
  EntradaAula,
  EntradaSalvarCadastro,
  EntradaTrocaAulas,
  FiltroAulas,
  FiltroHistorico,
  ServicoEscola,
} from '@/services/contratos';
import { ErroDeServico, ehErroDeServico, type CodigoErroServico } from '@/services/erros';
import { obterFirestore } from '@/lib/firebase/cliente';
import {
  configuracaoDoDocumento,
  diaSemanaValido,
  mapaJson,
  modalidadeCadastro,
  paraIso,
  periodoValido,
  statusCadastro,
  texto,
  textoNaoVazio,
} from '@/lib/firebase/conversoes';
import { criarIdAula, horarioDoPeriodo } from '@/lib/utilidades';
import { validarConflitoHorario, validarTrocaAulas } from '@/services/validacao';

interface MensagemTraduzida {
  codigo: CodigoErroServico;
  mensagem: string;
}

function codigoDoErro(erro: unknown): string | null {
  if (typeof erro !== 'object' || erro === null || !('code' in erro)) return null;
  const codigo = (erro as { code?: unknown }).code;
  return typeof codigo === 'string' ? codigo : null;
}

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

/** Converte dados brutos de um documento de `aulas` para o modelo de domínio. */
function aulaDoDocumento(id: string, dados: DocumentData | undefined): Aula {
  const valores = dados ?? {};
  return {
    id,
    turmaId: texto(valores.turmaId),
    diaSemana: diaSemanaValido(valores.diaSemana) ?? 1,
    periodo: periodoValido(valores.periodo) ?? 1,
    disciplinaId: texto(valores.disciplinaId),
    professorId: texto(valores.professorId),
    atualizadoEm: paraIso(valores.atualizadoEm) || paraIso(valores.criadoEm),
  };
}

/**
 * Converte um registro de domínio para um documento salvo na coleção `historico`.
 * O `id` é gerado pelo Firestore (`doc(collection)`) e preenchido após a escrita.
 */
function montarRegistroHistorico(
  tipo: TipoRegistroHistorico,
  entidade: string,
  entidadeId: string,
  descricao: string,
  alteracao: { antes: Record<string, unknown>; depois: Record<string, unknown> },
  responsavel: Usuario,
): Omit<RegistroHistorico, 'id' | 'timestamp'> {
  return {
    tipo,
    entidade,
    entidadeId,
    entidadeNome: textoNaoVazio(entidadeId),
    descricao,
    alteracao: {
      antes: mapaJson(alteracao.antes),
      depois: mapaJson(alteracao.depois),
    },
    responsavelId: responsavel.uid,
    responsavelNome: responsavel.nome,
    responsavelEmail: responsavel.email,
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

function mapearHistorico(documento: QueryDocumentSnapshot<DocumentData>): RegistroHistorico {
  const dados = documento.data();
  return {
    id: documento.id,
    tipo: tipoHistorico(dados.tipo),
    entidade: texto(dados.entidade),
    entidadeId: texto(dados.entidadeId),
    entidadeNome: textoNaoVazio(dados.entidadeNome),
    descricao: texto(dados.descricao),
    alteracao: {
      antes: mapaJson(dados.alteracao?.antes),
      depois: mapaJson(dados.alteracao?.depois),
    },
    responsavelId: texto(dados.responsavelId),
    responsavelNome: textoNaoVazio(dados.responsavelNome, 'Sistema'),
    responsavelEmail: textoNaoVazio(dados.responsavelEmail),
    timestamp: paraIso(dados.timestamp),
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

/** Nome da coleção de domínio para cada tipo de cadastro. */
function colecaoCadastro(tipo: TipoCadastro): string {
  switch (tipo) {
    case 'professor':
      return 'professores';
    case 'disciplina':
      return 'disciplinas';
    case 'turma':
      return 'turmas';
  }
}

/** Nome da entidade usada no histórico para cada coleção. */
function entidadeHistorico(tipo: TipoCadastro): string {
  switch (tipo) {
    case 'professor':
      return 'professores';
    case 'disciplina':
      return 'disciplinas';
    case 'turma':
      return 'turmas';
  }
}

/**
 * Implementação do ServicoEscola sobre o Firestore direto (arquitetura client-only).
 *
 * Leituras de catálogo, aulas, configuração, próprias notificações e próprios
 * favoritos são diretas. Escritas de domínio são feitas com `setDoc`/`updateDoc`/
 * `deleteDoc` dentro de `writeBatch` ou `runTransaction`, incluindo o registro de
 * histórico na mesma operação atômica (conforme guia de refatoração client-side).
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

  async salvarAula(entrada: EntradaAula, responsavel: Usuario): Promise<Aula> {
    const idAula = criarIdAula(entrada.turmaId, entrada.diaSemana, entrada.periodo);

    try {
      return await runTransaction(this.db, async (transacao) => {
        // 1. Carregar aulas existentes para validação de conflito.
        const aulasTurma = await getDocs(
          query(collection(this.db, 'aulas'), where('turmaId', '==', entrada.turmaId), limit(500)),
        );
        const aulasProfessor = await getDocs(
          query(
            collection(this.db, 'aulas'),
            where('professorId', '==', entrada.professorId),
            limit(500),
          ),
        );

        const aulasExistentes: Aula[] = [
          ...aulasTurma.docs.map((documento) =>
            aulaDoDocumento(documento.id, documento.data()),
          ),
          ...aulasProfessor.docs.map((documento) =>
            aulaDoDocumento(documento.id, documento.data()),
          ),
        ];

        // 2. Validar conflito antes de gravar.
        const validacao = validarConflitoHorario(
          aulasExistentes,
          {
            id: idAula,
            turmaId: entrada.turmaId,
            professorId: entrada.professorId,
            diaSemana: entrada.diaSemana,
            periodo: entrada.periodo,
          },
          idAula,
        );

        if (!validacao.valido) {
          throw new ErroDeServico(
            'conflito-professor',
            validacao.motivo ?? 'Conflito de horário detectado.',
            `Conflito com aula ${validacao.conflito?.id}`,
          );
        }

        // 3. Capturar snapshot anterior (se existir) para o histórico.
        const refAula = doc(this.db, 'aulas', idAula);
        const anterior = await transacao.get(refAula);
        const antes = anterior.exists()
          ? {
              turmaId: texto(anterior.data().turmaId),
              diaSemana: anterior.data().diaSemana,
              periodo: anterior.data().periodo,
              disciplinaId: texto(anterior.data().disciplinaId),
              professorId: texto(anterior.data().professorId),
            }
          : {};

        const depois = {
          turmaId: entrada.turmaId,
          diaSemana: entrada.diaSemana,
          periodo: entrada.periodo,
          disciplinaId: entrada.disciplinaId,
          professorId: entrada.professorId,
        };

        // 4. Gravar aula.
        transacao.set(refAula, {
          turmaId: entrada.turmaId,
          diaSemana: entrada.diaSemana,
          periodo: entrada.periodo,
          disciplinaId: entrada.disciplinaId,
          professorId: entrada.professorId,
          criadoEm: anterior.exists() ? anterior.data().criadoEm : serverTimestamp(),
          atualizadoEm: serverTimestamp(),
        });

        // 5. Gravar histórico na mesma transação.
        const refHistorico = doc(collection(this.db, 'historico'));
        transacao.set(refHistorico, montarRegistroHistorico(
          'aula',
          'aulas',
          idAula,
          anterior.exists()
            ? `Aula da turma "${entrada.turmaId}" atualizada (${entrada.diaSemana}/${entrada.periodo}).`
            : `Aula da turma "${entrada.turmaId}" criada (${entrada.diaSemana}/${entrada.periodo}).`,
          { antes, depois },
          responsavel,
        ));

        return {
          id: idAula,
          turmaId: entrada.turmaId,
          diaSemana: entrada.diaSemana,
          periodo: entrada.periodo,
          disciplinaId: entrada.disciplinaId,
          professorId: entrada.professorId,
          atualizadoEm: new Date().toISOString(),
        };
      });
    } catch (erro) {
      if (ehErroDeServico(erro)) throw erro;
      throw traduzirErroFirestore(erro);
    }
  }

  async trocarAulas(entrada: EntradaTrocaAulas, responsavel: Usuario): Promise<void> {
    const idOrigem = criarIdAula(
      entrada.turmaId,
      entrada.origem.diaSemana,
      entrada.origem.periodo,
    );
    const idDestino = criarIdAula(
      entrada.turmaId,
      entrada.destino.diaSemana,
      entrada.destino.periodo,
    );

    if (idOrigem === idDestino) {
      throw new ErroDeServico('validacao', 'Selecione uma célula diferente para receber a aula.');
    }

    try {
      await runTransaction(this.db, async (transacao) => {
        const refOrigem = doc(this.db, 'aulas', idOrigem);
        const refDestino = doc(this.db, 'aulas', idDestino);

        const snapOrigem = await transacao.get(refOrigem);
        if (!snapOrigem.exists()) {
          throw new ErroDeServico('validacao', 'A célula de origem não possui aula para mover.');
        }
        const snapDestino = await transacao.get(refDestino);

        const aulaOrigem = aulaDoDocumento(idOrigem, snapOrigem.data());
        const aulaDestino = snapDestino.exists()
          ? aulaDoDocumento(idDestino, snapDestino.data())
          : null;

        if (
          aulaDestino &&
          aulaDestino.disciplinaId === aulaOrigem.disciplinaId &&
          aulaDestino.professorId === aulaOrigem.professorId
        ) {
          return;
        }

        const snapTurma = await transacao.get(doc(this.db, 'turmas', entrada.turmaId));
        if (!snapTurma.exists()) {
          throw new ErroDeServico('nao-encontrado', 'Turma não encontrada.');
        }
        if (texto(snapTurma.data()?.status) === 'arquivado') {
          throw new ErroDeServico(
            'validacao',
            'A turma está arquivada e não pode receber alterações de horário.',
          );
        }

        // A consulta de conflitos usa `getDocs` (o SDK do cliente não aceita
        // `Query` em `Transaction.get`), seguindo o mesmo padrão de
        // `salvarAula`. A gravação dos dois slots permanece atômica.
        const professores = new Set([aulaOrigem.professorId]);
        if (aulaDestino) professores.add(aulaDestino.professorId);

        const aulasExistentes = new Map<string, Aula>();
        const incluir = (documentos: QueryDocumentSnapshot<DocumentData>[]) => {
          documentos.forEach((documento) => {
            aulasExistentes.set(
              documento.id,
              aulaDoDocumento(documento.id, documento.data()),
            );
          });
        };

        const aulasTurma = await getDocs(
          query(
            collection(this.db, 'aulas'),
            where('turmaId', '==', entrada.turmaId),
            limit(500),
          ),
        );
        incluir(aulasTurma.docs);

        for (const professorId of professores) {
          const aulasProfessor = await getDocs(
            query(
              collection(this.db, 'aulas'),
              where('professorId', '==', professorId),
              limit(500),
            ),
          );
          incluir(aulasProfessor.docs);
        }

        const candidatas: Aula[] = [
          {
            ...aulaOrigem,
            id: idDestino,
            diaSemana: entrada.destino.diaSemana,
            periodo: entrada.destino.periodo,
          },
        ];
        if (aulaDestino) {
          candidatas.push({
            ...aulaDestino,
            id: idOrigem,
            diaSemana: entrada.origem.diaSemana,
            periodo: entrada.origem.periodo,
          });
        }

        const validacao = validarTrocaAulas(
          [...aulasExistentes.values()],
          candidatas,
          [idOrigem, idDestino],
        );
        if (!validacao.valido) {
          const conflito = validacao.conflito;
          throw new ErroDeServico(
            'conflito-professor',
            validacao.motivo ?? 'Conflito de horário detectado.',
            conflito
              ? `Conflito com aula ${conflito.id} (${conflito.diaSemana}/${conflito.periodo}).`
              : undefined,
          );
        }

        const antesOrigem = {
          turmaId: aulaOrigem.turmaId,
          diaSemana: aulaOrigem.diaSemana,
          periodo: aulaOrigem.periodo,
          disciplinaId: aulaOrigem.disciplinaId,
          professorId: aulaOrigem.professorId,
        };
        const antesDestino = aulaDestino
          ? {
              turmaId: aulaDestino.turmaId,
              diaSemana: aulaDestino.diaSemana,
              periodo: aulaDestino.periodo,
              disciplinaId: aulaDestino.disciplinaId,
              professorId: aulaDestino.professorId,
            }
          : null;

        if (aulaDestino) {
          transacao.set(refOrigem, {
            turmaId: entrada.turmaId,
            diaSemana: entrada.origem.diaSemana,
            periodo: entrada.origem.periodo,
            disciplinaId: aulaDestino.disciplinaId,
            professorId: aulaDestino.professorId,
            criadoEm: snapOrigem.data()?.criadoEm ?? serverTimestamp(),
            atualizadoEm: serverTimestamp(),
          });
          transacao.set(refDestino, {
            turmaId: entrada.turmaId,
            diaSemana: entrada.destino.diaSemana,
            periodo: entrada.destino.periodo,
            disciplinaId: aulaOrigem.disciplinaId,
            professorId: aulaOrigem.professorId,
            criadoEm: snapDestino.data()?.criadoEm ?? serverTimestamp(),
            atualizadoEm: serverTimestamp(),
          });

          const refHistoricoOrigem = doc(collection(this.db, 'historico'));
          transacao.set(
            refHistoricoOrigem,
            montarRegistroHistorico(
              'aula',
              'aulas',
              idOrigem,
              `Troca de posição de aula na turma "${entrada.turmaId}" (${entrada.origem.diaSemana}/${entrada.origem.periodo} ↔ ${entrada.destino.diaSemana}/${entrada.destino.periodo}).`,
              {
                antes: antesOrigem,
                depois: {
                  turmaId: entrada.turmaId,
                  diaSemana: entrada.origem.diaSemana,
                  periodo: entrada.origem.periodo,
                  disciplinaId: aulaDestino.disciplinaId,
                  professorId: aulaDestino.professorId,
                },
              },
              responsavel,
            ),
          );

          const refHistoricoDestino = doc(collection(this.db, 'historico'));
          transacao.set(
            refHistoricoDestino,
            montarRegistroHistorico(
              'aula',
              'aulas',
              idDestino,
              `Troca de posição de aula na turma "${entrada.turmaId}" (${entrada.destino.diaSemana}/${entrada.destino.periodo} ↔ ${entrada.origem.diaSemana}/${entrada.origem.periodo}).`,
              {
                antes: antesDestino ?? {},
                depois: {
                  turmaId: entrada.turmaId,
                  diaSemana: entrada.destino.diaSemana,
                  periodo: entrada.destino.periodo,
                  disciplinaId: aulaOrigem.disciplinaId,
                  professorId: aulaOrigem.professorId,
                },
              },
              responsavel,
            ),
          );
        } else {
          transacao.set(refDestino, {
            turmaId: entrada.turmaId,
            diaSemana: entrada.destino.diaSemana,
            periodo: entrada.destino.periodo,
            disciplinaId: aulaOrigem.disciplinaId,
            professorId: aulaOrigem.professorId,
            criadoEm: serverTimestamp(),
            atualizadoEm: serverTimestamp(),
          });
          transacao.delete(refOrigem);

          const refHistorico = doc(collection(this.db, 'historico'));
          transacao.set(
            refHistorico,
            montarRegistroHistorico(
              'aula',
              'aulas',
              idDestino,
              `Aula da turma "${entrada.turmaId}" movida de ${entrada.origem.diaSemana}/${entrada.origem.periodo} para ${entrada.destino.diaSemana}/${entrada.destino.periodo}.`,
              {
                antes: antesOrigem,
                depois: {
                  turmaId: entrada.turmaId,
                  diaSemana: entrada.destino.diaSemana,
                  periodo: entrada.destino.periodo,
                  disciplinaId: aulaOrigem.disciplinaId,
                  professorId: aulaOrigem.professorId,
                },
              },
              responsavel,
            ),
          );
        }
      });
    } catch (erro) {
      if (ehErroDeServico(erro)) throw erro;
      throw traduzirErroFirestore(erro);
    }
  }

  async salvarConfiguracao(
    configuracao: ConfiguracaoHorarios,
    responsavel: Usuario,
  ): Promise<ConfiguracaoHorarios> {
    const refConfig = doc(this.db, 'configuracao', 'atual');

    try {
      const anterior = await getDoc(refConfig);
      const antes = anterior.exists()
        ? {
            abertura: anterior.data().abertura,
            fechamento: anterior.data().fechamento,
            periodos: anterior.data().periodos,
            intervalo: anterior.data().intervalo,
          }
        : {};

      const depois = {
        abertura: configuracao.abertura,
        fechamento: configuracao.fechamento,
        periodos: configuracao.periodos.map((p) => ({ ...p })),
        intervalo: configuracao.intervalo ? { ...configuracao.intervalo } : null,
      };

      const batch = writeBatch(this.db);

      batch.set(refConfig, {
        abertura: configuracao.abertura,
        fechamento: configuracao.fechamento,
        periodos: configuracao.periodos.map((p) => ({ ...p })),
        intervalo: configuracao.intervalo ? { ...configuracao.intervalo } : null,
        criadoEm: anterior.exists() ? anterior.data().criadoEm : serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        atualizadoPor: responsavel.uid,
      });

      const refHistorico = doc(collection(this.db, 'historico'));
      batch.set(refHistorico, montarRegistroHistorico(
        'configuracao',
        'configuracao',
        'atual',
        `Configuração de horários atualizada por ${responsavel.nome}.`,
        { antes, depois },
        responsavel,
      ));

      await batch.commit();

      return {
        ...configuracao,
        atualizadoEm: new Date().toISOString(),
      };
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }

  async salvarCadastro(
    entrada: EntradaSalvarCadastro,
    responsavel: Usuario,
  ): Promise<Catalogo> {
    const colecao = colecaoCadastro(entrada.tipo);
    const id = entrada.id ?? `novo-${Date.now()}`;
    const ref = doc(this.db, colecao, id);

    try {
      const anterior = await getDoc(ref);
      const antes = anterior.exists()
        ? {
            nome: anterior.data().nome,
            status: anterior.data().status,
            ...(entrada.tipo === 'turma'
              ? { serie: anterior.data().serie, modalidade: anterior.data().modalidade }
              : {}),
          }
        : {};

      const depois: Record<string, unknown> = {
        nome: entrada.nome,
        status: 'ativo',
        ...(entrada.tipo === 'turma'
          ? { serie: entrada.serie, modalidade: entrada.modalidade, turno: 'manha' }
          : {}),
      };

      const batch = writeBatch(this.db);

      batch.set(ref, {
        nome: entrada.nome,
        status: 'ativo',
        ...(entrada.tipo === 'turma'
          ? { serie: entrada.serie, modalidade: entrada.modalidade, turno: 'manha' }
          : {}),
        criadoEm: anterior.exists() ? anterior.data().criadoEm : serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });

      const refHistorico = doc(collection(this.db, 'historico'));
      batch.set(refHistorico, montarRegistroHistorico(
        'cadastro',
        entidadeHistorico(entrada.tipo),
        id,
        anterior.exists()
          ? `${entrada.tipo} "${entrada.nome}" atualizado.`
          : `${entrada.tipo} "${entrada.nome}" criado.`,
        { antes, depois },
        responsavel,
      ));

      await batch.commit();

      return this.listarCatalogo();
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }

  async alterarStatusCadastro(
    tipo: TipoCadastro,
    id: string,
    status: 'ativo' | 'arquivado',
    responsavel: Usuario,
  ): Promise<Catalogo> {
    const colecao = colecaoCadastro(tipo);
    const ref = doc(this.db, colecao, id);

    try {
      const anterior = await getDoc(ref);
      if (!anterior.exists()) {
        throw new ErroDeServico('nao-encontrado', `${tipo} não encontrado.`);
      }

      const antes = { status: anterior.data().status };
      const depois = { status };

      const batch = writeBatch(this.db);

      batch.update(ref, {
        status,
        atualizadoEm: serverTimestamp(),
      });

      const refHistorico = doc(collection(this.db, 'historico'));
      batch.set(refHistorico, montarRegistroHistorico(
        'cadastro',
        entidadeHistorico(tipo),
        id,
        `${tipo} "${textoNaoVazio(anterior.data().nome)}" status alterado para "${status}".`,
        { antes, depois },
        responsavel,
      ));

      await batch.commit();

      return this.listarCatalogo();
    } catch (erro) {
      if (ehErroDeServico(erro)) throw erro;
      throw traduzirErroFirestore(erro);
    }
  }

  async excluirCadastro(
    tipo: TipoCadastro,
    id: string,
    responsavel: Usuario,
  ): Promise<Catalogo> {
    const colecao = colecaoCadastro(tipo);
    const ref = doc(this.db, colecao, id);

    try {
      const anterior = await getDoc(ref);
      if (!anterior.exists()) {
        throw new ErroDeServico('nao-encontrado', `${tipo} não encontrado.`);
      }

      const snapshot = {
        nome: textoNaoVazio(anterior.data().nome),
        status: anterior.data().status,
        ...(tipo === 'turma'
          ? { serie: anterior.data().serie, modalidade: anterior.data().modalidade }
          : {}),
      };

      const batch = writeBatch(this.db);

      batch.delete(ref);

      const refHistorico = doc(collection(this.db, 'historico'));
      batch.set(refHistorico, montarRegistroHistorico(
        'cadastro',
        entidadeHistorico(tipo),
        id,
        `${tipo} "${snapshot.nome}" excluído definitivamente.`,
        { antes: snapshot, depois: {} },
        responsavel,
      ));

      await batch.commit();

      return this.listarCatalogo();
    } catch (erro) {
      if (ehErroDeServico(erro)) throw erro;
      throw traduzirErroFirestore(erro);
    }
  }

  async listarHistorico(filtro: FiltroHistorico = {}): Promise<RegistroHistorico[]> {
    try {
      let consulta: Query<DocumentData> = collection(this.db, 'historico');

      if (filtro.tipo) {
        consulta = query(consulta, where('tipo', '==', filtro.tipo));
      }

      consulta = query(consulta, limit(100));

      const resultado = await getDocs(consulta);
      return resultado.docs.map(mapearHistorico).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }

  async listarNotificacoes(uid: string): Promise<Notificacao[]> {
    if (!uid) return [];

    try {
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
}
