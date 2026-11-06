import { useMemo, useState } from 'react';
import type { Cadastro, TipoCadastro } from '@/types/dominio';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { Alerta } from '@/components/ui/Alerta';
import { Modal } from '@/components/ui/Modal';
import { SeloStatus } from '@/components/ui/Selos';
import { Icone } from '@/components/Icone';
import { useConsulta } from '@/app/useConsulta';
import { useServicos } from '@/app/ContextoServicos';
import { useAutenticacao } from '@/app/ContextoAutenticacao';
import { useToast } from '@/app/ContextoToast';
import { useTituloPagina } from '@/lib/useTituloPagina';
import { mensagemDoErro } from '@/services/erros';
import { ROTULOS_MODALIDADE } from '@/lib/constantes';

const ABAS: ReadonlyArray<{ tipo: TipoCadastro; rotulo: string }> = [
  { tipo: 'professor', rotulo: 'Professores' },
  { tipo: 'disciplina', rotulo: 'Disciplinas' },
  { tipo: 'turma', rotulo: 'Turmas' },
];

export function ArquivadosPage() {
  useTituloPagina('Arquivados');
  const { escola } = useServicos();
  const { usuario } = useAutenticacao();
  const { notificar } = useToast();
  const { dados, carregando, erro, recarregar } = useConsulta(
    () => escola.listarCatalogo(),
    'arquivados',
  );
  const [aba, setAba] = useState<TipoCadastro>('professor');
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<{ id: string; nome: string } | null>(null);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  const itens = useMemo(() => {
    if (!dados) return [];
    const lista: Cadastro[] =
      aba === 'professor'
        ? dados.professores
        : aba === 'disciplina'
          ? dados.disciplinas
          : dados.turmas;
    return lista.filter((item) => item.status === 'arquivado');
  }, [aba, dados]);

  const contarArquivados = (tipo: TipoCadastro): number => {
    if (!dados) return 0;
    const lista =
      tipo === 'professor'
        ? dados.professores
        : tipo === 'disciplina'
          ? dados.disciplinas
          : dados.turmas;
    return lista.filter((item) => item.status === 'arquivado').length;
  };

  const reativar = async (id: string) => {
    if (!usuario) return;
    setProcessandoId(id);
    setErroAcao(null);
    try {
      await escola.alterarStatusCadastro(aba, id, 'ativo', usuario);
      notificar('sucesso', 'Cadastro reativado.');
      recarregar();
    } catch (falha) {
      setErroAcao(mensagemDoErro(falha));
    } finally {
      setProcessandoId(null);
    }
  };

  const confirmarExclusao = async () => {
    if (!excluir || !usuario) return;
    setProcessandoId(excluir.id);
    setErroExclusao(null);
    try {
      await escola.excluirCadastro(aba, excluir.id, usuario);
      notificar('sucesso', 'Cadastro excluído definitivamente.');
      setExcluir(null);
      recarregar();
    } catch (falha) {
      setErroExclusao(mensagemDoErro(falha));
    } finally {
      setProcessandoId(null);
    }
  };

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Administração"
        titulo="Arquivados"
        descricao="Consulte professores, disciplinas e turmas arquivados. Reative o cadastro para devolvê-lo ao uso ou solicite a exclusão definitiva."
        acoes={
          <a className="botao botao--fantasma" href="#/painel">
            <Icone nome="seta-esquerda" tamanho={15} />
            Painel
          </a>
        }
      />

      {erro ? <EstadoErro texto={erro} onTentar={recarregar} /> : null}
      {carregando && !dados ? <EstadoCarregando /> : null}

      {dados && !erro ? (
        <>
          <div className="abas" role="tablist" aria-label="Tipo de cadastro arquivado">
            {ABAS.map((item) => (
              <button
                key={item.tipo}
                type="button"
                role="tab"
                id={`aba-${item.tipo}`}
                className="aba"
                aria-selected={aba === item.tipo}
                aria-controls="painel-arquivados"
                onClick={() => {
                  setAba(item.tipo);
                  setErroAcao(null);
                }}
              >
                {item.rotulo} ({contarArquivados(item.tipo)})
              </button>
            ))}
          </div>

          <div
            id="painel-arquivados"
            role="tabpanel"
            aria-labelledby={`aba-${aba}`}
            style={{ marginTop: '16px' }}
          >
            {erroAcao ? (
              <div style={{ marginBottom: '16px' }}>
                <Alerta tipo="erro" titulo="Não foi possível concluir a ação">
                  {erroAcao}
                </Alerta>
              </div>
            ) : null}

            {itens.length === 0 ? (
              <EstadoVazio
                titulo="Nenhum cadastro arquivado"
                texto="Os registros arquivados aparecem aqui e permanecem consultáveis."
              />
            ) : (
              <div className="envoltorio-tabela">
                <table className="tabela">
                  <caption>Cadastros arquivados de {ABAS.find((item) => item.tipo === aba)?.rotulo.toLowerCase()}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Nome</th>
                      {aba === 'turma' ? (
                        <>
                          <th scope="col">Série</th>
                          <th scope="col">Modalidade</th>
                        </>
                      ) : null}
                      <th scope="col">Status</th>
                      <th scope="col">
                        <span className="somente-leitor">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item) => (
                      <tr key={item.id}>
                        <th scope="row" style={{ fontWeight: 600 }}>
                          {item.nome}
                        </th>
                        {aba === 'turma' && 'serie' in item ? (
                          <>
                            <td>{item.serie}</td>
                            <td>{ROTULOS_MODALIDADE[item.modalidade]}</td>
                          </>
                        ) : null}
                        <td>
                          <SeloStatus status="arquivado" />
                        </td>
                        <td>
                          <div className="tabela__acoes">
                            <button
                              type="button"
                              className="botao botao--fantasma botao--pequeno"
                              onClick={() => void reativar(item.id)}
                              disabled={processandoId === item.id}
                            >
                              <Icone nome="reativar" tamanho={14} />
                              {processandoId === item.id ? 'Reativando…' : 'Reativar'}
                            </button>
                            <button
                              type="button"
                              className="botao botao--perigo botao--pequeno"
                              onClick={() => {
                                setErroExclusao(null);
                                setExcluir({ id: item.id, nome: item.nome });
                              }}
                            >
                              <Icone nome="excluir" tamanho={14} />
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ marginTop: '24px' }}>
            <Alerta tipo="aviso" titulo="Exclusão definitiva">
              A exclusão só é permitida quando não há aulas vinculadas. O histórico e as
              referências descritivas de registros antigos devem ser preservados. O histórico de
              alterações de cadastros permanece pendente de definição (LAC-11).
            </Alerta>
          </div>
        </>
      ) : null}

      <Modal
        aberto={excluir !== null}
        titulo="Excluir cadastro definitivamente?"
        subtitulo="Esta ação remove o registro operacional e não pode ser desfeita."
        onFechar={() => {
          if (!processandoId) setExcluir(null);
        }}
        rodape={
          <>
            <button
              type="button"
              className="botao"
              onClick={() => setExcluir(null)}
              disabled={processandoId !== null}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="botao botao--perigo"
              onClick={() => void confirmarExclusao()}
              disabled={processandoId !== null}
            >
              {processandoId ? 'Excluindo…' : 'Excluir definitivamente'}
            </button>
          </>
        }
      >
        <div className="empilhado">
          {erroExclusao ? (
            <Alerta tipo="erro" titulo="Exclusão impedida">
              {erroExclusao}
            </Alerta>
          ) : null}
          <p>
            O cadastro <strong>{excluir?.nome}</strong> será removido. O sistema verificará os
            vínculos com horários antes de concluir a operação.
          </p>
          <p className="texto-medio texto-secundario">
            Se existirem aulas vinculadas, a exclusão será bloqueada e nenhuma parte da operação
            será aplicada. Reassocie ou remova as aulas antes de tentar novamente.
          </p>
        </div>
      </Modal>
    </>
  );
}
