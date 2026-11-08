import { useMemo, useState } from 'react';
import type {
  RegistroHistorico,
  TipoRegistroHistorico,
  ValorJson,
} from '@/types/dominio';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { Icone } from '@/components/Icone';
import { useConsulta } from '@/app/useConsulta';
import { useServicos } from '@/app/ContextoServicos';
import { useTituloPagina } from '@/lib/useTituloPagina';
import { formatarDataHora } from '@/lib/utilidades';

type Filtro = 'todos' | TipoRegistroHistorico;

const FILTROS: ReadonlyArray<{ valor: Filtro; rotulo: string }> = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'aula', rotulo: 'Aulas' },
  { valor: 'configuracao', rotulo: 'Configuração' },
  { valor: 'cadastro', rotulo: 'Cadastros' },
  { valor: 'permissao', rotulo: 'Permissões' },
  { valor: 'sistema', rotulo: 'Sistema' },
];

const ROTULOS_TIPO: Record<TipoRegistroHistorico, string> = {
  aula: 'Aula',
  configuracao: 'Configuração',
  cadastro: 'Cadastro',
  permissao: 'Permissão',
  sistema: 'Sistema',
};

function formatarValor(valor: ValorJson): string {
  if (valor === null) return '—';
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  return JSON.stringify(valor);
}

function ListaValores({ valores }: { valores: Record<string, ValorJson> }) {
  const entradas = Object.entries(valores);
  if (entradas.length === 0) {
    return <p className="texto-pequeno texto-secundario">Não havia valor anterior registrado.</p>;
  }
  return (
    <dl style={{ margin: 0 }}>
      {entradas.map(([chave, valor]) => (
        <div className="rotulo-valor" key={chave}>
          <dt>{chave}</dt>
          <dd>{formatarValor(valor)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Registro({ registro }: { registro: RegistroHistorico }) {
  return (
    <details className="registro-historico">
      <summary className="registro-historico__resumo">
        <span className="registro-historico__identificacao">
          <span className={`selo selo--${registro.tipo === 'aula' ? 'info' : 'aviso'}`}>
            {ROTULOS_TIPO[registro.tipo]}
          </span>
          <span>
            <span className="registro-historico__acao">{registro.descricao}</span>
            <span className="registro-historico__meta" style={{ display: 'block' }}>
              {registro.responsavelNome} · {formatarDataHora(registro.timestamp)}
            </span>
          </span>
        </span>
        <Icone nome="seta-direita" tamanho={16} />
      </summary>
      <div className="registro-historico__conteudo">
        <dl className="rotulo-valor" style={{ marginBottom: '16px' }}>
          <dt>Entidade</dt>
          <dd>{registro.entidade}</dd>
          <dt>Identificador</dt>
          <dd className="mono">{registro.entidadeId}</dd>
          <dt>Responsável</dt>
          <dd>{registro.responsavelNome}</dd>
        </dl>
        <div className="comparacao-historico">
          <div className="comparacao-historico__coluna comparacao-historico__antes">
            <p className="comparacao-historico__titulo">Antes</p>
            <ListaValores valores={registro.alteracao.antes} />
          </div>
          <div className="comparacao-historico__coluna comparacao-historico__depois">
            <p className="comparacao-historico__titulo">Depois</p>
            <ListaValores valores={registro.alteracao.depois} />
          </div>
        </div>
      </div>
    </details>
  );
}

export function HistoricoPage() {
  useTituloPagina('Histórico de alterações');
  const { escola } = useServicos();
  const { dados, carregando, erro, recarregar } = useConsulta(
    () => escola.listarHistorico(),
    'historico',
  );
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const registros = useMemo(
    () => (dados ?? []).filter((registro) => filtro === 'todos' || registro.tipo === filtro),
    [dados, filtro],
  );

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Administração"
        titulo="Histórico de alterações"
        descricao="Registros de alterações em aulas e configurações. O histórico é somente leitura e preserva os valores anteriores e posteriores."
      />

      {erro ? <EstadoErro texto={erro} onTentar={recarregar} /> : null}
      {carregando && !dados ? <EstadoCarregando /> : null}

      {dados && !erro ? (
        <div className="pilha-secoes">
          <div className="abas" role="tablist" aria-label="Filtrar histórico por tipo">
            {FILTROS.map((item) => (
              <button
                key={item.valor}
                type="button"
                role="tab"
                className="aba"
                aria-selected={filtro === item.valor}
                onClick={() => setFiltro(item.valor)}
              >
                {item.rotulo}
                {item.valor === 'todos'
                  ? ` (${dados.length})`
                  : ` (${dados.filter((registro) => registro.tipo === item.valor).length})`}
              </button>
            ))}
          </div>

          {registros.length === 0 ? (
            <EstadoVazio
              titulo="Nenhum registro no histórico"
              texto={
                filtro === 'todos'
                  ? 'As alterações de aulas e configurações gerarão registros automáticos.'
                  : 'Não há registros deste tipo. Altere uma aula ou a configuração para gerar histórico.'
              }
            />
          ) : (
            <div>
              {registros.map((registro) => (
                <Registro key={registro.id} registro={registro} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
