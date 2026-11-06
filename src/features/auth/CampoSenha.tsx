import { useState, type KeyboardEvent, type Ref } from 'react';
import { Icone } from '@/components/Icone';
import { Campo } from '@/components/ui/Campo';

interface Props {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string | null;
  ajuda?: string | null;
  autoComplete: 'current-password' | 'new-password';
  disabled?: boolean;
  obrigatorio?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}

/**
 * Campo de senha com controle de visibilidade e aviso de Caps Lock.
 * O valor e o estado continuam sob responsabilidade do formulário.
 */
export function CampoSenha({
  id,
  rotulo,
  valor,
  aoMudar,
  erro,
  ajuda,
  autoComplete,
  disabled,
  obrigatorio,
  inputRef,
}: Props) {
  const [visivel, setVisivel] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const verificarCapsLock = (evento: KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(evento.getModifierState('CapsLock'));
  };

  const descritos = [
    ...(erro ? [`${id}-erro`] : []),
    ...(ajuda && !erro ? [`${id}-ajuda`] : []),
    ...(capsLock ? [`${id}-caps`] : []),
  ];

  return (
    <Campo
      id={id}
      rotulo={rotulo}
      {...(obrigatorio ? { obrigatorio: true } : {})}
      {...(erro ? { erro } : {})}
      {...(ajuda ? { ajuda } : {})}
    >
      <div className="campo-senha">
        <input
          ref={inputRef}
          id={id}
          className="campo__controle"
          type={visivel ? 'text' : 'password'}
          value={valor}
          onChange={(evento) => aoMudar(evento.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          required={obrigatorio}
          spellCheck={false}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descritos.length > 0 ? descritos.join(' ') : undefined}
          onKeyDown={verificarCapsLock}
          onKeyUp={verificarCapsLock}
          onBlur={() => setCapsLock(false)}
        />
        <button
          type="button"
          className="campo-senha__alternar"
          onClick={() => setVisivel((atual) => !atual)}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visivel}
          aria-controls={id}
          disabled={disabled}
        >
          <Icone nome={visivel ? 'olho-fechado' : 'olho'} tamanho={18} />
        </button>
      </div>

      {capsLock ? (
        <span className="campo-senha__aviso" id={`${id}-caps`} role="status">
          Caps Lock está ativado.
        </span>
      ) : null}
    </Campo>
  );
}
