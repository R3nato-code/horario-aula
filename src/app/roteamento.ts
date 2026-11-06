import { useCallback, useEffect, useState } from 'react';

function caminhoDaHash(): string {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return '/';
  return hash.startsWith('/') ? hash : `/${hash}`;
}

export function navegar(para: string): void {
  const destino = para.startsWith('/') ? para : `/${para}`;
  if (window.location.hash === `#${destino}`) return;
  window.location.hash = destino;
}

export function substituirRota(para: string): void {
  const destino = para.startsWith('/') ? para : `/${para}`;
  window.history.replaceState(null, '', `#${destino}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function useRotaAtual(): string {
  const [rota, setRota] = useState<string>(() => caminhoDaHash());

  useEffect(() => {
    const aoMudar = () => setRota(caminhoDaHash());
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);

  return rota;
}

export function segmentosDaRota(rota: string): string[] {
  return rota.split('/').filter(Boolean);
}

export function rotaAtiva(rota: string, prefixo: string): boolean {
  if (prefixo === '/') return rota === '/';
  return rota === prefixo || rota.startsWith(`${prefixo}/`);
}

export function useIrPara(): (para: string) => void {
  return useCallback((para: string) => {
    navegar(para);
  }, []);
}

export function rolarAoTopo(): void {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}
