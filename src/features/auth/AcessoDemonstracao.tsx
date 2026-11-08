import { useState } from 'react';
import { Icone, type NomeIcone } from '@/components/Icone';
import { Alerta } from '@/components/ui/Alerta';
import { useAutenticacao } from '@/app/ContextoAutenticacao';
import { mensagemDoErro } from '@/services/erros';
import { ROTULOS_PAPEL } from '@/lib/constantes';
import type { Papel } from '@/types/dominio';

const DESCRICOES_PAPEL: Record<Papel, string> = {
  aluno: 'Consulta de horários, favoritos e notificações.',
  professor: 'Consulta de horários, favoritos e notificações.',
  admin: 'Gestão de cadastros, horários, configuração e histórico.',
  gestor: 'Acesso administrativo ampliado.',
};

const ICONES_PAPEL: Record<Papel, NomeIcone> = {
  aluno: 'pessoa',
  professor: 'livro',
  admin: 'escudo',
  gestor: 'config',
};

const ORDEM_PAPEIS: readonly Papel[] = ['aluno', 'professor', 'admin', 'gestor'];

export function AcessoDemonstracao() {
  const { entrarDemonstracao } = useAutenticacao();
  const [carregando, setCarregando] = useState<Papel | null>(null);
  const [falha, setFalha] = useState<string | null>(null);

  const entrarComo = async (papel: Papel) => {
    if (carregando) return;

    setFalha(null);
    setCarregando(papel);

    try {
      await entrarDemonstracao(papel);
    } catch (erro) {
      setFalha(mensagemDoErro(erro));
    } finally {
      setCarregando(null);
    }
  };

  return (
    <section className="login__demo" aria-labelledby="titulo-demonstracao">
      <p className="rotulo-secao">Ambiente de demonstração</p>
      <h3 id="titulo-demonstracao">Entrar com um perfil de teste</h3>
      <p className="login__texto">
        Escolha um perfil para explorar o sistema com dados de exemplo.
      </p>

      {falha ? (
        <div className="login__mensagens">
          <Alerta tipo="erro" titulo="Não foi possível entrar">
            {falha}
          </Alerta>
        </div>
      ) : null}

      <div className="login__opcoes">
        {ORDEM_PAPEIS.map((papel) => (
          <button
            key={papel}
            type="button"
            className="login__papel"
            onClick={() => void entrarComo(papel)}
            disabled={carregando !== null}
            aria-busy={carregando === papel}
          >
            <span className="login__papel-icone" aria-hidden="true">
              <Icone nome={ICONES_PAPEL[papel]} tamanho={19} />
            </span>
            <span>
              <span className="login__papel-nome">
                {ROTULOS_PAPEL[papel]}
                {carregando === papel ? ' — entrando…' : ''}
              </span>
              <span className="login__papel-descricao">{DESCRICOES_PAPEL[papel]}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
