import type { DiaSemana, IntervaloHorario, Modalidade, Papel, PeriodoAula, StatusCadastro } from '@/types/dominio';

export const NOME_INSTITUICAO = 'Colégio Estadual Presidente Kennedy';
export const NOME_SISTEMA = 'Horários Escolares';

export const DIAS_SEMANA: ReadonlyArray<{
  valor: DiaSemana;
  nome: string;
  abreviado: string;
}> = [
  { valor: 1, nome: 'Segunda-feira', abreviado: 'Seg' },
  { valor: 2, nome: 'Terça-feira', abreviado: 'Ter' },
  { valor: 3, nome: 'Quarta-feira', abreviado: 'Qua' },
  { valor: 4, nome: 'Quinta-feira', abreviado: 'Qui' },
  { valor: 5, nome: 'Sexta-feira', abreviado: 'Sex' },
];

export const NUMEROS_PERIODOS: readonly PeriodoAula[] = [1, 2, 3, 4, 5, 6];

export const ROTULOS_PAPEL: Record<Papel, string> = {
  gestor: 'Gestor principal',
  admin: 'Administrador',
  professor: 'Professor',
  aluno: 'Aluno',
};

export const ROTULOS_STATUS: Record<StatusCadastro, string> = {
  ativo: 'Ativo',
  arquivado: 'Arquivado',
};

export const ROTULOS_MODALIDADE: Record<Modalidade, string> = {
  'ensino-medio': 'Ensino Médio',
  tecnico: 'Ensino Técnico',
};

/** Horários oficiais documentados na seção 3.3 do plano de requisitos. */
export const HORARIOS_PADRAO = {
  abertura: '07:20',
  fechamento: '12:30',
  periodos: [
    { numero: 1 as PeriodoAula, inicio: '07:20', fim: '08:10' },
    { numero: 2 as PeriodoAula, inicio: '08:10', fim: '09:00' },
    { numero: 3 as PeriodoAula, inicio: '09:00', fim: '09:45' },
    { numero: 4 as PeriodoAula, inicio: '10:10', fim: '10:55' },
    { numero: 5 as PeriodoAula, inicio: '10:55', fim: '11:45' },
    { numero: 6 as PeriodoAula, inicio: '11:45', fim: '12:30' },
  ],
  intervalo: { inicio: '09:45', fim: '10:10' } satisfies IntervaloHorario,
} as const;

export const PAPEIS_ADMINISTRATIVOS: readonly Papel[] = ['admin', 'gestor'];

export function podeAdministrar(papel: Papel | undefined): boolean {
  return papel === 'admin' || papel === 'gestor';
}

export function ehGestor(papel: Papel | undefined): boolean {
  return papel === 'gestor';
}

/** Somente o gestor gerencia perfis de usuário (`users/{uid}.role`). */
export function podeGerenciarUsuarios(papel: Papel | undefined): boolean {
  return ehGestor(papel);
}

/** Somente o gestor altera a duração/horários das aulas (configuração). */
export function podeEditarDuracaoAulas(papel: Papel | undefined): boolean {
  return ehGestor(papel);
}
