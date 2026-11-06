import type { ReactNode } from 'react';

interface Props {
  id: string;
  rotulo: string;
  children: ReactNode;
  ajuda?: string;
  erro?: string;
  obrigatorio?: boolean;
  className?: string;
}

export function Campo({ id, rotulo, children, ajuda, erro, obrigatorio, className }: Props) {
  return (
    <div className={className ? `campo ${className}` : 'campo'}>
      <label className="campo__rotulo" htmlFor={id}>
        {rotulo}
        {obrigatorio ? (
          <span className="campo__obrigatorio" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {children}
      {erro ? (
        <span className="campo__erro" id={`${id}-erro`} role="alert">
          {erro}
        </span>
      ) : ajuda ? (
        <span className="campo__ajuda" id={`${id}-ajuda`}>
          {ajuda}
        </span>
      ) : null}
    </div>
  );
}
