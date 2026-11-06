import type { SVGProps } from 'react';

export type NomeIcone =
  | 'calendario'
  | 'grade'
  | 'usuarios'
  | 'livro'
  | 'predio'
  | 'relogio'
  | 'historico'
  | 'sino'
  | 'mensagem'
  | 'estrela'
  | 'config'
  | 'menu'
  | 'fechar'
  | 'busca'
  | 'mais'
  | 'editar'
  | 'arquivar'
  | 'reativar'
  | 'excluir'
  | 'check'
  | 'alerta'
  | 'info'
  | 'sair'
  | 'entrar'
  | 'atualizar'
  | 'escudo'
  | 'seta-direita'
  | 'seta-esquerda'
  | 'pessoa'
  | 'painel'
  | 'sincronizar'
  | 'olho'
  | 'olho-fechado';

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  nome: NomeIcone;
  tamanho?: number;
  preenchido?: boolean;
}

export function Icone({ nome, tamanho = 18, preenchido = false, ...resto }: Props) {
  const comum = {
    width: tamanho,
    height: tamanho,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    ...resto,
  };

  switch (nome) {
    case 'calendario':
      return (
        <svg {...comum}>
          <rect x="3.5" y="5" width="17" height="15" />
          <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
        </svg>
      );
    case 'grade':
      return (
        <svg {...comum}>
          <rect x="3.5" y="4.5" width="17" height="15" />
          <path d="M3.5 9.5h17M9.2 4.5v15M14.8 4.5v15" />
        </svg>
      );
    case 'usuarios':
      return (
        <svg {...comum}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.8 19.2c0-3 2.3-5.2 5.2-5.2s5.2 2.2 5.2 5.2M16 5.4a2.8 2.8 0 0 1 0 5.4M17.2 14.4c1.9.5 3.2 2.3 3.2 4.4" />
        </svg>
      );
    case 'livro':
      return (
        <svg {...comum}>
          <path d="M4 5.2c2.7-1 5.3-1 8 0 2.7-1 5.3-1 8 0v13.6c-2.7-1-5.3-1-8 0-2.7-1-5.3-1-8 0Z" />
          <path d="M12 5.4v13.2" />
        </svg>
      );
    case 'predio':
      return (
        <svg {...comum}>
          <path d="M4 20.5V6l8-3 8 3v14.5M2.8 20.5h18.4" />
          <path d="M8 9h2M14 9h2M8 13h2M14 13h2M10 20.5v-4h4v4" />
        </svg>
      );
    case 'relogio':
      return (
        <svg {...comum}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case 'historico':
      return (
        <svg {...comum}>
          <path d="M4.2 10.4A8 8 0 1 1 4 12.6" />
          <path d="M3.5 5.2v5.2h5.2M12 7.5V12l3.4 2" />
        </svg>
      );
    case 'sino':
      return (
        <svg {...comum}>
          <path d="M6.2 10.5a5.8 5.8 0 0 1 11.6 0c0 5 2 6.2 2 6.2H4.2s2-1.2 2-6.2Z" />
          <path d="M9.7 20a2.4 2.4 0 0 0 4.6 0" />
        </svg>
      );
    case 'mensagem':
      return (
        <svg {...comum}>
          <path d="M4 5.5h16v11H9.5L4 20.5v-15Z" />
          <path d="M8 9.5h8M8 12.5h5" />
        </svg>
      );
    case 'estrela':
      return (
        <svg
          {...comum}
          fill={preenchido ? 'currentColor' : 'none'}
          stroke="currentColor"
        >
          <path d="m12 3.8 2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8L12 3.8Z" />
        </svg>
      );
    case 'config':
      return (
        <svg {...comum}>
          <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
          <circle cx="15" cy="7" r="2.2" />
          <circle cx="9" cy="17" r="2.2" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...comum}>
          <path d="M4 6.5h16M4 12h16M4 17.5h16" />
        </svg>
      );
    case 'fechar':
      return (
        <svg {...comum}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case 'busca':
      return (
        <svg {...comum}>
          <circle cx="10.8" cy="10.8" r="6.3" />
          <path d="m15.5 15.5 4.2 4.2" />
        </svg>
      );
    case 'mais':
      return (
        <svg {...comum}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'editar':
      return (
        <svg {...comum}>
          <path d="M4 20h4.2L19 9.2 15 5.2 4 16.2V20Z" />
          <path d="m13.5 6.7 3.9 3.9" />
        </svg>
      );
    case 'arquivar':
      return (
        <svg {...comum}>
          <path d="M3.5 5h17v4h-17zM5 9v11h14V9M9.5 13h5" />
        </svg>
      );
    case 'reativar':
      return (
        <svg {...comum}>
          <path d="M20.5 12a8.5 8.5 0 1 1-2.5-6" />
          <path d="M20.5 4.5V10H15" />
        </svg>
      );
    case 'excluir':
      return (
        <svg {...comum}>
          <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />
        </svg>
      );
    case 'check':
      return (
        <svg {...comum}>
          <path d="m5 12.5 4.5 4.5L19 7" />
        </svg>
      );
    case 'alerta':
      return (
        <svg {...comum}>
          <path d="M12 3.5 21 20H3Z" />
          <path d="M12 9v5M12 17.2v.3" />
        </svg>
      );
    case 'info':
      return (
        <svg {...comum}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 11v5M12 7.8v.3" />
        </svg>
      );
    case 'sair':
      return (
        <svg {...comum}>
          <path d="M14 4.5H5v15h9M10 12h11M18 8.5l3.5 3.5-3.5 3.5" />
        </svg>
      );
    case 'entrar':
      return (
        <svg {...comum}>
          <path d="M10 4.5H5v15h5M14 12h7M18 8.5l3.5 3.5-3.5 3.5" />
        </svg>
      );
    case 'atualizar':
      return (
        <svg {...comum}>
          <path d="M20 11a8 8 0 1 0-2.3 6.3" />
          <path d="M20 4.5V11h-6.5" />
        </svg>
      );
    case 'escudo':
      return (
        <svg {...comum}>
          <path d="M12 3.5 19.5 6v6c0 4.4-3.2 7.4-7.5 8.5C7.7 19.4 4.5 16.4 4.5 12V6Z" />
          <path d="m8.7 12 2.2 2.2 4.5-4.5" />
        </svg>
      );
    case 'seta-direita':
      return (
        <svg {...comum}>
          <path d="M5 12h14M14 7l5 5-5 5" />
        </svg>
      );
    case 'seta-esquerda':
      return (
        <svg {...comum}>
          <path d="M19 12H5M10 7l-5 5 5 5" />
        </svg>
      );
    case 'pessoa':
      return (
        <svg {...comum}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2" />
        </svg>
      );
    case 'painel':
      return (
        <svg {...comum}>
          <rect x="3.5" y="3.5" width="7" height="7" />
          <rect x="13.5" y="3.5" width="7" height="7" />
          <rect x="3.5" y="13.5" width="7" height="7" />
          <rect x="13.5" y="13.5" width="7" height="7" />
        </svg>
      );
    case 'sincronizar':
      return (
        <svg {...comum}>
          <path d="M4 9.5A8 8 0 0 1 18.5 7M20 5v5h-5M20 14.5A8 8 0 0 1 5.5 17M4 19v-5h5" />
        </svg>
      );
    case 'olho':
      return (
        <svg {...comum}>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.6" />
        </svg>
      );
    case 'olho-fechado':
      return (
        <svg {...comum}>
          <path d="m3 3 18 18" />
          <path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17.6 17.6 0 0 1-3.2 3.7M6.3 6.3C3.8 8.1 2.5 12 2.5 12s3.5 6 9.5 6a10 10 0 0 0 4.3-.9" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
      );
    default:
      return null;
  }
}
