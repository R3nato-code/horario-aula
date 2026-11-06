import type { ReactNode } from 'react';

interface Props {
  sobretitulo?: string;
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
}

export function CabecalhoPagina({ sobretitulo, titulo, descricao, acoes }: Props) {
  return (
    <header className="cabecalho-pagina">
      <div className="cabecalho-pagina__texto">
        {sobretitulo ? <p className="cabecalho-pagina__sobretitulo">{sobretitulo}</p> : null}
        <h1>{titulo}</h1>
        {descricao ? <p className="cabecalho-pagina__descricao">{descricao}</p> : null}
      </div>
      {acoes ? <div className="cabecalho-pagina__acoes">{acoes}</div> : null}
    </header>
  );
}
