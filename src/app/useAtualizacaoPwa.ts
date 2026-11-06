import { useCallback, useEffect, useState } from 'react';

/** Registra o service worker apenas em produção e informa quando há versão nova. */
export function useAtualizacaoPwa(): {
  atualizacaoDisponivel: boolean;
  aplicarAtualizacao: () => void;
} {
  const [trabalhadorPendente, setTrabalhadorPendente] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

    let cancelado = false;

    const observarInstalacao = (registro: ServiceWorkerRegistration) => {
      if (registro.waiting) {
        setTrabalhadorPendente(registro.waiting);
      }
      registro.addEventListener('updatefound', () => {
        const instalando = registro.installing;
        if (!instalando) return;
        instalando.addEventListener('statechange', () => {
          if (!cancelado && instalando.state === 'installed' && navigator.serviceWorker.controller) {
            setTrabalhadorPendente(instalando);
          }
        });
      });
    };

    navigator.serviceWorker
      .register('/sw.js')
      .then(observarInstalacao)
      .catch(() => {
        // A aplicação continua funcional sem service worker.
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const aplicarAtualizacao = useCallback(() => {
    if (!trabalhadorPendente) {
      window.location.reload();
      return;
    }
    const recarregar = () => window.location.reload();
    navigator.serviceWorker.addEventListener('controllerchange', recarregar, { once: true });
    trabalhadorPendente.postMessage({ type: 'SKIP_WAITING' });
    window.setTimeout(recarregar, 1500);
  }, [trabalhadorPendente]);

  return {
    atualizacaoDisponivel: trabalhadorPendente !== null,
    aplicarAtualizacao,
  };
}
