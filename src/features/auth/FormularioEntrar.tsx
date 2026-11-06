import { useRef, useState, type FormEvent } from 'react';
import { Icone } from '@/components/Icone';
import { Alerta } from '@/components/ui/Alerta';
import { Campo } from '@/components/ui/Campo';
import { useAutenticacao } from '@/app/ContextoAutenticacao';
import { mensagemDoErro } from '@/services/erros';
import { BotaoGoogle } from './BotaoGoogle';
import { CampoSenha } from './CampoSenha';
import { validarEmail, validarSenha } from './validacaoAcesso';

interface Props {
  aoCriarConta: () => void;
  aoRecuperarSenha: (email: string) => void;
}

interface ErrosCampos {
  email: string | null;
  senha: string | null;
}

export function FormularioEntrar({ aoCriarConta, aoRecuperarSenha }: Props) {
  const { entrarComEmailSenha, entrarComGoogle } = useAutenticacao();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [manterConectado, setManterConectado] = useState(true);
  const [erros, setErros] = useState<ErrosCampos>({ email: null, senha: null });
  const [falha, setFalha] = useState<string | null>(null);
  const [acao, setAcao] = useState<'entrar' | 'google' | null>(null);

  const refEmail = useRef<HTMLInputElement>(null);
  const refSenha = useRef<HTMLInputElement>(null);

  const ocupado = acao !== null;

  const atualizarEmail = (valor: string) => {
    setEmail(valor);
    setFalha(null);
    if (erros.email) setErros((atual) => ({ ...atual, email: null }));
  };

  const atualizarSenha = (valor: string) => {
    setSenha(valor);
    setFalha(null);
    if (erros.senha) setErros((atual) => ({ ...atual, senha: null }));
  };

  const entrar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (ocupado) return;

    const erroEmail = validarEmail(email);
    const erroSenha = validarSenha(senha);
    setErros({ email: erroEmail, senha: erroSenha });

    if (erroEmail) {
      refEmail.current?.focus();
      return;
    }
    if (erroSenha) {
      refSenha.current?.focus();
      return;
    }

    setFalha(null);
    setAcao('entrar');

    try {
      await entrarComEmailSenha(
        { email: email.trim(), senha },
        { manterConectado },
      );
    } catch (erro) {
      setFalha(mensagemDoErro(erro));
    } finally {
      setAcao(null);
    }
  };

  const entrarGoogle = async () => {
    if (ocupado) return;

    setFalha(null);
    setAcao('google');

    try {
      await entrarComGoogle({ manterConectado });
    } catch (erro) {
      setFalha(mensagemDoErro(erro));
    } finally {
      setAcao(null);
    }
  };

  return (
    <form
      className="login__form"
      onSubmit={(evento) => {
        evento.preventDefault();
        void entrar(evento);
      }}
      noValidate
      aria-busy={ocupado}
    >
      {falha ? (
        <Alerta tipo="erro" titulo="Não foi possível entrar">
          {falha}
        </Alerta>
      ) : null}

      <Campo
        id="acesso-email"
        rotulo="E-mail"
        obrigatorio
        {...(erros.email ? { erro: erros.email } : {})}
      >
        <input
          ref={refEmail}
          id="acesso-email"
          className="campo__controle"
          type="email"
          value={email}
          onChange={(evento) => atualizarEmail(evento.target.value)}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          disabled={ocupado}
          required
          aria-invalid={erros.email ? true : undefined}
          aria-describedby={erros.email ? 'acesso-email-erro' : undefined}
        />
      </Campo>

      <CampoSenha
        id="acesso-senha"
        rotulo="Senha"
        valor={senha}
        aoMudar={atualizarSenha}
        erro={erros.senha}
        autoComplete="current-password"
        disabled={ocupado}
        obrigatorio
        inputRef={refSenha}
      />

      <div className="login__linha-opcoes">
        <label className="caixa-selecao">
          <input
            type="checkbox"
            checked={manterConectado}
            onChange={(evento) => setManterConectado(evento.target.checked)}
            disabled={ocupado}
          />
          <span>Manter conectado</span>
        </label>

        <button
          type="button"
          className="login__link"
          onClick={() => aoRecuperarSenha(email.trim())}
          disabled={ocupado}
        >
          Esqueci minha senha
        </button>
      </div>

      <button
        type="submit"
        className="botao botao--primario botao--bloco"
        disabled={ocupado}
        aria-busy={acao === 'entrar'}
      >
        {acao === 'entrar' ? (
          <>
            <span className="carregando__marca" aria-hidden="true" />
            Entrando…
          </>
        ) : (
          <>
            <Icone nome="entrar" tamanho={17} />
            Entrar
          </>
        )}
      </button>

      <div className="login__divisor" aria-hidden="true">
        <span>ou</span>
      </div>

      <BotaoGoogle
        rotulo="Continuar com Google"
        carregando={acao === 'google'}
        desabilitado={ocupado}
        onClick={() => void entrarGoogle()}
      />

      <p className="login__alternativa">
        Ainda não tem conta?{' '}
        <button
          type="button"
          className="login__link"
          onClick={aoCriarConta}
          disabled={ocupado}
        >
          Criar conta
        </button>
      </p>
    </form>
  );
}
