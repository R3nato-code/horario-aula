import { useState } from 'react';
import type { FormEvent } from 'react';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { Alerta } from '@/components/ui/Alerta';
import { Icone } from '@/components/Icone';
import { useServicos } from '@/app/ContextoServicos';
import { useAutenticacao } from '@/app/ContextoAutenticacao';
import { useTituloPagina } from '@/lib/useTituloPagina';
import { ehErroDeServico, mensagemDoErro } from '@/services/erros';

interface Mensagem {
  id: number;
  autor: 'usuario' | 'sistema' | 'erro';
  texto: string;
  detalhe?: string;
}

const SUGESTOES = [
  'Qual aula acontece agora na turma 2º DSB?',
  'Qual é o horário de amanhã da turma 2º ADM?',
  'Quais são as primeiras aulas do professor Cesar na semana?',
  'Quem é o professor de Banco de Dados II no 3º DSB?',
];

let proximaMensagem = 1;

export function AssistentePage() {
  useTituloPagina('Assistente');
  const { assistente } = useServicos();
  const { usuario } = useAutenticacao();
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      id: 0,
      autor: 'sistema',
      texto:
        'Este espaço consulta os dados escolares por meio de uma camada autorizada. Faça uma pergunta sobre turmas, professores, disciplinas ou horários.',
    },
  ]);
  const [pergunta, setPergunta] = useState('');
  const [processando, setProcessando] = useState(false);
  const [erroServico, setErroServico] = useState<{ mensagem: string; detalhe: string | null } | null>(
    null,
  );

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    const texto = pergunta.trim();
    if (!texto || !usuario || processando) return;

    const mensagemUsuario: Mensagem = {
      id: proximaMensagem,
      autor: 'usuario',
      texto,
    };
    proximaMensagem += 1;
    setMensagens((atuais) => [...atuais, mensagemUsuario]);
    setPergunta('');
    setProcessando(true);
    setErroServico(null);

    try {
      const resposta = await assistente.perguntar(texto, usuario);
      const mensagemSistema: Mensagem = {
        id: proximaMensagem,
        autor: 'sistema',
        texto: resposta.resposta,
      };
      proximaMensagem += 1;
      setMensagens((atuais) => [...atuais, mensagemSistema]);
    } catch (falha) {
      const detalhe = ehErroDeServico(falha) ? falha.detalhes : null;
      const mensagemErro: Mensagem = {
        id: proximaMensagem,
        autor: 'erro',
        texto: mensagemDoErro(falha),
        ...(detalhe ? { detalhe } : {}),
      };
      proximaMensagem += 1;
      setMensagens((atuais) => [...atuais, mensagemErro]);
      setErroServico({ mensagem: mensagemDoErro(falha), detalhe });
    } finally {
      setProcessando(false);
    }
  };

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Minha área"
        titulo="Assistente de consulta"
        descricao="Perguntas em linguagem natural respondidas exclusivamente a partir dos dados escolares autorizados."
      />

      <div className="pilha-secoes">
        <Alerta tipo="aviso" titulo="Integração pendente">
          O assistente ainda não está conectado. A resposta depende de uma Cloud Function que
          valide a identidade, aplique as permissões e consulte o Firestore por ferramentas
          restritas (RF10 e LAC-07). Nenhuma resposta é simulada neste ambiente.
        </Alerta>

        {erroServico ? (
          <Alerta tipo="erro" titulo="Consulta não concluída">
            {erroServico.mensagem}
            {erroServico.detalhe ? (
              <p className="texto-pequeno" style={{ marginTop: '4px' }}>
                {erroServico.detalhe}
              </p>
            ) : null}
          </Alerta>
        ) : null}

        <section className="assistente" aria-label="Conversa com o assistente">
          <div className="assistente__historico" aria-live="polite" aria-atomic="false">
            {mensagens.map((mensagem) => (
              <div
                key={mensagem.id}
                className={`mensagem${
                  mensagem.autor === 'usuario'
                    ? ' mensagem--usuario'
                    : mensagem.autor === 'erro'
                      ? ' mensagem--erro'
                      : ' mensagem--sistema'
                }`}
              >
                <span className="mensagem__autor">
                  {mensagem.autor === 'usuario'
                    ? 'Você'
                    : mensagem.autor === 'erro'
                      ? 'Falha na consulta'
                      : 'Assistente'}
                </span>
                <p>{mensagem.texto}</p>
                {mensagem.detalhe ? (
                  <p className="texto-pequeno" style={{ marginTop: '6px' }}>
                    {mensagem.detalhe}
                  </p>
                ) : null}
              </div>
            ))}
            {processando ? (
              <p className="carregando">
                <span className="carregando__marca" aria-hidden="true" />
                Consultando o serviço autorizado…
              </p>
            ) : null}
          </div>

          <div className="assistente__formulario">
            <div className="assistente__sugestoes" aria-label="Perguntas sugeridas">
              {SUGESTOES.map((sugestao) => (
                <button
                  key={sugestao}
                  type="button"
                  className="sugestao"
                  onClick={() => setPergunta(sugestao)}
                >
                  {sugestao}
                </button>
              ))}
            </div>

            <form className="assistente__entrada" onSubmit={(evento) => void enviar(evento)}>
              <label className="somente-leitor" htmlFor="pergunta-assistente">
                Pergunta para o assistente
              </label>
              <textarea
                id="pergunta-assistente"
                className="campo__controle"
                placeholder="Pergunte sobre turmas, professores, disciplinas ou horários"
                value={pergunta}
                onChange={(evento) => setPergunta(evento.target.value)}
                rows={2}
                disabled={processando}
              />
              <button
                type="submit"
                className="botao botao--primario"
                disabled={processando || pergunta.trim().length === 0}
              >
                <Icone nome="seta-direita" tamanho={16} />
                {processando ? 'Consultando…' : 'Enviar'}
              </button>
            </form>
            <p className="assistente__nota">
              O assistente não deve inventar aulas, professores, disciplinas ou horários. Quando
              não houver dados suficientes, a resposta deve informar a ausência.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
