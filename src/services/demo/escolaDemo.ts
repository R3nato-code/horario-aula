import type {
  Aula,
  AulaDetalhada,
  Catalogo,
  ConfiguracaoHorarios,
  Disciplina,
  Favorito,
  Professor,
  RegistroHistorico,
  TipoCadastro,
  Turma,
  Usuario,
} from '@/types/dominio';
import { DIAS_SEMANA } from '@/lib/constantes';
import {
  aulaEmConflito,
  criarIdAula,
  gerarId,
  normalizarTexto,
  horarioDoPeriodo,
} from '@/lib/utilidades';
import { validarConfiguracao } from '@/lib/validacaoHorarios';
import { validarTrocaAulas } from '@/services/validacao';
import type {
  EntradaAula,
  EntradaSalvarCadastro,
  EntradaTrocaAulas,
  FiltroAulas,
  FiltroHistorico,
  ServicoEscola,
} from '@/services/contratos';
import { ErroDeServico } from '@/services/erros';
import type { BancoDemo } from '@/services/demo/banco';
import { carregarBancoDemo, salvarBancoDemo } from '@/services/demo/armazenamento';

function clonar<T>(valor: T): T {
  return structuredClone(valor);
}

function nomeDoDia(dia: number): string {
  return DIAS_SEMANA.find((item) => item.valor === dia)?.nome ?? `Dia ${dia}`;
}

function porNome(a: { nome: string }, b: { nome: string }): number {
  return a.nome.localeCompare(b.nome, 'pt-BR');
}

export class EscolaDemo implements ServicoEscola {
  private banco: BancoDemo;

  constructor(banco: BancoDemo = carregarBancoDemo()) {
    this.banco = banco;
  }

  private persistir(): void {
    salvarBancoDemo(this.banco);
  }

  private montarCatalogo(): Catalogo {
    return {
      professores: clonar([...this.banco.professores].sort(porNome)),
      disciplinas: clonar([...this.banco.disciplinas].sort(porNome)),
      turmas: clonar(this.banco.turmas),
      configuracao: clonar(this.banco.configuracao),
    };
  }

  private localizar<T extends { id: string; nome: string }>(
    lista: T[],
    id: string,
    rotulo: string,
  ): T {
    const item = lista.find((candidato) => candidato.id === id);
    if (!item) {
      throw new ErroDeServico('nao-encontrado', `${rotulo} não encontrado.`);
    }
    return item;
  }

  async listarCatalogo(): Promise<Catalogo> {
    return this.montarCatalogo();
  }

  async listarTurmas(): Promise<Turma[]> {
    return clonar(this.banco.turmas);
  }

  async listarAulas(filtro: FiltroAulas = {}): Promise<AulaDetalhada[]> {
    const professores = new Map(this.banco.professores.map((item) => [item.id, item]));
    const disciplinas = new Map(this.banco.disciplinas.map((item) => [item.id, item]));
    const turmas = new Map(this.banco.turmas.map((item) => [item.id, item]));

    return this.banco.aulas
      .filter((aula) => !filtro.turmaId || aula.turmaId === filtro.turmaId)
      .filter((aula) => !filtro.professorId || aula.professorId === filtro.professorId)
      .filter((aula) => !filtro.diaSemana || aula.diaSemana === filtro.diaSemana)
      .map((aula): AulaDetalhada => {
        const horario = horarioDoPeriodo(this.banco.configuracao, aula.periodo);
        return {
          ...clonar(aula),
          turmaNome: turmas.get(aula.turmaId)?.nome ?? 'Turma removida',
          disciplinaNome: disciplinas.get(aula.disciplinaId)?.nome ?? 'Disciplina removida',
          professorNome: professores.get(aula.professorId)?.nome ?? 'Professor removido',
          inicio: horario.inicio,
          fim: horario.fim,
        };
      })
      .sort(
        (a, b) =>
          a.diaSemana - b.diaSemana ||
          a.periodo - b.periodo ||
          a.turmaNome.localeCompare(b.turmaNome, 'pt-BR'),
      );
  }

  async salvarAula(entrada: EntradaAula, responsavel: Usuario): Promise<Aula> {
    const turma = this.localizar(this.banco.turmas, entrada.turmaId, 'Turma');
    if (turma.status === 'arquivado') {
      throw new ErroDeServico(
        'validacao',
        'A turma está arquivada e não pode receber alterações de horário.',
      );
    }
    const disciplina = this.localizar(
      this.banco.disciplinas,
      entrada.disciplinaId,
      'Disciplina',
    );
    const professor = this.localizar(this.banco.professores, entrada.professorId, 'Professor');
    if (disciplina.status === 'arquivado' || professor.status === 'arquivado') {
      throw new ErroDeServico(
        'validacao',
        'Disciplina e professor precisam estar ativos para receber uma aula.',
      );
    }
    if (entrada.diaSemana < 1 || entrada.diaSemana > 5) {
      throw new ErroDeServico('validacao', 'As aulas só podem ocorrer de segunda a sexta-feira.');
    }
    if (entrada.periodo < 1 || entrada.periodo > 6) {
      throw new ErroDeServico('validacao', 'O período da aula deve estar entre 1 e 6.');
    }

    const id = criarIdAula(entrada.turmaId, entrada.diaSemana, entrada.periodo);
    const existente = this.banco.aulas.find((aula) => aula.id === id);

    if (
      existente &&
      existente.disciplinaId === entrada.disciplinaId &&
      existente.professorId === entrada.professorId
    ) {
      return clonar(existente);
    }

    const conflito = aulaEmConflito(this.banco.aulas, {
      id,
      professorId: entrada.professorId,
      diaSemana: entrada.diaSemana,
      periodo: entrada.periodo,
    });
    if (conflito) {
      const turmaConflitante = this.banco.turmas.find((item) => item.id === conflito.turmaId);
      const horario = horarioDoPeriodo(this.banco.configuracao, conflito.periodo);
      throw new ErroDeServico(
        'conflito-professor',
        `O professor ${professor.nome} já está atribuído à turma ${
          turmaConflitante?.nome ?? conflito.turmaId
        } em ${nomeDoDia(conflito.diaSemana)}, ${conflito.periodo}ª aula (${horario.inicio}–${horario.fim}).`,
      );
    }

    const agora = new Date().toISOString();
    const anterior = existente ? this.descreverAula(existente) : null;

    if (existente) {
      existente.disciplinaId = entrada.disciplinaId;
      existente.professorId = entrada.professorId;
      existente.atualizadoEm = agora;
    } else {
      this.banco.aulas.push({
        id,
        turmaId: entrada.turmaId,
        diaSemana: entrada.diaSemana,
        periodo: entrada.periodo,
        disciplinaId: entrada.disciplinaId,
        professorId: entrada.professorId,
        atualizadoEm: agora,
      });
    }

    const atual = this.banco.aulas.find((aula) => aula.id === id);
    if (!atual) {
      throw new ErroDeServico('desconhecido', 'Não foi possível concluir a alteração da aula.');
    }

    const registro: RegistroHistorico = {
      id: gerarId('hist'),
      tipo: 'aula',
      entidade: 'Aula',
      entidadeId: atual.id,
      descricao: `${existente ? 'Alteração' : 'Definição'} de aula na turma ${turma.nome}`,
      alteracao: {
        antes: anterior ?? {},
        depois: this.descreverAula(atual),
      },
      responsavelId: responsavel.uid,
      responsavelNome: responsavel.nome,
      timestamp: agora,
    };
    this.banco.historico.push(registro);

    this.persistir();
    return clonar(atual);
  }

  async trocarAulas(entrada: EntradaTrocaAulas, responsavel: Usuario): Promise<void> {
    const turma = this.localizar(this.banco.turmas, entrada.turmaId, 'Turma');
    if (turma.status === 'arquivado') {
      throw new ErroDeServico(
        'validacao',
        'A turma está arquivada e não pode receber alterações de horário.',
      );
    }

    const { origem, destino } = entrada;
    if (
      origem.diaSemana < 1 ||
      origem.diaSemana > 5 ||
      destino.diaSemana < 1 ||
      destino.diaSemana > 5
    ) {
      throw new ErroDeServico('validacao', 'As aulas só podem ocorrer de segunda a sexta-feira.');
    }
    if (origem.periodo < 1 || origem.periodo > 6 || destino.periodo < 1 || destino.periodo > 6) {
      throw new ErroDeServico('validacao', 'O período da aula deve estar entre 1 e 6.');
    }

    const idOrigem = criarIdAula(turma.id, origem.diaSemana, origem.periodo);
    const idDestino = criarIdAula(turma.id, destino.diaSemana, destino.periodo);
    if (idOrigem === idDestino) {
      throw new ErroDeServico('validacao', 'Selecione uma célula diferente para receber a aula.');
    }

    const aulaOrigem = this.banco.aulas.find((aula) => aula.id === idOrigem);
    if (!aulaOrigem) {
      throw new ErroDeServico('validacao', 'A célula de origem não possui aula para mover.');
    }
    const aulaDestino = this.banco.aulas.find((aula) => aula.id === idDestino) ?? null;

    if (
      aulaDestino &&
      aulaDestino.disciplinaId === aulaOrigem.disciplinaId &&
      aulaDestino.professorId === aulaOrigem.professorId
    ) {
      return;
    }

    const candidatas: Aula[] = [
      {
        ...aulaOrigem,
        id: idDestino,
        diaSemana: destino.diaSemana,
        periodo: destino.periodo,
      },
    ];
    if (aulaDestino) {
      candidatas.push({
        ...aulaDestino,
        id: idOrigem,
        diaSemana: origem.diaSemana,
        periodo: origem.periodo,
      });
    }

    const validacao = validarTrocaAulas(this.banco.aulas, candidatas, [idOrigem, idDestino]);
    if (!validacao.valido) {
      const conflito = validacao.conflito;
      const turmaConflitante = conflito
        ? this.banco.turmas.find((item) => item.id === conflito.turmaId)
        : null;
      const horario = conflito
        ? horarioDoPeriodo(this.banco.configuracao, conflito.periodo)
        : null;
      const detalhe =
        conflito && horario
          ? `Conflito com ${turmaConflitante?.nome ?? conflito.turmaId}, ${nomeDoDia(
              conflito.diaSemana,
            )}, ${conflito.periodo}ª aula (${horario.inicio}–${horario.fim}).`
          : undefined;
      throw new ErroDeServico(
        'conflito-professor',
        validacao.motivo ?? 'Conflito de horário detectado.',
        detalhe,
      );
    }

    const agora = new Date().toISOString();
    const antesOrigem = this.descreverAula(aulaOrigem);
    const antesDestino = aulaDestino ? this.descreverAula(aulaDestino) : null;

    const conteudoOrigem = {
      disciplinaId: aulaOrigem.disciplinaId,
      professorId: aulaOrigem.professorId,
    };
    const conteudoDestino = aulaDestino
      ? { disciplinaId: aulaDestino.disciplinaId, professorId: aulaDestino.professorId }
      : null;

    let aulaMovida: Aula;
    if (aulaDestino) {
      aulaOrigem.disciplinaId = conteudoDestino?.disciplinaId ?? aulaOrigem.disciplinaId;
      aulaOrigem.professorId = conteudoDestino?.professorId ?? aulaOrigem.professorId;
      aulaOrigem.atualizadoEm = agora;

      aulaDestino.disciplinaId = conteudoOrigem.disciplinaId;
      aulaDestino.professorId = conteudoOrigem.professorId;
      aulaDestino.atualizadoEm = agora;
      aulaMovida = aulaDestino;
    } else {
      aulaMovida = {
        ...aulaOrigem,
        id: idDestino,
        diaSemana: destino.diaSemana,
        periodo: destino.periodo,
        atualizadoEm: agora,
      };
      this.banco.aulas = this.banco.aulas.filter((aula) => aula.id !== idOrigem);
      this.banco.aulas.push(aulaMovida);
    }

    if (aulaDestino) {
      this.banco.historico.push({
        id: gerarId('hist'),
        tipo: 'aula',
        entidade: 'Aula',
        entidadeId: aulaOrigem.id,
        descricao: `Troca de posição de aula na turma ${turma.nome}`,
        alteracao: {
          antes: antesOrigem,
          depois: this.descreverAula(aulaOrigem),
        },
        responsavelId: responsavel.uid,
        responsavelNome: responsavel.nome,
        timestamp: agora,
      });
      this.banco.historico.push({
        id: gerarId('hist'),
        tipo: 'aula',
        entidade: 'Aula',
        entidadeId: aulaDestino.id,
        descricao: `Troca de posição de aula na turma ${turma.nome}`,
        alteracao: {
          antes: antesDestino ?? {},
          depois: this.descreverAula(aulaDestino),
        },
        responsavelId: responsavel.uid,
        responsavelNome: responsavel.nome,
        timestamp: agora,
      });
    } else {
      this.banco.historico.push({
        id: gerarId('hist'),
        tipo: 'aula',
        entidade: 'Aula',
        entidadeId: aulaMovida.id,
        descricao: `Aula movida de posição na turma ${turma.nome}`,
        alteracao: {
          antes: antesOrigem,
          depois: this.descreverAula(aulaMovida),
        },
        responsavelId: responsavel.uid,
        responsavelNome: responsavel.nome,
        timestamp: agora,
      });
    }

    this.persistir();
  }

  async salvarConfiguracao(
    configuracao: ConfiguracaoHorarios,
    responsavel: Usuario,
  ): Promise<ConfiguracaoHorarios> {
    const erros = validarConfiguracao(configuracao);
    if (erros.length > 0) {
      throw new ErroDeServico('validacao', 'A configuração de horários está incoerente.', erros.join(' '));
    }

    const anterior = this.descreverConfiguracao(this.banco.configuracao);
    const atualizada: ConfiguracaoHorarios = {
      ...clonar(configuracao),
      atualizadoEm: new Date().toISOString(),
    };
    this.banco.configuracao = atualizada;

    this.banco.historico.push({
      id: gerarId('hist'),
      tipo: 'configuracao',
      entidade: 'Configuração de horários',
      entidadeId: 'configuracao-horarios',
      descricao: 'Alteração da configuração dos horários escolares',
      alteracao: {
        antes: anterior,
        depois: this.descreverConfiguracao(atualizada),
      },
      responsavelId: responsavel.uid,
      responsavelNome: responsavel.nome,
      timestamp: new Date().toISOString(),
    });

    this.persistir();
    return clonar(this.banco.configuracao);
  }

  async salvarCadastro(
    entrada: EntradaSalvarCadastro,
    _responsavel: Usuario,
  ): Promise<Catalogo> {
    const nome = entrada.nome.trim();
    if (nome.length < 2) {
      throw new ErroDeServico('validacao', 'O nome deve ter pelo menos 2 caracteres.');
    }
    if (nome.length > 120) {
      throw new ErroDeServico('validacao', 'O nome deve ter no máximo 120 caracteres.');
    }

    if (entrada.tipo === 'professor') {
      this.validarNomeUnico(this.banco.professores, nome, entrada.id);
      if (entrada.id) {
        const professor = this.localizar(this.banco.professores, entrada.id, 'Professor');
        professor.nome = nome;
      } else {
        this.banco.professores.push({
          id: gerarId('prof'),
          nome,
          status: 'ativo',
          criadoEm: new Date().toISOString(),
        });
      }
    } else if (entrada.tipo === 'disciplina') {
      this.validarNomeUnico(this.banco.disciplinas, nome, entrada.id);
      if (entrada.id) {
        const disciplina = this.localizar(this.banco.disciplinas, entrada.id, 'Disciplina');
        disciplina.nome = nome;
      } else {
        this.banco.disciplinas.push({
          id: gerarId('disc'),
          nome,
          status: 'ativo',
          criadoEm: new Date().toISOString(),
        });
      }
    } else {
      this.validarNomeUnico(this.banco.turmas, nome, entrada.id);
      if (!entrada.serie.trim()) {
        throw new ErroDeServico('validacao', 'Informe a série da turma.');
      }
      if (!['ensino-medio', 'tecnico'].includes(entrada.modalidade)) {
        throw new ErroDeServico('validacao', 'Selecione uma modalidade válida.');
      }
      if (entrada.id) {
        const turma = this.localizar(this.banco.turmas, entrada.id, 'Turma');
        turma.nome = nome;
        turma.serie = entrada.serie.trim();
        turma.modalidade = entrada.modalidade;
      } else {
        this.banco.turmas.push({
          id: gerarId('turma'),
          nome,
          serie: entrada.serie.trim(),
          modalidade: entrada.modalidade,
          status: 'ativo',
          criadoEm: new Date().toISOString(),
        });
      }
    }

    this.persistir();
    return this.montarCatalogo();
  }

  async alterarStatusCadastro(
    tipo: TipoCadastro,
    id: string,
    status: 'ativo' | 'arquivado',
    _responsavel: Usuario,
  ): Promise<Catalogo> {
    const lista = this.listaPorTipo(tipo);
    const item = this.localizar(lista, id, this.rotuloPorTipo(tipo));
    if (item.status === status) return this.montarCatalogo();

    if (status === 'ativo') {
      this.validarNomeUnico(lista, item.nome, item.id);
    }

    item.status = status;
    this.persistir();
    return this.montarCatalogo();
  }

  async excluirCadastro(
    tipo: TipoCadastro,
    id: string,
    _responsavel: Usuario,
  ): Promise<Catalogo> {
    const lista = this.listaPorTipo(tipo);
    const item = this.localizar(lista, id, this.rotuloPorTipo(tipo));
    const vinculos = this.banco.aulas.filter((aula) => {
      if (tipo === 'professor') return aula.professorId === id;
      if (tipo === 'disciplina') return aula.disciplinaId === id;
      return aula.turmaId === id;
    });

    if (vinculos.length > 0) {
      throw new ErroDeServico(
        'dependencias',
        `Não é possível excluir "${item.nome}": existem ${vinculos.length} aula(s) vinculada(s).`,
        'Resolva as associações de horário antes da exclusão definitiva.',
      );
    }

    const indice = lista.findIndex((candidato) => candidato.id === id);
    if (indice >= 0) lista.splice(indice, 1);

    if (tipo === 'turma') {
      this.banco.favoritos = this.banco.favoritos.filter((favorito) => favorito.turmaId !== id);
    }

    this.persistir();
    return this.montarCatalogo();
  }

  async listarHistorico(filtro: FiltroHistorico = {}): Promise<RegistroHistorico[]> {
    return clonar(
      this.banco.historico
        .filter((registro) => !filtro.tipo || registro.tipo === filtro.tipo)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    );
  }

  async listarFavoritos(uid: string): Promise<Favorito[]> {
    return clonar(this.banco.favoritos.filter((favorito) => favorito.uid === uid));
  }

  async alternarFavorito(uid: string, turmaId: string): Promise<Favorito[]> {
    this.localizar(this.banco.turmas, turmaId, 'Turma');
    const existente = this.banco.favoritos.find(
      (favorito) => favorito.uid === uid && favorito.turmaId === turmaId,
    );
    if (existente) {
      this.banco.favoritos = this.banco.favoritos.filter(
        (favorito) => !(favorito.uid === uid && favorito.turmaId === turmaId),
      );
    } else {
      this.banco.favoritos.push({ uid, turmaId, criadoEm: new Date().toISOString() });
    }
    this.persistir();
    return this.listarFavoritos(uid);
  }

  private listaPorTipo(tipo: TipoCadastro): Professor[] | Disciplina[] | Turma[] {
    if (tipo === 'professor') return this.banco.professores;
    if (tipo === 'disciplina') return this.banco.disciplinas;
    return this.banco.turmas;
  }

  private rotuloPorTipo(tipo: TipoCadastro): string {
    if (tipo === 'professor') return 'Professor';
    if (tipo === 'disciplina') return 'Disciplina';
    return 'Turma';
  }

  private validarNomeUnico(
    lista: Array<{ id: string; nome: string }>,
    nome: string,
    idExcecao?: string,
  ): void {
    const chave = normalizarTexto(nome);
    const duplicado = lista.some(
      (item) => item.id !== idExcecao && normalizarTexto(item.nome) === chave,
    );
    if (duplicado) {
      throw new ErroDeServico('validacao', `Já existe um cadastro com o nome "${nome}".`);
    }
  }

  private descreverAula(aula: Aula): Record<string, string> {
    const turma = this.banco.turmas.find((item) => item.id === aula.turmaId);
    const disciplina = this.banco.disciplinas.find((item) => item.id === aula.disciplinaId);
    const professor = this.banco.professores.find((item) => item.id === aula.professorId);
    const horario = horarioDoPeriodo(this.banco.configuracao, aula.periodo);
    return {
      Turma: turma?.nome ?? aula.turmaId,
      Dia: nomeDoDia(aula.diaSemana),
      Aula: `${aula.periodo}ª aula`,
      Horário: `${horario.inicio}–${horario.fim}`,
      Disciplina: disciplina?.nome ?? aula.disciplinaId,
      Professor: professor?.nome ?? aula.professorId,
    };
  }

  private descreverConfiguracao(configuracao: ConfiguracaoHorarios): Record<string, string> {
    const descricao: Record<string, string> = {
      Abertura: configuracao.abertura,
      Fechamento: configuracao.fechamento,
    };
    configuracao.periodos.forEach((periodo) => {
      descricao[`${periodo.numero}ª aula`] = `${periodo.inicio}–${periodo.fim}`;
    });
    if (configuracao.intervalo) {
      descricao.Intervalo = `${configuracao.intervalo.inicio}–${configuracao.intervalo.fim}`;
    }
    return descricao;
  }
}
