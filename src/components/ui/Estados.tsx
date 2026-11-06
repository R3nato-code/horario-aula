import type { ReactNode } from 'react';
import { Icone } from '@/components/Icone';

interface EstadoVazioProps {
  titulo: string;
  texto: string;
  acao?: ReactNode;
}

export function EstadoVazio({ titulo, texto, acao }: EstadoVazioProps) {
  return (
    <div className="estado">
      <Icone nome="info" tamanho={26} className="estado__icone" />
      <p className="estado__titulo">{titulo}</p>
      <p className="estado__texto">{texto}</p>
      {acao}
    </div>
  );
}

interface EstadoErroProps {
  texto: string;
  onTentar?: () => void;
}

export function EstadoErro({ texto, onTentar }: EstadoErroProps) {
  return (
    <div className="estado estado--erro" role="alert">
      <Icone nome="alerta" tamanho={24} className="estado__icone" />
      <p className="estado__titulo">Não foi possível carregar</p>
      <p className="estado__texto">{texto}</p>
      {onTentar ? (
        <button type="button" className="botao botao--pequeno" onClick={onTentar}>
          <Icone nome="atualizar" tamanho={15} />
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}

export function EstadoCarregando({ texto = 'Carregando dados…' }: { texto?: string }) {
  return (
    <div className="estado" role="status" aria-live="polite">
      <span className="carregando">
        <span className="carregando__marca" aria-hidden="true" />
        {texto}
      </span>
    </div>
  );
}
