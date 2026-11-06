import { useMemo, useState } from 'react';
import type {
  AulaDetalhada,
  Cadastro,
  Catalogo,
  Modalidade,
  TipoCadastro,
} from '@/types/dominio';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { Alerta } from '@/components/ui/Alerta';
import { Campo } from '@/components/ui/Campo';
import { Modal } from '@/components/ui/Modal';
import { Icone } from '@/components/Icone';
import { useConsulta } from '@/app/useConsulta';
import { useServicos } from '@/app/ContextoServicos';
import { useAutenticacao } from '@/app/ContextoAutenticacao';
import { useToast } from '@/app/ContextoToast';
import { useTituloPagina } from '@/lib/useTituloPagina';
import { mensagemDoErro } from '@/services/erros';
import { ROTULOS_MODALIDADE } from '@/lib/constantes';
import type { EntradaSalvarCadastro } from '@/services/contratos';

interface ConfiguracaoPagina {
  titulo: string;
  singular: string;
  novo: string;
  descricao: string;
}

const PAGINAS: Record<TipoCadastro, ConfiguracaoPagina> = {
  professor: {
    titulo: 'Professores',
    singular: 'professor',
    novo: 'Novo professor',
    descricao:
      'Cadastros de professores usados na associação das aulas. Arquive registros que não devem mais receber novas aulas.',
  },
  disciplina: {
    titulo: 'Disciplinas',
    singular: 'disciplina',
    novo: 'Nova disciplina',
    descricao:
      'Disciplinas preservam os nomes da fonte oficial, incluindo componentes e conteúdos complementares.',
  },
  turma: {
    titulo: 'Turmas',
    singular: 'turma',
    novo: 'Nova turma',
    descricao:
      'Turmas do período da manhã. A grade semanal de cada turma é editada na área de horários.',
  },
};

interface Formulario {
  id: string | null;
  nome: string;
  serie: string;
  modalidade: Modalidade;
}

function formularioVazio(): Formulario {
  return { id: null, nome: '', serie: '', modalidade: 'ensino-medio' };
}

function contarAulas(aulas: AulaDetalhada[], tipo: TipoCadastro, id: string): number {
  if (tipo === 'professor') return aulas.filter((aula) => aula.professorId === id).length;
  if (tipo === 'disciplina') return aulas.filter((aula) => aula.disciplinaId === id).length;
  return aulas.filter((aula) => aula.turmaId === id).length;
}

export function CadastrosAdminPage({ tipo }: { tipo: TipoCadastro }) {
  const configuracao = PAGINAS[tipo];
  useTituloPagina(configuracao.titulo);
  const { escola } = useServicos();
  const { usuario } = useAutenticacao();
  const { notificar } = useToast();
  const { dados, carregando, erro, recarregar } = useConsulta(async () => {
    const [catalogo, aulas] = await Promise.all([
      escola.listarCatalogo(),
      escola.listarAulas(),
    ]);
    return { catalogo, aulas };
  }, `cadastros-${tipo}`);

  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [formulario, setFormulario] = useState<Formulario>(formularioVazio);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [erroNome, setErroNome] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [arquivar, setArquivar] = useState<{ id: string; nome: string } | null>(null);
  const [erroArquivar, setErroArquivar] = useState<string | null>(null);

  const itens = useMemo(() => {
    if (!dados) return [];
    const catalogo: Catalogo = dados.catalogo;
    const lista: Cadastro[] =
      tipo === 'professor'
        ? catalogo.professores
        : tipo === 'disciplina'
          ? catalogo.disciplinas
          : catalogo.turmas;
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return lista
      .filter((item) => item.status === 'ativo')
      .filter((item) => !termo || item.nome.toLocaleLowerCase('pt-BR').includes(termo));
  }, [busca, dados, tipo]);

  const abrirNovo = () => {
    setFormulario(formularioVazio());
    setErroFormulario(null);
    setErroNome(null);
    setModalAberto(true);
  };

  const abrirEdicao = (item: { id: string; nome: string; serie?: string; modalidade?: Modalidade }) => {
    setFormulario({
      id: item.id,
      nome: item.nome,
      serie: item.serie ?? '',
      modalidade: item.modalidade ?? 'ensino-medio',
    });
    setErroFormulario(null);
    setErroNome(null);
    setModalAberto(true);
  };

  const salvar = async () => {
    const nome = formulario.nome.trim();
    if (nome.length < 2) {
      setErroNome('Informe um nome com pelo menos 2 caracteres.');
      return;
    }
    if (tipo === 'turma' && !formulario.serie.trim()) {
      setErroFormulario('Informe a série da turma.');
      return;
    }

    let entrada: EntradaSalvarCadastro;
    if (tipo === 'professor') {
      entrada = { tipo: 'professor', nome, ...(formulario.id ? { id: formulario.id } : {}) };
    } else if (tipo === 'disciplina') {
      entrada = { tipo: 'disciplina', nome, ...(formulario.id ? { id: formulario.id } : {}) };
    } else {
      entrada = {
        tipo: 'turma',
        nome,
        serie: formulario.serie.trim(),
        modalidade: formulario.modalidade,
        ...(formulario.id ? { id: formulario.id } : {}),
      };
    }

    if (!usuario) {
      setErroFormulario('Sessão não disponível. Entre novamente para salvar.');
      return;
    }

    setSalvando(true);
    setErroFormulario(null);
    try {
      await escola.salvarCadastro(entrada, usuario);
      notificar('sucesso', formulario.id ? 'Cadastro atualizado.' : 'Cadastro criado.');
      setModalAberto(false);
      recarregar();
    } catch (falha) {
      setErroFormulario(mensagemDoErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  const confirmarArquivamento = async () => {
    if (!arquivar || !usuario) return;
    setSalvando(true);
    setErroArquivar(null);
    try {
      await escola.alterarStatusCadastro(tipo, arquivar.id, 'arquivado', usuario);
      notificar('sucesso', 'Cadastro arquivado. Ele pode ser consultado em Arquivados.');
      setArquivar(null);
      recarregar();
    } catch (falha) {
      setErroArquivar(mensagemDoErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Administração"
        titulo={configuracao.titulo}
        descricao={configuracao.descricao}
        acoes={
          <>
            <a className="botao" href="#/painel/arquivados">
              <Icone nome="arquivar" tamanho={16} />
              Arquivados
            </a>
            <button type="button" className="botao botao--primario" onClick={abrirNovo}>
              <Icone nome="mais" tamanho={16} />
              {configuracao.novo}
            </button>
          </>
        }
      />

      {erro ? <EstadoErro texto={erro} onTentar={recarregar} /> : null}
      {carregando && !dados ? <EstadoCarregando /> : null}

      {dados && !erro ? (
        <>
          <div className="barra-ferramentas">
            <div className="busca">
              <Icone nome="busca" tamanho={16} />
              <label className="somente-leitor" htmlFor={`busca-${tipo}`}>
                Buscar {configuracao.singular}
              </label>
              <input
                id={`busca-${tipo}`}
                className="campo__controle"
                type="search"
                placeholder={`Buscar ${configuracao.singular}`}
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
              />
            </div>
            <p className="texto-pequeno texto-secundario">
              {itens.length} cadastro(s) ativo(s)
            </p>
          </div>

          {itens.length === 0 ? (
            <EstadoVazio
              titulo={`Nenhum ${configuracao.singular} ativo`}
              texto={
                busca
                  ? 'A busca não retornou cadastros ativos. Ajuste o termo pesquisado.'
                  : `Crie o primeiro cadastro de ${configuracao.singular} para começar.`
              }
              acao={
                busca ? (
                  <button type="button" className="botao botao--pequeno" onClick={() => setBusca('')}>
                    Limpar busca
                  </button>
                ) : (
                  <button type="button" className="botao botao--pequeno" onClick={abrirNovo}>
                    {configuracao.novo}
                  </button>
                )
              }
            />
          ) : (
            <div className="envoltorio-tabela">
              <table className="tabela">
                <caption>
                  {configuracao.titulo} ativos. Ações disponíveis: editar e arquivar.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Nome</th>
                    {tipo === 'turma' ? (
                      <>
                        <th scope="col">Série</th>
                        <th scope="col">Modalidade</th>
                      </>
                    ) : null}
                    <th scope="col">Aulas vinculadas</th>
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
                      {tipo === 'turma' && 'serie' in item ? (
                        <>
                          <td>{item.serie}</td>
                          <td>{ROTULOS_MODALIDADE[item.modalidade]}</td>
                        </>
                      ) : null}
                      <td className="tabela__numero">{contarAulas(dados.aulas, tipo, item.id)}</td>
                      <td>
                        <div className="tabela__acoes">
                          {tipo === 'turma' ? (
                            <a
                              className="botao botao--fantasma botao--pequeno"
                              href={`#/painel/horarios/${item.id}`}
                            >
                              Grade
                            </a>
                          ) : null}
                          <button
                            type="button"
                            className="botao botao--fantasma botao--pequeno"
                            onClick={() =>
                              abrirEdicao(
                                'serie' in item && 'modalidade' in item
                                  ? {
                                      id: item.id,
                                      nome: item.nome,
                                      serie: item.serie,
                                      modalidade: item.modalidade,
                                    }
                                  : { id: item.id, nome: item.nome },
                              )
                            }
                          >
                            <Icone nome="editar" tamanho={14} />
                            Editar
                          </button>
                          <button
                            type="button"
                            className="botao botao--fantasma botao--pequeno"
                            onClick={() => {
                              setErroArquivar(null);
                              setArquivar({ id: item.id, nome: item.nome });
                            }}
                          >
                            <Icone nome="arquivar" tamanho={14} />
                            Arquivar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      <Modal
        aberto={modalAberto}
        titulo={formulario.id ? `Editar ${configuracao.singular}` : configuracao.novo}
        subtitulo="As alterações de cadastro são validadas e gravadas pelo serviço autorizado."
        onFechar={() => {
          if (!salvando) setModalAberto(false);
        }}
        rodape={
          <>
            <button
              type="button"
              className="botao"
              onClick={() => setModalAberto(false)}
              disabled={salvando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="botao botao--primario"
              onClick={() => void salvar()}
              disabled={salvando}
              aria-busy={salvando}
            >
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </>
        }
      >
        <div className="empilhado">
          {erroFormulario ? (
            <Alerta tipo="erro" titulo="Não foi possível salvar">
              {erroFormulario}
            </Alerta>
          ) : null}

          <Campo
            id="cadastro-nome"
            rotulo="Nome"
            obrigatorio
            {...(erroNome ? { erro: erroNome } : {})}
          >
            <input
              id="cadastro-nome"
              className="campo__controle"
              value={formulario.nome}
              onChange={(evento) => {
                setFormulario((atual) => ({ ...atual, nome: evento.target.value }));
                setErroNome(null);
              }}
              maxLength={120}
              autoComplete="off"
              aria-invalid={erroNome ? 'true' : undefined}
              aria-describedby={erroNome ? 'cadastro-nome-erro' : undefined}
            />
          </Campo>

          {tipo === 'turma' ? (
            <div className="grade-campos">
              <Campo id="cadastro-serie" rotulo="Série" obrigatorio>
                <input
                  id="cadastro-serie"
                  className="campo__controle"
                  value={formulario.serie}
                  onChange={(evento) =>
                    setFormulario((atual) => ({ ...atual, serie: evento.target.value }))
                  }
                  maxLength={60}
                  autoComplete="off"
                />
              </Campo>
              <Campo id="cadastro-modalidade" rotulo="Modalidade" obrigatorio>
                <select
                  id="cadastro-modalidade"
                  className="campo__controle"
                  value={formulario.modalidade}
                  onChange={(evento) =>
                    setFormulario((atual) => ({
                      ...atual,
                      modalidade: evento.target.value as Modalidade,
                    }))
                  }
                >
                  <option value="ensino-medio">Ensino Médio</option>
                  <option value="tecnico">Ensino Técnico</option>
                </select>
              </Campo>
            </div>
          ) : null}

          <Alerta tipo="aviso" titulo="Exclusão não é feita nesta tela">
            Para excluir definitivamente, use a seção Arquivados. O sistema verificará as
            dependências antes de remover o cadastro.
          </Alerta>
        </div>
      </Modal>

      <Modal
        aberto={arquivar !== null}
        titulo={`Arquivar ${configuracao.singular}?`}
        onFechar={() => {
          if (!salvando) setArquivar(null);
        }}
        rodape={
          <>
            <button
              type="button"
              className="botao"
              onClick={() => setArquivar(null)}
              disabled={salvando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="botao botao--primario"
              onClick={() => void confirmarArquivamento()}
              disabled={salvando}
            >
              {salvando ? 'Arquivando…' : 'Arquivar cadastro'}
            </button>
          </>
        }
      >
        <div className="empilhado">
          {erroArquivar ? (
            <Alerta tipo="erro" titulo="Não foi possível arquivar">
              {erroArquivar}
            </Alerta>
          ) : null}
          <p>
            O cadastro <strong>{arquivar?.nome}</strong> sairá das listas ativas e não poderá
            receber novas associações. Aulas já existentes permanecem vinculadas.
          </p>
          <p className="texto-medio texto-secundario">
            O registro continua disponível na seção Arquivados e pode ser reativado
            posteriormente, após validação.
          </p>
        </div>
      </Modal>
    </>
  );
}

export function ProfessoresAdminPage() {
  return <CadastrosAdminPage tipo="professor" />;
}

export function DisciplinasAdminPage() {
  return <CadastrosAdminPage tipo="disciplina" />;
}

export function TurmasAdminPage() {
  return <CadastrosAdminPage tipo="turma" />;
}
