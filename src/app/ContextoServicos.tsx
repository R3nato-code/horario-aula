import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Servicos } from '@/services/contratos';
import { obterServicos } from '@/app/servicos';

const ContextoServicos = createContext<Servicos | null>(null);

export function ProvedorServicos({ children }: { children: ReactNode }) {
  const servicos = useMemo(() => obterServicos(), []);
  return <ContextoServicos.Provider value={servicos}>{children}</ContextoServicos.Provider>;
}

export function useServicos(): Servicos {
  const servicos = useContext(ContextoServicos);
  if (!servicos) {
    throw new Error('useServicos deve ser usado dentro de ProvedorServicos.');
  }
  return servicos;
}
