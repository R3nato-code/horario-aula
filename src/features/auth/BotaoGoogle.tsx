import { IconeGoogle } from './IconeGoogle';

interface Props {
  rotulo: string;
  carregando: boolean;
  desabilitado: boolean;
  onClick: () => void;
}

export function BotaoGoogle({ rotulo, carregando, desabilitado, onClick }: Props) {
  return (
    <button
      type="button"
      className="botao botao--bloco login__google"
      onClick={onClick}
      disabled={desabilitado}
      aria-busy={carregando}
    >
      {carregando ? (
        <span className="carregando__marca" aria-hidden="true" />
      ) : (
        <IconeGoogle />
      )}
      {carregando ? 'Conectando…' : rotulo}
    </button>
  );
}
