import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icone } from '@/components/Icone';

type TipoToast = 'sucesso' | 'erro' | 'info';

interface Toast {
  id: number;
  tipo: TipoToast;
  mensagem: string;
}

interface ContextoToastValor {
  notificar: (tipo: TipoToast, mensagem: string) => void;
}

const ContextoToast = createContext<ContextoToastValor | null>(null);

export function ProvedorToast({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const proximoId = useRef(1);
  const temporizadores = useRef<Set<number>>(new Set());

  const remover = useCallback((id: number) => {
    setToasts((atuais) => atuais.filter((toast) => toast.id !== id));
  }, []);

  const notificar = useCallback(
    (tipo: TipoToast, mensagem: string) => {
      const id = proximoId.current;
      proximoId.current += 1;
      setToasts((atuais) => [...atuais, { id, tipo, mensagem }]);
      const temporizador = window.setTimeout(() => {
        remover(id);
        temporizadores.current.delete(temporizador);
      }, 6000);
      temporizadores.current.add(temporizador);
    },
    [remover],
  );

  const valor = useMemo(() => ({ notificar }), [notificar]);

  return (
    <ContextoToast.Provider value={valor}>
      {children}
      <div className="toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tipo}`} role="status">
            <Icone
              nome={toast.tipo === 'sucesso' ? 'check' : toast.tipo === 'erro' ? 'alerta' : 'info'}
              tamanho={16}
            />
            <span>{toast.mensagem}</span>
            <button
              type="button"
              className="botao botao--icone botao--pequeno toast__fechar"
              onClick={() => remover(toast.id)}
              aria-label="Fechar aviso"
            >
              <Icone nome="fechar" tamanho={14} />
            </button>
          </div>
        ))}
      </div>
    </ContextoToast.Provider>
  );
}

export function useToast(): ContextoToastValor {
  const contexto = useContext(ContextoToast);
  if (!contexto) {
    throw new Error('useToast deve ser usado dentro de ProvedorToast.');
  }
  return contexto;
}
