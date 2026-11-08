import type {
  Aula,
  Disciplina,
  Modalidade,
  Professor,
  Turma,
} from '@/types/dominio';
import { configuracaoInicial, criarIdAula, normalizarTexto } from '@/lib/utilidades';
import type { BancoDemo } from '@/services/demo/banco';
import { VERSAO_BANCO_DEMO } from '@/services/demo/banco';
import {
  DIAS_DEMONSTRACAO,
  FAVORITOS_INICIAIS,
  TURMAS_INICIAIS,
} from '@/services/demo/dadosIniciais';

const MODALIDADES_VALIDAS: readonly Modalidade[] = ['ensino-medio', 'tecnico'];

function interpretarDia(dia: string): Array<{ disciplina: string; professor: string }> {
  return dia
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separador = item.lastIndexOf('|');
      if (separador <= 0) {
        throw new Error(`Entrada de horário inválida nos dados iniciais: "${item}"`);
      }
      return {
        disciplina: item.slice(0, separador).trim(),
        professor: item.slice(separador + 1).trim(),
      };
    });
}

export function criarBancoDemonstracao(): BancoDemo {
  const agora = new Date().toISOString();
  const professores = new Map<string, Professor>();
  const disciplinas = new Map<string, Disciplina>();
  const turmas: Turma[] = [];
  const aulas: Aula[] = [];

  for (const definicao of TURMAS_INICIAIS) {
    if (!MODALIDADES_VALIDAS.includes(definicao.modalidade)) {
      throw new Error(`Modalidade inválida para a turma ${definicao.nome}.`);
    }

    turmas.push({
      id: definicao.id,
      nome: definicao.nome,
      serie: definicao.serie,
      modalidade: definicao.modalidade,
      status: 'ativo',
      criadoEm: agora,
    });

    definicao.dias.forEach((dia, indiceDia) => {
      const diaSemana = DIAS_DEMONSTRACAO[indiceDia];
      if (diaSemana === undefined) {
        throw new Error(`Dia inválido nos dados iniciais da turma ${definicao.nome}.`);
      }
      const entradas = interpretarDia(dia);
      if (entradas.length !== 6) {
        throw new Error(
          `A turma ${definicao.nome} possui ${entradas.length} aulas no dia ${diaSemana}; esperado: 6.`,
        );
      }

      entradas.forEach((entrada, indiceAula) => {
        const periodo = (indiceAula + 1) as Aula['periodo'];
        const chaveDisciplina = normalizarTexto(entrada.disciplina);
        const chaveProfessor = normalizarTexto(entrada.professor);

        let disciplina = disciplinas.get(chaveDisciplina);
        if (!disciplina) {
          disciplina = {
            id: `disc-${String(disciplinas.size + 1).padStart(3, '0')}`,
            nome: entrada.disciplina,
            status: 'ativo',
            criadoEm: agora,
          };
          disciplinas.set(chaveDisciplina, disciplina);
        }

        let professor = professores.get(chaveProfessor);
        if (!professor) {
          professor = {
            id: `prof-${String(professores.size + 1).padStart(3, '0')}`,
            nome: entrada.professor,
            status: 'ativo',
            criadoEm: agora,
          };
          professores.set(chaveProfessor, professor);
        }

        aulas.push({
          id: criarIdAula(definicao.id, diaSemana, periodo),
          turmaId: definicao.id,
          diaSemana,
          periodo,
          disciplinaId: disciplina.id,
          professorId: professor.id,
          atualizadoEm: agora,
        });
      });
    });
  }

  const favoritos = FAVORITOS_INICIAIS.map((favorito) => ({
    uid: favorito.uid,
    turmaId: favorito.turmaId,
    criadoEm: agora,
  }));

  return {
    versao: VERSAO_BANCO_DEMO,
    professores: [...professores.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    disciplinas: [...disciplinas.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    turmas,
    aulas,
    configuracao: configuracaoInicial(),
    historico: [],
    favoritos,
    geradoEm: agora,
  };
}
