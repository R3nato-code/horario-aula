import type { ReactNode } from 'react';
import { Icone } from '@/components/Icone';

type TipoAlerta = 'info' | 'aviso' | 'erro' | 'sucesso';

interface Props {
  tipo?: TipoAlerta;
  titulo?: string;
  children: ReactNode;
}

export function Alerta({ tipo = 'info', titulo, children }: Props) {
  const icone = tipo === 'erro' ? 'alerta' : tipo === 'sucesso' ? 'check' : tipo === 'aviso' ? 'alerta' : 'info';
  return (
    <div className={`alerta alerta--${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      <Icone nome={icone} tamanho={17} className="alerta__icone" />
      <div className="alerta__conteudo">
        {titulo ? <strong className="alerta__titulo">{titulo}</strong> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
