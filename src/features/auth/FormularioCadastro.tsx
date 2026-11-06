import { useRef, useState, type FormEvent } from 'react';
import { Alerta } from '@/components/ui/Alerta';
import { Campo } from '@/components/ui/Campo';
import { useAutenticacao } from '@/app/ContextoAutenticacao';
import { mensagemDoErro } from '@/services/erros';
import { BotaoGoogle } from './BotaoGoogle';
import { CampoSenha } from './CampoSenha';
import {
  validarConfirmacao,
  validarEmail,
  validarNome,
  validarSenha,
} from './validacaoAcesso';

interface Props {
  aoEntrar: () => void;
}

interface ErrosCampos {
  nome: string | null;
  email: string | null;
  senha: string | null;
  confirmacao: string | null;
}

export function FormularioCadastro({ aoEntrar }: Props) {
  const { cadastrarComEmailSenha, entrarComGoogle } = useAutenticacao();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<ErrosCampos>({
    nome: null,
    email: null,
    senha: null,
    confirmacao: null,
  });
  const [falha, setFalha] = useState<string | null>(null);
  const [acao, setAcao] = useState<'cadastro' | 'google' | null>(null);

  const refNome = useRef<HTMLInputElement>(null);
  const refEmail = useRef<HTMLInputElement>(null);
  const refSenha = useRef<HTMLInputElement>(null);
  const refConfirmacao = useRef<HTMLInputElement>(null);

  const ocupado = acao !== null;

  const cadastrar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (ocupado) return;

    const erroNome = validarNome(nome);
    const erroEmail = validarEmail(email);
    const erroSenha = validarSenha(senha);
    const erroConfirmacao = validarConfirmacao(senha, confirmacao);

    setErros({
      nome: erroNome,
      email: erroEmail,
      senha: erroSenha,
      confirmacao: erroConfirmacao,
    });

    if (erroNome) {
      refNome.current?.focus();
      return;
    }
    if (erroEmail) {
      refEmail.current?.focus();
      return;
    }
    if (erroSenha) {
      refSenha.current?.focus();
      return;
    }
    if (erroConfirmacao) {
      refConfirmacao.current?.focus();
      return;
    }

    setFalha(null);
    setAcao('cadastro');

    try {
      await cadastrarComEmailSenha(
        { nome: nome.trim(), email: email.trim(), senha },
        { manterConectado: true },
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
      await entrarComGoogle({ manterConectado: true });
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
        void cadastrar(evento);
      }}
      noValidate
      aria-busy={ocupado}
    >
      {falha ? (
        <Alerta tipo="erro" titulo="Não foi possível criar a conta">
          {falha}
        </Alerta>
      ) : null}

      <Campo
        id="cadastro-nome"
        rotulo="Nome completo"
        obrigatorio
        {...(erros.nome ? { erro: erros.nome } : {})}
      >
        <input
          ref={refNome}
          id="cadastro-nome"
          className="campo__controle"
          type="text"
          value={nome}
          onChange={(evento) => {
            setNome(evento.target.value);
            setFalha(null);
            if (erros.nome) setErros((atual) => ({ ...atual, nome: null }));
          }}
          autoComplete="name"
          maxLength={120}
          disabled={ocupado}
          required
          aria-invalid={erros.nome ? true : undefined}
          aria-describedby={erros.nome ? 'cadastro-nome-erro' : undefined}
        />
      </Campo>

      <Campo
        id="cadastro-email"
        rotulo="E-mail"
        obrigatorio
        {...(erros.email ? { erro: erros.email } : {})}
      >
        <input
          ref={refEmail}
          id="cadastro-email"
          className="campo__controle"
          type="email"
          value={email}
          onChange={(evento) => {
            setEmail(evento.target.value);
            setFalha(null);
            if (erros.email) setErros((atual) => ({ ...atual, email: null }));
          }}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          disabled={ocupado}
          required
          aria-invalid={erros.email ? true : undefined}
          aria-describedby={erros.email ? 'cadastro-email-erro' : undefined}
        />
      </Campo>

      <CampoSenha
        id="cadastro-senha"
        rotulo="Senha"
        valor={senha}
        aoMudar={(valor) => {
          setSenha(valor);
          setFalha(null);
          if (erros.senha) setErros((atual) => ({ ...atual, senha: null }));
        }}
        erro={erros.senha}
        ajuda="Use pelo menos 6 caracteres."
        autoComplete="new-password"
        disabled={ocupado}
        obrigatorio
        inputRef={refSenha}
      />

      <CampoSenha
        id="cadastro-confirmacao"
        rotulo="Confirmar senha"
        valor={confirmacao}
        aoMudar={(valor) => {
          setConfirmacao(valor);
          setFalha(null);
          if (erros.confirmacao) {
            setErros((atual) => ({ ...atual, confirmacao: null }));
          }
        }}
        erro={erros.confirmacao}
        ajuda="Repita a senha digitada acima."
        autoComplete="new-password"
        disabled={ocupado}
        obrigatorio
        inputRef={refConfirmacao}
      />

      <button
        type="submit"
        className="botao botao--primario botao--bloco"
        disabled={ocupado}
        aria-busy={acao === 'cadastro'}
      >
        {acao === 'cadastro' ? 'Criando conta…' : 'Criar conta'}
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
        Já tem uma conta?{' '}
        <button
          type="button"
          className="login__link"
          onClick={aoEntrar}
          disabled={ocupado}
        >
          Entrar
        </button>
      </p>

      <p className="login__nota">
        Ao criar a conta por e-mail, o servidor registra seu perfil com o papel de aluno.
        Perfis de professor, administração e gestão são atribuídos pela secretaria. A
        autorização definitiva é sempre validada no servidor.
      </p>
    </form>
  );
}
