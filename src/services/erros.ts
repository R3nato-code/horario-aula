export type CodigoErroServico =
  | 'nao-configurado'
  | 'nao-encontrado'
  | 'validacao'
  | 'conflito-professor'
  | 'dependencias'
  | 'permissao'
  | 'perfil-indisponivel'
  | 'desconhecido';

export class ErroDeServico extends Error {
  readonly codigo: CodigoErroServico;
  readonly detalhes: string | null;

  constructor(codigo: CodigoErroServico, mensagem: string, detalhes?: string) {
    super(mensagem);
    this.name = 'ErroDeServico';
    this.codigo = codigo;
    this.detalhes = detalhes ?? null;
  }
}

export function ehErroDeServico(erro: unknown): erro is ErroDeServico {
  return erro instanceof ErroDeServico;
}

export function mensagemDoErro(erro: unknown): string {
  if (ehErroDeServico(erro)) return erro.message;
  if (erro instanceof Error && erro.message) return erro.message;
  return 'Não foi possível concluir a operação. Tente novamente.';
}
