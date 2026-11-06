import { useEffect } from 'react';
import { NOME_SISTEMA } from '@/lib/constantes';

export function useTituloPagina(titulo: string): void {
  useEffect(() => {
    document.title = `${titulo} | ${NOME_SISTEMA}`;
  }, [titulo]);
}
