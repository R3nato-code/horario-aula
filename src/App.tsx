import { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { EstadoCarregando } from '@/components/ui/Estados';
import { useAutenticacao } from '@/app/ContextoAutenticacao';
import { useFavoritos, ProvedorFavoritos } from '@/app/ContextoFavoritos';
import { useToast } from '@/app/ContextoToast';
import { substituirRota, useRotaAtual } from '@/app/roteamento';
import { podeAdministrar, ehGestor } from '@/lib/constantes';
import { LoginPage } from '@/features/auth/LoginPage';
import { ConsultaTurmasPage } from '@/features/consulta/ConsultaTurmasPage';
import { TurmaHorarioPage } from '@/features/consulta/TurmaHorarioPage';
import { ConsultaProfessoresPage } from '@/features/consulta/ConsultaProfessoresPage';
import { ProfessorHorarioPage } from '@/features/consulta/ProfessorHorarioPage';
import { FavoritosPage } from '@/features/favoritos/FavoritosPage';
import { PainelPage } from '@/features/painel/PainelPage';
import {
  DisciplinasAdminPage,
  ProfessoresAdminPage,
  TurmasAdminPage,
} from '@/features/painel/CadastrosAdminPage';
import { ArquivadosPage } from '@/features/painel/ArquivadosPage';
import { HorariosAdminPage } from '@/features/painel/HorariosAdminPage';
import { ConfiguracaoPage } from '@/features/painel/ConfiguracaoPage';
import { HistoricoPage } from '@/features/painel/HistoricoPage';
import { AcessoNegadoPage, NaoEncontradaPage } from '@/features/sistema/PaginasSistema';

function TelaCarregando() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        backgroundColor: 'var(--papel)',
      }}
    >
      <div className="empilhado empilhado--compacto" style={{ alignItems: 'center' }}>
        <img src="/favicon.svg" width="52" height="52" alt="" />
        <span className="carregando">
          <span className="carregando__marca" aria-hidden="true" />
          Carregando o sistema…
        </span>
      </div>
    </div>
  );
}

function Rotas() {
  const rota = useRotaAtual();
  const { usuario } = useAutenticacao();
  const segmentos = rota.split('/').filter(Boolean);
  const administra = usuario ? podeAdministrar(usuario.papel) : false;
  const gestor = usuario ? ehGestor(usuario.papel) : false;

  // Após o login, a rota inicial respeita o perfil. Links profundos são
  // preservados para não perder o contexto de quem já estava navegando.
  useEffect(() => {
    if (rota === '/' || rota === '/entrar') {
      substituirRota(administra ? '/painel' : '/consulta');
    }
  }, [rota, administra]);

  if (rota === '/' || rota === '/entrar') {
    return (
      <EstadoCarregando texto={administra ? 'Abrindo o painel…' : 'Abrindo a consulta…'} />
    );
  }

  if (segmentos[0] === 'consulta') {
    if (segmentos.length === 1) return <ConsultaTurmasPage />;
    if (segmentos[1] === 'turma' && segmentos[2]) {
      return <TurmaHorarioPage turmaId={decodeURIComponent(segmentos[2])} />;
    }
    if (segmentos[1] === 'professor' && segmentos.length === 2) {
      return <ConsultaProfessoresPage />;
    }
    if (segmentos[1] === 'professor' && segmentos[2]) {
      return <ProfessorHorarioPage professorId={decodeURIComponent(segmentos[2])} />;
    }
    return <NaoEncontradaPage />;
  }

  if (segmentos[0] === 'favoritos' && segmentos.length === 1) return <FavoritosPage />;

  if (segmentos[0] === 'painel') {
    if (!administra) return <AcessoNegadoPage />;
    if (segmentos.length === 1) return <PainelPage />;
    if (segmentos[1] === 'professores' && segmentos.length === 2) return <ProfessoresAdminPage />;
    if (segmentos[1] === 'disciplinas' && segmentos.length === 2) return <DisciplinasAdminPage />;
    if (segmentos[1] === 'turmas' && segmentos.length === 2) return <TurmasAdminPage />;
    if (segmentos[1] === 'arquivados' && segmentos.length === 2) return <ArquivadosPage />;
    if (segmentos[1] === 'horarios' && segmentos.length === 2) return <HorariosAdminPage />;
    if (segmentos[1] === 'horarios' && segmentos[2]) {
      return <HorariosAdminPage turmaIdInicial={decodeURIComponent(segmentos[2])} />;
    }
    if (segmentos[1] === 'configuracao' && segmentos.length === 2) {
      if (!gestor) return <AcessoNegadoPage />;
      return <ConfiguracaoPage />;
    }
    if (segmentos[1] === 'historico' && segmentos.length === 2) return <HistoricoPage />;
    return <NaoEncontradaPage />;
  }

  return <NaoEncontradaPage />;
}

function ConteudoComSessao() {
  const { notificar } = useToast();
  const { carregando: carregandoFavoritos, erro: erroFavoritos } = useFavoritos();

  useEffect(() => {
    if (erroFavoritos) notificar('erro', `Favoritos: ${erroFavoritos}`);
  }, [erroFavoritos, notificar]);

  if (carregandoFavoritos) {
    return <TelaCarregando />;
  }

  return (
    <AppShell>
      <Rotas />
    </AppShell>
  );
}

function ConteudoAutenticado() {
  const { status, usuario } = useAutenticacao();

  if (status === 'carregando') {
    return <TelaCarregando />;
  }

  if (!usuario) {
    return <LoginPage />;
  }

  // Favoritos são por usuário: o provedor só existe durante uma sessão
  // autenticada, o que descarta o estado ao sair.
  return (
    <ProvedorFavoritos>
      <ConteudoComSessao />
    </ProvedorFavoritos>
  );
}

export function App() {
  return <ConteudoAutenticado />;
}
