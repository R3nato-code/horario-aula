import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  doc,
  runTransaction,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import type { Papel, Usuario } from '@/types/dominio';
import type {
  CredenciaisEmailSenha,
  DadosCadastroConta,
  OpcoesPersistencia,
  ServicoAutenticacao,
} from '@/services/contratos';
import { ErroDeServico, ehErroDeServico, type CodigoErroServico } from '@/services/erros';
import { obterAutenticacaoFirebase, obterFirestore } from '@/lib/firebase/cliente';
import { textoNaoVazio } from '@/lib/firebase/conversoes';

const PAPEIS_VALIDOS: readonly Papel[] = ['gestor', 'admin', 'professor', 'aluno'];

interface MensagemErro {
  codigo: CodigoErroServico;
  mensagem: string;
}

/**
 * Tradução dos códigos do Firebase Auth para mensagens de interface.
 * O detalhe técnico permanece fora da tela.
 */
const MENSAGENS_POR_CODIGO: Record<string, MensagemErro> = {
  'auth/invalid-credential': {
    codigo: 'validacao',
    mensagem: 'E-mail ou senha incorretos. Verifique os dados e tente novamente.',
  },
  'auth/invalid-login-credentials': {
    codigo: 'validacao',
    mensagem: 'E-mail ou senha incorretos. Verifique os dados e tente novamente.',
  },
  'auth/wrong-password': {
    codigo: 'validacao',
    mensagem: 'E-mail ou senha incorretos. Verifique os dados e tente novamente.',
  },
  'auth/user-not-found': {
    codigo: 'validacao',
    mensagem: 'E-mail ou senha incorretos. Verifique os dados e tente novamente.',
  },
  'auth/invalid-email': {
    codigo: 'validacao',
    mensagem: 'Informe um endereço de e-mail válido.',
  },
  'auth/user-disabled': {
    codigo: 'permissao',
    mensagem: 'Esta conta está desativada. Procure a administração.',
  },
  'auth/too-many-requests': {
    codigo: 'validacao',
    mensagem:
      'Muitas tentativas em sequência. Aguarde alguns minutos antes de tentar novamente.',
  },
  'auth/email-already-in-use': {
    codigo: 'validacao',
    mensagem:
      'Já existe uma conta com este e-mail. Entre com sua senha ou use a recuperação de acesso.',
  },
  'auth/weak-password': {
    codigo: 'validacao',
    mensagem: 'A senha é muito fraca. Use pelo menos 6 caracteres.',
  },
  'auth/network-request-failed': {
    codigo: 'desconhecido',
    mensagem:
      'Não foi possível conectar ao serviço de autenticação. Verifique sua conexão e tente novamente.',
  },
  'auth/operation-not-allowed': {
    codigo: 'nao-configurado',
    mensagem:
      'Este método de acesso não está habilitado no projeto. Procure a administração.',
  },
  'auth/popup-closed-by-user': {
    codigo: 'validacao',
    mensagem: 'A janela de login do Google foi fechada antes de concluir o acesso.',
  },
  'auth/cancelled-popup-request': {
    codigo: 'validacao',
    mensagem: 'A janela de login do Google foi fechada antes de concluir o acesso.',
  },
  'auth/popup-blocked': {
    codigo: 'desconhecido',
    mensagem:
      'O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente novamente.',
  },
  'auth/account-exists-with-different-credential': {
    codigo: 'validacao',
    mensagem:
      'Este e-mail já está vinculado a outra forma de acesso. Entre pelo método usado no primeiro cadastro.',
  },
  'auth/requires-recent-login': {
    codigo: 'permissao',
    mensagem: 'Por segurança, entre novamente antes de concluir esta operação.',
  },
  'auth/unauthorized-domain': {
    codigo: 'nao-configurado',
    mensagem:
      'Este endereço não está autorizado no Firebase Authentication. Procure a administração.',
  },
  'auth/configuration-not-found': {
    codigo: 'nao-configurado',
    mensagem:
      'A autenticação não está configurada corretamente neste ambiente. Procure a administração.',
  },
  'auth/invalid-api-key': {
    codigo: 'nao-configurado',
    mensagem:
      'A autenticação não está configurada corretamente neste ambiente. Procure a administração.',
  },
  // Falhas ao ler/criar `users/{uid}` diretamente no Firestore.
  'permission-denied': {
    codigo: 'permissao',
    mensagem:
      'Não foi possível preparar seu perfil de acesso. Sua conta foi autenticada, mas o perfil escolar não pôde ser criado. Procure a administração.',
  },
  unauthenticated: {
    codigo: 'permissao',
    mensagem: 'Sua sessão expirou. Entre novamente para continuar.',
  },
  unavailable: {
    codigo: 'desconhecido',
    mensagem:
      'Não foi possível conectar ao banco de dados. Verifique sua conexão e tente novamente.',
  },
  'failed-precondition': {
    codigo: 'nao-configurado',
    mensagem:
      'O perfil de acesso ainda não pode ser preparado neste ambiente. Procure a administração.',
  },
};

function papelValido(valor: unknown): valor is Papel {
  return (
    typeof valor === 'string' && (PAPEIS_VALIDOS as readonly string[]).includes(valor)
  );
}

function codigoDoErro(erro: unknown): string | null {
  if (typeof erro !== 'object' || erro === null || !('code' in erro)) return null;
  const codigo = (erro as { code?: unknown }).code;
  return typeof codigo === 'string' ? codigo : null;
}

function traduzirErro(erro: unknown): ErroDeServico {
  if (ehErroDeServico(erro)) return erro;

  const codigo = codigoDoErro(erro);
  const mapeado = codigo ? MENSAGENS_POR_CODIGO[codigo] : undefined;

  if (mapeado) {
    return new ErroDeServico(mapeado.codigo, mapeado.mensagem);
  }

  const detalhe = erro instanceof Error ? erro.message : undefined;
  return new ErroDeServico(
    'desconhecido',
    'Não foi possível concluir a operação. Tente novamente.',
    detalhe,
  );
}

async function definirPersistencia(
  auth: Auth,
  opcoes?: OpcoesPersistencia,
): Promise<void> {
  const manterConectado = opcoes?.manterConectado ?? true;
  await setPersistence(
    auth,
    manterConectado ? browserLocalPersistence : browserSessionPersistence,
  );
}

/**
 * Lê o documento do usuário no Firestore (`users/{uid}`) e cria o perfil
 * inicial de forma idempotente quando ele não existe.
 *
 * Enquanto a callable `garantirPerfil` não estiver publicada, esta é a única
 * exceção autorizada em `firestore.rules`: o próprio usuário pode criar o
 * próprio documento, sempre com `role = 'aluno'` e `updatedAt` do servidor.
 * Papéis administrativos continuam exclusivos de operação server-side.
 */
async function buscarPerfilNoFirestore(
  usuarioFirebase: User,
  nomePreferido?: string,
): Promise<Usuario> {
  const db = obterFirestore();
  const uid = usuarioFirebase.uid;
  const referencia = doc(db, 'users', uid);

  const dados = await runTransaction(db, async (transacao) => {
    const atual = await transacao.get(referencia);
    if (atual.exists()) {
      return atual.data() ?? ({} as DocumentData);
    }

    const email = (usuarioFirebase.email ?? '').trim().toLowerCase();
    const displayName =
      nomePreferido?.trim() ||
      usuarioFirebase.displayName?.trim() ||
      email.split('@')[0] ||
      'Usuário';

    transacao.set(referencia, {
      uid,
      email,
      displayName,
      role: 'aluno',
      updatedAt: serverTimestamp(),
    });

    return { uid, email, displayName, role: 'aluno' } satisfies DocumentData;
  });

  const papel = dados.role;

  if (!papelValido(papel)) {
    throw new ErroDeServico(
      'perfil-indisponivel',
      'Seu perfil não possui um nível de acesso válido.',
    );
  }

  const email =
    textoNaoVazio(dados.email, usuarioFirebase.email?.trim().toLowerCase()) ||
    '';
  const nome = textoNaoVazio(
    dados.displayName,
    usuarioFirebase.displayName?.trim() ||
      email.split('@')[0] ||
      'Usuário',
  );
  const fotoUrl = usuarioFirebase.photoURL?.trim() || undefined;

  return {
    uid,
    email,
    nome,
    papel,
    ...(fotoUrl ? { fotoUrl } : {}),
  };
}

export class AutenticacaoFirebase implements ServicoAutenticacao {
  readonly modo = 'firebase' as const;

  private operacaoExplicita = false;

  private perfilEmAndamento: { uid: string; promessa: Promise<Usuario> } | null = null;

  private carregarPerfil(
    usuarioFirebase: User,
    nomePreferido?: string,
  ): Promise<Usuario> {
    const emAndamento = this.perfilEmAndamento;
    if (emAndamento && emAndamento.uid === usuarioFirebase.uid) {
      return emAndamento.promessa;
    }

    const promessa = buscarPerfilNoFirestore(usuarioFirebase, nomePreferido);
    this.perfilEmAndamento = { uid: usuarioFirebase.uid, promessa };

    const limpar = () => {
      if (this.perfilEmAndamento?.promessa === promessa) {
        this.perfilEmAndamento = null;
      }
    };
    void promessa.then(limpar, limpar);

    return promessa;
  }

  async sessaoAtual(): Promise<Usuario | null> {
    const auth = obterAutenticacaoFirebase();
    await auth.authStateReady();

    if (!auth.currentUser) return null;

    try {
      return await this.carregarPerfil(auth.currentUser);
    } catch (erro) {
      throw traduzirErro(erro);
    }
  }

  async entrarComGoogle(opcoes?: OpcoesPersistencia): Promise<Usuario> {
    this.operacaoExplicita = true;

    try {
      const auth = obterAutenticacaoFirebase();
      await definirPersistencia(auth, opcoes);

      const provedor = new GoogleAuthProvider();
      const credencial = await signInWithPopup(auth, provedor);
      return await this.carregarPerfil(credencial.user);
    } catch (erro) {
      throw traduzirErro(erro);
    } finally {
      this.operacaoExplicita = false;
    }
  }

  async entrarComEmailSenha(
    credenciais: CredenciaisEmailSenha,
    opcoes?: OpcoesPersistencia,
  ): Promise<Usuario> {
    this.operacaoExplicita = true;

    try {
      const auth = obterAutenticacaoFirebase();
      await definirPersistencia(auth, opcoes);

      const credencial = await signInWithEmailAndPassword(
        auth,
        credenciais.email.trim(),
        credenciais.senha,
      );

      return await this.carregarPerfil(credencial.user);
    } catch (erro) {
      throw traduzirErro(erro);
    } finally {
      this.operacaoExplicita = false;
    }
  }

  async cadastrarComEmailSenha(
    dados: DadosCadastroConta,
    opcoes?: OpcoesPersistencia,
  ): Promise<Usuario> {
    this.operacaoExplicita = true;

    try {
      const auth = obterAutenticacaoFirebase();
      await definirPersistencia(auth, opcoes ?? { manterConectado: true });

      const credencial = await createUserWithEmailAndPassword(
        auth,
        dados.email.trim(),
        dados.senha,
      );

      const nome = dados.nome.trim();
      if (nome) {
        try {
          await updateProfile(credencial.user, { displayName: nome });
        } catch {
          // O perfil ainda usa o nome informado no cadastro como fallback.
        }
      }

      return await this.carregarPerfil(credencial.user, nome);
    } catch (erro) {
      throw traduzirErro(erro);
    } finally {
      this.operacaoExplicita = false;
    }
  }

  async recuperarSenha(email: string): Promise<void> {
    try {
      const auth = obterAutenticacaoFirebase();
      await sendPasswordResetEmail(auth, email.trim());
    } catch (erro) {
      if (codigoDoErro(erro) === 'auth/user-not-found') return;
      throw traduzirErro(erro);
    }
  }

  async entrarDemonstracao(): Promise<Usuario> {
    throw new ErroDeServico(
      'nao-configurado',
      'O modo demonstração não está disponível com o Firebase configurado.',
    );
  }

  async sair(): Promise<void> {
    await signOut(obterAutenticacaoFirebase());
  }

  assinar(
    ouvinte: (usuario: Usuario | null) => void,
    aoErro?: (erro: ErroDeServico) => void,
  ): () => void {
    return onAuthStateChanged(obterAutenticacaoFirebase(), (usuarioFirebase) => {
      if (!usuarioFirebase) {
        ouvinte(null);
        return;
      }

      if (this.operacaoExplicita) {
        return;
      }

      this.carregarPerfil(usuarioFirebase)
        .then((perfil) => ouvinte(perfil))
        .catch((erro: unknown) => {
          if (aoErro) {
            aoErro(traduzirErro(erro));
            return;
          }
          ouvinte(null);
        });
    });
  }
}
