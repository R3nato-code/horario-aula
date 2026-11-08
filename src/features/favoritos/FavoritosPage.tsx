import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { Icone } from '@/components/Icone';
import { useConsulta } from '@/app/useConsulta';
import { useServicos } from '@/app/ContextoServicos';
import { useFavoritos } from '@/app/ContextoFavoritos';
import { useTituloPagina } from '@/lib/useTituloPagina';
import { ROTULOS_MODALIDADE } from '@/lib/constantes';

export function FavoritosPage() {
  useTituloPagina('Favoritos');
  const { escola } = useServicos();
  const { favoritos, carregando: carregandoFavoritos, erro: erroFavoritos, alternar, recarregar } =
    useFavoritos();
  const { dados, carregando, erro, recarregar: recarregarCatalogo } = useConsulta(
    () => escola.listarCatalogo(),
    'favoritos',
  );

  const turmas = (dados?.turmas ?? []).filter(
    (turma) => turma.status === 'ativo' && favoritos.some((favorito) => favorito.turmaId === turma.id),
  );

  const recarregarTudo = () => {
    recarregar();
    recarregarCatalogo();
  };

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Minha área"
        titulo="Favoritos"
        descricao="Turmas favoritas deste usuário. Alterações em aulas dessas turmas geram notificações internas."
        acoes={
          <a className="botao botao--fantasma" href="#/consulta">
            <Icone nome="calendario" tamanho={15} />
            Consultar turmas
          </a>
        }
      />

      {erro || erroFavoritos ? (
        <EstadoErro texto={erro ?? erroFavoritos ?? ''} onTentar={recarregarTudo} />
      ) : null}
      {(carregando || carregandoFavoritos) && !dados ? <EstadoCarregando /> : null}

      {dados && !erro && !erroFavoritos ? (
        turmas.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma turma favorita"
            texto="Favorite uma turma na consulta de horários para acompanhar alterações e receber notificações."
            acao={
              <a className="botao botao--pequeno" href="#/consulta">
                Escolher turma
              </a>
            }
          />
        ) : (
          <div className="grade-turmas">
            {turmas.map((turma) => (
              <article className="turma-cartao" key={turma.id}>
                <div className="turma-cartao__topo">
                  <div>
                    <a
                      className="turma-cartao__nome turma-cartao__link"
                      href={`#/consulta/turma/${turma.id}`}
                      aria-label={`Ver horário da turma ${turma.nome}`}
                    >
                      {turma.nome}
                    </a>
                    <p className="turma-cartao__meta">
                      {turma.serie} · {ROTULOS_MODALIDADE[turma.modalidade]}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="favorito-botao"
                    aria-pressed
                    aria-label={`Remover ${turma.nome} dos favoritos`}
                    title="Remover dos favoritos"
                    onClick={() => void alternar(turma.id)}
                  >
                    <Icone nome="estrela" tamanho={18} preenchido />
                  </button>
                </div>
                <div className="turma-cartao__rodape">
                  <span
                    className="botao botao--fantasma botao--pequeno turma-cartao__atalho"
                    aria-hidden="true"
                  >
                    Ver horário
                    <Icone nome="seta-direita" tamanho={14} />
                  </span>
                  <span className="selo selo--ativo">Favorita</span>
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
    </>
  );
}
