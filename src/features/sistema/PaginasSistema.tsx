import { Icone } from '@/components/Icone';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { EstadoVazio } from '@/components/ui/Estados';
import { useTituloPagina } from '@/lib/useTituloPagina';

export function AcessoNegadoPage() {
  useTituloPagina('Acesso restrito');
  return (
    <>
      <CabecalhoPagina sobretitulo="Permissões" titulo="Acesso restrito" />
      <EstadoVazio
        titulo="Esta área é administrativa"
        texto="Seu perfil não possui permissão de interface para esta operação. A autorização definitiva é aplicada pelo servidor e pelas regras do Firestore."
        acao={
          <a className="botao botao--pequeno" href="#/consulta">
            <Icone nome="seta-esquerda" tamanho={15} />
            Voltar para a consulta
          </a>
        }
      />
    </>
  );
}

export function NaoEncontradaPage() {
  useTituloPagina('Página não encontrada');
  return (
    <>
      <CabecalhoPagina sobretitulo="Navegação" titulo="Página não encontrada" />
      <EstadoVazio
        titulo="O endereço informado não existe"
        texto="Verifique o endereço ou retorne para a consulta de horários."
        acao={
          <a className="botao botao--pequeno" href="#/consulta">
            <Icone nome="seta-esquerda" tamanho={15} />
            Ir para a consulta
          </a>
        }
      />
    </>
  );
}
