import { useRef, useState, type FormEvent } from 'react';
import { Alerta } from '@/components/ui/Alerta';
import { Campo } from '@/components/ui/Campo';
import { useAutenticacao } from '@/app/ContextoAutenticacao';
import { mensagemDoErro } from '@/services/erros';
import { validarEmail } from './validacaoAcesso';

interface Props {
  aoVoltar: () => void;
  emailInicial?: string;
}

export function FormularioRecuperacao({ aoVoltar, emailInicial }: Props) {
  const { recuperarSenha } = useAutenticacao();

  const [email, setEmail] = useState(emailInicial ?? '');
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const refEmail = useRef<HTMLInputElement>(null);

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (enviando) return;

    const erro = validarEmail(email);
    setErroEmail(erro);

    if (erro) {
      refEmail.current?.focus();
      return;
    }

    setFalha(null);
    setSucesso(null);
    setEnviando(true);

    try {
      await recuperarSenha(email.trim());
      setSucesso(
        `Se existir uma conta com o e-mail ${email.trim()}, enviaremos um link para redefinir a senha. Verifique a caixa de entrada e também o spam.`,
      );
    } catch (erroRecuperacao) {
      setFalha(mensagemDoErro(erroRecuperacao));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form
      className="login__form"
      onSubmit={(evento) => {
        evento.preventDefault();
        void enviar(evento);
      }}
      noValidate
      aria-busy={enviando}
    >
      {falha ? (
        <Alerta tipo="erro" titulo="Não foi possível enviar o link">
          {falha}
        </Alerta>
      ) : null}

      {sucesso ? (
        <Alerta tipo="sucesso" titulo="Verifique seu e-mail">
          {sucesso}
        </Alerta>
      ) : null}

      <Campo
        id="recuperar-email"
        rotulo="E-mail cadastrado"
        obrigatorio
        ajuda="Enviaremos um link de redefinição para este endereço."
        {...(erroEmail ? { erro: erroEmail } : {})}
      >
        <input
          ref={refEmail}
          id="recuperar-email"
          className="campo__controle"
          type="email"
          value={email}
          onChange={(evento) => {
            setEmail(evento.target.value);
            setFalha(null);
            setSucesso(null);
            if (erroEmail) setErroEmail(null);
          }}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          disabled={enviando}
          required
          aria-invalid={erroEmail ? true : undefined}
          aria-describedby={
            erroEmail ? 'recuperar-email-erro' : 'recuperar-email-ajuda'
          }
        />
      </Campo>

      <button
        type="submit"
        className="botao botao--primario botao--bloco"
        disabled={enviando}
        aria-busy={enviando}
      >
        {enviando
          ? 'Enviando…'
          : sucesso
            ? 'Enviar novamente'
            : 'Enviar link de redefinição'}
      </button>

      <p className="login__alternativa">
        Lembrou a senha?{' '}
        <button
          type="button"
          className="login__link"
          onClick={aoVoltar}
          disabled={enviando}
        >
          Voltar para entrar
        </button>
      </p>

      <p className="login__nota">
        Por segurança, não informamos se o e-mail está cadastrado. O link é enviado
        apenas para contas existentes e tem validade limitada pelo Firebase
        Authentication.
      </p>
    </form>
  );
}
