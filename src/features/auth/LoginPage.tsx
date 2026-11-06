import { useState } from 'react';
import { Alerta } from '@/components/ui/Alerta';
import { useAutenticacao } from '@/app/ContextoAutenticacao';
import { useServicos } from '@/app/ContextoServicos';
import { NOME_INSTITUICAO, NOME_SISTEMA } from '@/lib/constantes';
import { AcessoDemonstracao } from './AcessoDemonstracao';
import { FormularioCadastro } from './FormularioCadastro';
import { FormularioEntrar } from './FormularioEntrar';
import { FormularioRecuperacao } from './FormularioRecuperacao';

type ModoAcesso = 'entrar' | 'cadastro' | 'recuperar';

const TITULOS: Record<ModoAcesso, string> = {
  entrar: 'Entre na sua conta',
  cadastro: 'Crie sua conta',
  recuperar: 'Recupere seu acesso',
};

const DESCRICOES: Record<ModoAcesso, string> = {
  entrar:
    'Use seu e-mail e senha ou continue com o Google. Se ainda não houver perfil, ele será criado como aluno no primeiro acesso.',
  cadastro:
    'Contas novas recebem perfil de aluno. Perfis de professor, administração e gestão são atribuídos pela secretaria.',
  recuperar:
    'Informe o e-mail cadastrado para receber um link de redefinição de senha.',
};

export function LoginPage() {
  const { modo } = useServicos();
  const { status, erro, limparErro, recarregarSessao } = useAutenticacao();
  const [modoAcesso, setModoAcesso] = useState<ModoAcesso>('entrar');
  const [emailRecuperacao, setEmailRecuperacao] = useState('');

  const mudarModo = (novo: ModoAcesso) => {
    limparErro();
    setModoAcesso(novo);
  };

  const recuperarComEmail = (email: string) => {
    setEmailRecuperacao(email);
    mudarModo('recuperar');
  };

  const abaEntrarAtiva = modoAcesso !== 'cadastro';

  return (
    <div className="login">
      <section className="login__institucional" aria-labelledby="titulo-institucional">
        <div>
          <div className="login__marca">
            <img src="/favicon.svg" width="44" height="44" alt="" />
            <div>
              <span className="login__marca-texto">{NOME_SISTEMA}</span>
              <span className="login__instituicao">{NOME_INSTITUICAO}</span>
            </div>
          </div>

          <h1 className="login__destaque" id="titulo-institucional">
            Organização escolar em uma única consulta.
          </h1>
          <p className="login__resumo">
            Horários das 14 turmas do período da manhã, gestão administrativa, favoritos,
            notificações e consulta assistida por IA sobre os dados da escola.
          </p>

          <div className="login__modulos" aria-label="Módulos do sistema">
            <div className="login__modulo">
              <span className="login__modulo-numero">01</span>
              <span>Consulta por turma e por professor</span>
            </div>
            <div className="login__modulo">
              <span className="login__modulo-numero">02</span>
              <span>Grade semanal e edição administrativa</span>
            </div>
            <div className="login__modulo">
              <span className="login__modulo-numero">03</span>
              <span>Histórico de alterações e notificações internas</span>
            </div>
            <div className="login__modulo">
              <span className="login__modulo-numero">04</span>
              <span>Assistente conectado aos dados escolares</span>
            </div>
          </div>
        </div>

        <p className="login__rodape">
          Aplicação web instalável. Operações sensíveis são executadas no servidor e
          validadas pelas regras de segurança. Nenhuma chave privada é exposta ao
          navegador.
        </p>
      </section>

      <section className="login__painel" aria-labelledby="titulo-acesso">
        <div className="login__formulario">
          <p className="rotulo-secao">Acesso ao sistema</p>
          <h2 className="login__titulo" id="titulo-acesso">
            {TITULOS[modoAcesso]}
          </h2>
          <p className="login__texto">{DESCRICOES[modoAcesso]}</p>

          {erro ? (
            <div className="login__mensagens">
              <Alerta tipo="erro" titulo="Não foi possível concluir seu acesso">
                <p>{erro}</p>
                <p className="texto-pequeno">
                  Sua conta foi autenticada, mas o perfil escolar não pôde ser preparado.
                  Verifique sua conexão e tente novamente antes de procurar a administração.
                </p>
                <button
                  type="button"
                  className="botao botao--pequeno login__tentativa"
                  onClick={() => void recarregarSessao()}
                  disabled={status === 'carregando'}
                  aria-busy={status === 'carregando'}
                >
                  {status === 'carregando' ? 'Tentando novamente…' : 'Tentar novamente'}
                </button>
              </Alerta>
            </div>
          ) : null}

          {modo === 'demo' ? (
            <div className="login__mensagens">
              <Alerta tipo="info" titulo="Ambiente de demonstração">
                Os formulários de e-mail e Google exigem o Firebase configurado. Para
                navegar agora, use um perfil de demonstração ao final da página.
              </Alerta>
            </div>
          ) : null}

          <div
            className="login__abas"
            role="group"
            aria-label="Escolha entre entrar ou criar conta"
          >
            <button
              type="button"
              className="login__aba"
              aria-pressed={abaEntrarAtiva}
              onClick={() => mudarModo('entrar')}
            >
              Entrar
            </button>
            <button
              type="button"
              className="login__aba"
              aria-pressed={modoAcesso === 'cadastro'}
              onClick={() => mudarModo('cadastro')}
            >
              Criar conta
            </button>
          </div>

          {modoAcesso === 'entrar' ? (
            <FormularioEntrar
              aoCriarConta={() => mudarModo('cadastro')}
              aoRecuperarSenha={recuperarComEmail}
            />
          ) : modoAcesso === 'cadastro' ? (
            <FormularioCadastro aoEntrar={() => mudarModo('entrar')} />
          ) : (
            <FormularioRecuperacao
              aoVoltar={() => mudarModo('entrar')}
              emailInicial={emailRecuperacao}
            />
          )}

          {modo === 'demo' ? <AcessoDemonstracao /> : null}
        </div>
      </section>
    </div>
  );
}
