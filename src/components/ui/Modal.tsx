import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icone } from '@/components/Icone';

interface Props {
  aberto: boolean;
  titulo: string;
  subtitulo?: string | undefined;
  onFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: number;
}

export function Modal({ aberto, titulo, subtitulo, onFechar, children, rodape, largura }: Props) {
  const referencia = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) {
      dialogo.showModal();
    } else if (!aberto && dialogo.open) {
      dialogo.close();
    }
  }, [aberto]);

  return (
    <dialog
      ref={referencia}
      className="modal"
      aria-labelledby={idTitulo}
      onCancel={(evento) => {
        evento.preventDefault();
        onFechar();
      }}
      onClose={() => {
        if (aberto) onFechar();
      }}
      style={largura ? { width: `min(${largura}px, calc(100vw - 32px))` } : undefined}
    >
      <div className="modal__cabecalho">
        <div>
          <h2 className="modal__titulo" id={idTitulo}>
            {titulo}
          </h2>
          {subtitulo ? <p className="modal__subtitulo">{subtitulo}</p> : null}
        </div>
        <button
          type="button"
          className="botao botao--icone"
          onClick={onFechar}
          aria-label="Fechar janela"
        >
          <Icone nome="fechar" />
        </button>
      </div>
      <div className="modal__corpo">{children}</div>
      {rodape ? <div className="modal__rodape">{rodape}</div> : null}
    </dialog>
  );
}
