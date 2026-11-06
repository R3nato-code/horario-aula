import type { Papel, StatusCadastro } from '@/types/dominio';
import { ROTULOS_PAPEL, ROTULOS_STATUS } from '@/lib/constantes';

export function SeloPapel({ papel }: { papel: Papel }) {
  return <span className={`selo selo--${papel}`}>{ROTULOS_PAPEL[papel]}</span>;
}

export function SeloStatus({ status }: { status: StatusCadastro }) {
  return <span className={`selo selo--${status}`}>{ROTULOS_STATUS[status]}</span>;
}
