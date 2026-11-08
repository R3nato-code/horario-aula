import type { Aula, DiaSemana, PeriodoAula } from '@/types/dominio';

/**
 * Resultado da validação de conflito de horário.
 *
 * Quando `conflito` está preenchido, a escrita deve ser bloqueada e a
 * entidade envolvida exibida ao usuário.
 */
export interface ResultadoValidacaoConflito {
  valido: boolean;
  conflito: Aula | null;
  motivo: string | null;
}

/**
 * Valida se a aula candidata conflita com aulas já existentes.
 *
 * Regras de negócio (aplicadas no front-end, antes de qualquer escrita):
 * 1. Uma turma não pode ter duas aulas no mesmo dia e período.
 * 2. Um professor não pode lecionar duas aulas no mesmo dia e período.
 *
 * A lista de `aulasExistentes` deve conter todos os slots relevantes da
 * turma e do professor (carregados do Firestore pelo serviço de domínio).
 * O `idAtual` é o ID do slot sendo editado (ou `null` para criação) para
 * excluir o próprio documento da validação.
 */
export function validarConflitoHorario(
  aulasExistentes: Aula[],
  candidata: Pick<Aula, 'id' | 'turmaId' | 'professorId' | 'diaSemana' | 'periodo'>,
  idAtual: string | null,
): ResultadoValidacaoConflito {
  const idCandidato = idAtual ?? criarIdAula(candidata);

  // Conflito de turma: mesma turma, mesmo dia, mesmo período.
  const conflitoTurma = aulasExistentes.find(
    (aula) =>
      aula.id !== idCandidato &&
      aula.turmaId === candidata.turmaId &&
      aula.diaSemana === candidata.diaSemana &&
      aula.periodo === candidata.periodo,
  );

  if (conflitoTurma) {
    return {
      valido: false,
      conflito: conflitoTurma,
      motivo:
        'Já existe uma aula desta turma neste dia e período.',
    };
  }

  // Conflito de professor: mesmo professor, mesmo dia, mesmo período.
  const conflitoProfessor = aulasExistentes.find(
    (aula) =>
      aula.id !== idCandidato &&
      aula.professorId === candidata.professorId &&
      aula.diaSemana === candidata.diaSemana &&
      aula.periodo === candidata.periodo,
  );

  if (conflitoProfessor) {
    return {
      valido: false,
      conflito: conflitoProfessor,
      motivo:
        'O professor já tem uma aula nesta turma neste dia e período.',
    };
  }

  return { valido: true, conflito: null, motivo: null };
}

/**
 * Candidata de uma troca: os dois slots movidos simultaneamente.
 *
 * Os IDs informados em `idsIgnorados` são removidos da lista de aulas
 * existentes antes da validação, pois serão sobrescritos na mesma operação.
 */
export type AulaCandidataTroca = Pick<
  Aula,
  'id' | 'turmaId' | 'diaSemana' | 'periodo' | 'disciplinaId' | 'professorId'
>;

/**
 * Valida os dois lados de uma troca de aulas.
 *
 * A validação considera apenas as aulas que não serão sobrescritas. Assim,
 * trocar duas aulas da mesma turma não gera conflito entre elas, mas ainda
 * impede que um professor fique com duas turmas no mesmo dia e período.
 */
export function validarTrocaAulas(
  aulasExistentes: Aula[],
  candidatas: AulaCandidataTroca[],
  idsIgnorados: string[],
): ResultadoValidacaoConflito {
  const ignorados = new Set(idsIgnorados);
  const outras = aulasExistentes.filter((aula) => !ignorados.has(aula.id));

  for (const candidata of candidatas) {
    const conflitoTurma = outras.find(
      (aula) =>
        aula.turmaId === candidata.turmaId &&
        aula.diaSemana === candidata.diaSemana &&
        aula.periodo === candidata.periodo,
    );
    if (conflitoTurma) {
      return {
        valido: false,
        conflito: conflitoTurma,
        motivo: 'Já existe uma aula desta turma neste dia e período.',
      };
    }

    const conflitoProfessor = outras.find(
      (aula) =>
        aula.professorId === candidata.professorId &&
        aula.diaSemana === candidata.diaSemana &&
        aula.periodo === candidata.periodo,
    );
    if (conflitoProfessor) {
      return {
        valido: false,
        conflito: conflitoProfessor,
        motivo: 'O professor já tem uma aula nesta turma neste dia e período.',
      };
    }
  }

  return { valido: true, conflito: null, motivo: null };
}

function criarIdAula(
  aula: Pick<Aula, 'turmaId' | 'diaSemana' | 'periodo'>,
): string {
  return `${aula.turmaId}_${aula.diaSemana}_${aula.periodo}`;
}

/**
 * Valida se o ID do período existe na configuração de horários.
 */
export function validarPeriodoConfigurado(
  periodo: PeriodoAula,
  periodos: { numero: PeriodoAula }[],
): boolean {
  return periodos.some((item) => item.numero === periodo);
}

/**
 * Valida se o dia da semana está no intervalo permitido (1 a 5).
 */
export function validarDiaSemana(diaSemana: DiaSemana): boolean {
  return diaSemana >= 1 && diaSemana <= 5;
}
