import type { Papel, Usuario } from '@/types/dominio';
import type { ServicoAutenticacao } from '@/services/contratos';
import { ErroDeServico } from '@/services/erros';
import { carregarSessaoDemo, salvarSessaoDemo } from '@/services/demo/armazenamento';
import { USUARIOS_DEMO } from '@/services/demo/dadosIniciais';

/**
 * Autenticação simulada do modo demonstração.
 * Não é um mecanismo de segurança: existe apenas para navegar pelas telas
 * enquanto a integração real com Firebase Auth e Cloud Functions não está ativa.
 */
export class AutenticacaoDemo implements ServicoAutenticacao {
  readonly modo = 'demo' as const;
  private ouvintes = new Set<(usuario: Usuario | null) => void>();

  private usuarioPorUid(uid: string | null): Usuario | null {
    if (!uid) return null;
    return USUARIOS_DEMO.find((usuario) => usuario.uid === uid) ?? null;
  }

  async sessaoAtual(): Promise<Usuario | null> {
    return this.usuarioPorUid(carregarSessaoDemo());
  }

  async entrarComGoogle(): Promise<Usuario> {
    throw new ErroDeServico(
      'nao-configurado',
      'O login com Google está disponível apenas com o Firebase configurado.',
      'Defina VITE_DATA_MODE=firebase e as variáveis públicas do Firebase.',
    );
  }

  async entrarComEmailSenha(): Promise<Usuario> {
    throw new ErroDeServico(
      'nao-configurado',
      'O acesso por e-mail e senha está disponível apenas com o Firebase configurado.',
      'Defina VITE_DATA_MODE=firebase e as variáveis públicas do Firebase.',
    );
  }

  async cadastrarComEmailSenha(): Promise<Usuario> {
    throw new ErroDeServico(
      'nao-configurado',
      'A criação de conta está disponível apenas com o Firebase configurado.',
      'Defina VITE_DATA_MODE=firebase e as variáveis públicas do Firebase.',
    );
  }

  async recuperarSenha(): Promise<void> {
    throw new ErroDeServico(
      'nao-configurado',
      'A recuperação de senha está disponível apenas com o Firebase configurado.',
      'Defina VITE_DATA_MODE=firebase e as variáveis públicas do Firebase.',
    );
  }

  async entrarDemonstracao(papel: Papel): Promise<Usuario> {
    const usuario = USUARIOS_DEMO.find((candidato) => candidato.papel === papel);
    if (!usuario) {
      throw new ErroDeServico(
        'nao-encontrado',
        'Não existe usuário de demonstração para este perfil.',
      );
    }
    salvarSessaoDemo(usuario.uid);
    this.ouvintes.forEach((ouvinte) => ouvinte(usuario));
    return usuario;
  }

  async sair(): Promise<void> {
    salvarSessaoDemo(null);
    this.ouvintes.forEach((ouvinte) => ouvinte(null));
  }

  assinar(ouvinte: (usuario: Usuario | null) => void): () => void {
    this.ouvintes.add(ouvinte);
    return () => {
      this.ouvintes.delete(ouvinte);
    };
  }
}
