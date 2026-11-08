/**
 * scripts/bootstrap-gestor.ts
 *
 * Bootstrap do primeiro gestor principal SEM firebase-admin.
 *
 * A pasta functions/ e o firebase-admin foram removidos deste escopo
 * (diretiva de remocao de dependencias server-side). Este script usa
 * exclusivamente a Firebase Authentication REST API (Identity Toolkit v1)
 * com as credenciais PUBLICAS do projeto (apiKey, authDomain, projectId),
 * que nao sao segredos e ja sao expostas ao front-end.
 *
 * O que faz:
 * 1. Resolve/cria a identidade do gestor no Firebase Auth via REST API.
 * 2. Obtem um ID token do usuario (signIn) para autenticacao.
 * 3. Emite um plano de acao para o operador concluir o perfil no Firestore:
 *    - criar users/{uid} com role = 'gestor'
 *    - gravar o historico de permissao (tipo 'permissao')
 *    Estas operacoes exigem privilegios de administrador (Admin SDK) e
 *    sao bloqueadas pelas regras de seguranca do Firestore para clientes,
 *    portanto NAO podem ser executadas por este script.
 *
 * Seguranca:
 * - Nenhuma credencial privada, service account ou chave Gemini e usada.
 * - A senha do gestor e fornecida pelo operador ou gerada temporariamente
 *   e exibida uma unica vez; nao e persistida.
 * - O script NAO grava no Firestore (nao pode, sem Admin SDK).
 *
 * Uso:
 *   npx tsx scripts/bootstrap-gestor.ts --email mascarenhasr02@gmail.com --confirmar
 *   npx tsx scripts/bootstrap-gestor.ts --email ... --senha ... --confirmar
 *   npx tsx scripts/bootstrap-gestor.ts --email ... --dry-run
 *   npx tsx scripts/bootstrap-gestor.ts --ajuda
 *
 * Variaveis de ambiente (copiar scripts/.env.example para scripts/.env,
 * .env esta ignorada pelo git):
 *   FIREBASE_API_KEY
 *   FIREBASE_AUTH_DOMAIN
 *   FIREBASE_PROJECT_ID
 *   GESTOR_INICIAL_EMAIL (opcional, padrao mascarenhasr02@gmail.com)
 */

import { createHash, randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'step';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
}

interface AuthUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  providerUserInfo: Array<{ providerId: string; rawId?: string }>;
  disabled?: boolean;
}

interface SignUpResult {
  uid: string;
  email: string;
  idToken: string;
  refreshToken: string;
  created: boolean;
}

interface BootstrapResult {
  ok: boolean;
  uid: string | null;
  email: string | null;
  identidadeCriada: boolean;
  identidadeExistente: boolean;
  perfilPendente: boolean;
  mensagem: string;
  proximosPassos: string[];
  codigoSaida: number;
}

// ---------------------------------------------------------------------------
// Argumentos de linha de comando
// ---------------------------------------------------------------------------

interface Argumentos {
  email: string | null;
  uid: string | null;
  senha: string | null;
  confirmar: boolean;
  dryRun: boolean;
  ajuda: boolean;
}

function parseArgs(argv: string[]): Argumentos {
  const args: Argumentos = {
    email: null,
    uid: null,
    senha: null,
    confirmar: false,
    dryRun: false,
    ajuda: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case '--email':
      case '-e':
        if (!next || next.startsWith('--')) {
          throw new Error(`O argumento ${arg} requer um valor.`);
        }
        args.email = next;
        i++;
        break;
      case '--uid':
        if (!next || next.startsWith('--')) {
          throw new Error(`O argumento ${arg} requer um valor.`);
        }
        args.uid = next;
        i++;
        break;
      case '--senha':
      case '-p':
        if (!next || next.startsWith('--')) {
          throw new Error(`O argumento ${arg} requer um valor.`);
        }
        args.senha = next;
        i++;
        break;
      case '--confirmar':
      case '-y':
        args.confirmar = true;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--ajuda':
      case '-h':
      case '--help':
        args.ajuda = true;
        break;
      default:
        if (!arg.startsWith('--') && !arg.startsWith('-')) {
          // Ignora o nome do script (process.argv[1]).
          continue;
        }
        throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }

  return args;
}

function exibirAjuda(): void {
  console.log(`
Uso: npx tsx scripts/bootstrap-gestor.ts [opcoes]

Opcoes:
  --email, -e <email>   E-mail do gestor principal (obrigatorio).
  --uid <uid>           UID do usuario no Firebase Auth (opcional, somente referencia).
  --senha, -p <senha>   Senha do usuario. Se omitida, e gerada uma senha temporaria
                        que e exibida uma unica vez.
  --confirmar, -y       Obrigatorio para aplicar a criacao/alteracao.
  --dry-run             Valida a entrada e a conectividade sem alterar nada.
  --ajuda, -h           Exibe esta ajuda.

Variaveis de ambiente (scripts/.env, ignorado pelo git):
  FIREBASE_API_KEY       Chave publica do projeto Firebase.
  FIREBASE_AUTH_DOMAIN   Dominio de autenticacao do projeto.
  FIREBASE_PROJECT_ID    ID do projeto Firebase.
  GESTOR_INICIAL_EMAIL   E-mail padrao do gestor (mascarenhasr02@gmail.com).

Exemplo:
  npx tsx scripts/bootstrap-gestor.ts \\
    --email mascarenhasr02@gmail.com \\
    --senha MinhaSenhaForte123 \\
    --confirmar

Apos o script, conclua manualmente (ambiente com Admin SDK ou Console do Firebase):
  1. Criar users/{uid} com role = 'gestor'.
  2. Gravar o historico de permissao (tipo 'permissao') na mesma transacao.
`);
}

// ---------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------

function log(nivel: LogLevel, mensagem: string, detalhe?: unknown): void {
  const prefixos: Record<LogLevel, string> = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    success: '✅',
    step: '▶️',
  };
  const hora = new Date().toISOString();
  const linha = `[${hora}] ${prefixos[nivel]} ${mensagem}`;
  if (detalhe !== undefined) {
    console.log(linha);
    console.log(JSON.stringify(detalhe, null, 2));
  } else {
    console.log(linha);
  }
}

// ---------------------------------------------------------------------------
// Firebase Authentication REST API (Identity Toolkit v1)
// ---------------------------------------------------------------------------

class FirebaseAuthClient {
  private readonly baseUrl: string;

  constructor(private readonly config: FirebaseConfig) {
    this.baseUrl = `https://identitytoolkit.googleapis.com/v1/accounts`;
  }

  private async request<T>(
    endpoint: string,
    body: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}?key=${encodeURIComponent(this.config.apiKey)}`;
    const resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Sinaliza que nao e uma chamada de navegador; uso exclusivo de script de operador.
    });

    const texto = await resposta.text();
    let dados: unknown;
    try {
      dados = texto.length > 0 ? JSON.parse(texto) : {};
    } catch {
      dados = { raw: texto };
    }

    if (!resposta.ok) {
      const erroFirebase = dados as { error?: { message?: string; code?: number } };
      const mensagem =
        erroFirebase.error?.message ||
        `HTTP ${resposta.status}`;
      const erro = new Error(
        `Firebase Auth REST (${endpoint}): ${mensagem}`
      ) as Error & { status?: number; codigoFirebase?: string };
      erro.status = resposta.status;
      erro.codigoFirebase = erroFirebase.error?.message;
      throw erro;
    }

    return dados as T;
  }

  async getAccountInfo(email: string): Promise<AuthUser | null> {
    const dados = await this.request<{
      users?: Array<{
        localId: string;
        email: string;
        emailVerified: boolean;
        providerUserInfo?: Array<{ providerId: string; rawId?: string }>;
        disabled?: boolean;
      }>;
    }>(':getAccountInfo', { email: [email] });

    const usuario = dados.users?.[0];
    if (!usuario) {
      return null;
    }

    return {
      uid: usuario.localId,
      email: usuario.email,
      emailVerified: usuario.emailVerified ?? false,
      providerUserInfo: usuario.providerUserInfo ?? [],
      disabled: usuario.disabled,
    };
  }

  async signUp(email: string, senha: string): Promise<SignUpResult> {
    const dados = await this.request<{
      localId: string;
      email: string;
      idToken: string;
      refreshToken: string;
    }>(':signUp', { email, password: senha, returnSecureToken: true });

    return {
      uid: dados.localId,
      email: dados.email,
      idToken: dados.idToken,
      refreshToken: dados.refreshToken,
      created: true,
    };
  }

  async signInWithPassword(email: string, senha: string): Promise<{
    uid: string;
    email: string;
    idToken: string;
  }> {
    const dados = await this.request<{
      localId: string;
      email: string;
      idToken: string;
    }>(':signInWithPassword', { email, password: senha, returnSecureToken: true });

    return {
      uid: dados.localId,
      email: dados.email,
      idToken: dados.idToken,
    };
  }
}

// ---------------------------------------------------------------------------
// Validacao de entrada
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarEmail(email: string): void {
  if (!EMAIL_REGEX.test(email)) {
    throw new Error(`E-mail invalido: ${email}`);
  }
}

function gerarSenhaTemporaria(tamanho = 24): string {
  return randomBytes(tamanho).toString('base64url');
}

function hashParaLog(senha: string): string {
  return createHash('sha256').update(senha).digest('hex').slice(0, 12);
}

// ---------------------------------------------------------------------------
// Carregamento de configuracao
// ---------------------------------------------------------------------------

function carregarConfig(): FirebaseConfig {
  const apiKey =
    process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '';
  const authDomain =
    process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || '';
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '';

  const faltando: string[] = [];
  if (!apiKey) faltando.push('FIREBASE_API_KEY');
  if (!authDomain) faltando.push('FIREBASE_AUTH_DOMAIN');
  if (!projectId) faltando.push('FIREBASE_PROJECT_ID');

  if (faltando.length > 0) {
    throw new Error(
      `Variaveis de ambiente nao configuradas: ${faltando.join(', ')}. ` +
        'Copie scripts/.env.example para scripts/.env e preencha os valores do Console do Firebase.'
    );
  }

  return { apiKey, authDomain, projectId };
}

function emailPadrao(): string {
  return process.env.GESTOR_INICIAL_EMAIL ?? 'mascarenhasr02@gmail.com';
}

// ---------------------------------------------------------------------------
// Operacao principal
// ---------------------------------------------------------------------------

async function bootstrapGestor(args: Argumentos): Promise<BootstrapResult> {
  const proximosPassos: string[] = [];

  // 1. Validacao de entrada
  const email = args.email ?? emailPadrao();
  validarEmail(email);

  const senha = args.senha ?? gerarSenhaTemporaria();
  const senhaFoiGerada = args.senha == null;

  log('info', 'Iniciando bootstrap do gestor principal', {
    email,
    uidInformado: args.uid ?? null,
    senhaGerada: senhaFoiGerada,
    dryRun: args.dryRun,
    confirmar: args.confirmar,
  });

  if (args.dryRun) {
    log('warn', 'Modo dry-run: nenhuma alteracao sera aplicada.');
  }

  if (!args.confirmar && !args.dryRun) {
    log('error', 'O argumento --confirmar e obrigatorio para aplicar.');
    return {
      ok: false,
      uid: null,
      email: null,
      identidadeCriada: false,
      identidadeExistente: false,
      perfilPendente: true,
      mensagem: 'Confirmacao ausente. Use --confirmar para aplicar.',
      proximosPassos: [
        'Execute novamente com --confirmar para aplicar a operacao.',
      ],
      codigoSaida: 1,
    };
  }

  // 2. Carrega configuracao do Firebase
  let config: FirebaseConfig;
  try {
    config = carregarConfig();
  } catch (erro) {
    log('error', (erro as Error).message);
    return {
      ok: false,
      uid: null,
      email: null,
      identidadeCriada: false,
      identidadeExistente: false,
      perfilPendente: true,
      mensagem: (erro as Error).message,
      proximosPassos: [
        'Copie scripts/.env.example para scripts/.env e preencha FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN e FIREBASE_PROJECT_ID.',
      ],
      codigoSaida: 1,
    };
  }

  const auth = new FirebaseAuthClient(config);

  // 3. Resolve/cria a identidade no Firebase Auth
  let usuario: AuthUser | null = null;
  let identidadeCriada = false;

  try {
    usuario = await auth.getAccountInfo(email);
  } catch (erro) {
    log('error', 'Falha ao consultar o usuario no Firebase Auth', erro);
    return {
      ok: false,
      uid: null,
      email,
      identidadeCriada: false,
      identidadeExistente: false,
      perfilPendente: true,
      mensagem: 'Nao foi possível consultar o usuario no Firebase Auth.',
      proximosPassos: [
        'Verifique FIREBASE_API_KEY e a conectividade com o projeto Firebase.',
        'Confirme que a API Identity Toolkit esta ativada no projeto.',
      ],
      codigoSaida: 1,
    };
  }

  if (usuario) {
    log('info', 'Usuario ja existe no Firebase Auth', {
      uid: usuario.uid,
      email: usuario.email,
      emailVerificado: usuario.emailVerified,
      desativado: usuario.disabled ?? false,
    });

    if (args.uid && args.uid !== usuario.uid) {
      log('error', 'O UID informado nao corresponde ao usuario resolvido por e-mail.', {
        uidInformado: args.uid,
        uidResolvido: usuario.uid,
      });
      return {
        ok: false,
        uid: usuario.uid,
        email,
        identidadeCriada: false,
        identidadeExistente: true,
        perfilPendente: true,
        mensagem: 'UID informado nao corresponde ao usuario do e-mail.',
        proximosPassos: [
          'Execute sem --uid ou informe o UID correto resolvido pelo e-mail.',
        ],
        codigoSaida: 1,
      };
    }

    if (usuario.disabled) {
      log('error', 'A conta do Firebase Auth esta desativada.', { uid: usuario.uid });
      return {
        ok: false,
        uid: usuario.uid,
        email,
        identidadeCriada: false,
        identidadeExistente: true,
        perfilPendente: true,
        mensagem: 'A conta do Firebase Auth esta desativada.',
        proximosPassos: [
          'Reative a conta no Console do Firebase > Autenticacao antes de prosseguir.',
        ],
        codigoSaida: 1,
      };
    }

    identidadeCriada = false;
  } else {
    if (!args.confirmar) {
      log('error', 'Usuario nao encontrado e --confirmar nao foi informado.');
      return {
        ok: false,
        uid: null,
        email,
        identidadeCriada: false,
        identidadeExistente: false,
        perfilPendente: true,
        mensagem: 'Usuario nao encontrado no Firebase Auth. Use --confirmar para criar.',
        proximosPassos: [
          'Execute novamente com --confirmar para criar a identidade no Firebase Auth.',
        ],
        codigoSaida: 1,
      };
    }

    log('step', 'Criando identidade no Firebase Auth', { email });
    try {
      const resultado = await auth.signUp(email, senha);
      log('success', 'Identidade criada no Firebase Auth', {
        uid: resultado.uid,
        email: resultado.email,
      });
      usuario = {
        uid: resultado.uid,
        email: resultado.email,
        emailVerified: false,
        providerUserInfo: [{ providerId: 'password', rawId: email }],
      };
      identidadeCriada = true;
    } catch (erro) {
      log('error', 'Falha ao criar a identidade no Firebase Auth', erro);
      return {
        ok: false,
        uid: null,
        email,
        identidadeCriada: false,
        identidadeExistente: false,
        perfilPendente: true,
        mensagem: 'Nao foi possivel criar a identidade no Firebase Auth.',
        proximosPassos: [
          (erro as Error).message,
          'Verifique se a senha atende aos requisitos do Firebase (minimo 6 caracteres).',
        ],
        codigoSaida: 1,
      };
    }
  }

  // 4. Obtem ID token para autenticacao (informativo; o script nao grava no Firestore)
  let idToken: string | null = null;
  if (senha) {
    try {
      const sessao = await auth.signInWithPassword(email, senha);
      idToken = sessao.idToken;
      log('info', 'Sessao autenticada obtida (idToken) para o usuario', {
        uid: sessao.uid,
      });
    } catch (erro) {
      log('warn', 'Nao foi possivel obter o idToken via signInWithPassword', {
        motivo: (erro as Error).message,
      });
    }
  }

  // 5. Plano de acao para o perfil no Firestore (nao executado por este script)
  log('warn', 'Perfil no Firestore NAO pode ser gravado por este script.', {
    motivo:
      'As regras de seguranca do Firestore bloqueiam a escrita em users/{uid} com role = \'gestor\' ' +
      'para clientes, e a definicao de custom claims exige o Admin SDK (removido deste escopo).',
  });

  proximosPassos.push(
    `1. No Console do Firebase > Autenticacao, confirme que o usuario ${email} (uid ${usuario.uid}) existe.`
  );
  proximosPassos.push(
    '2. Em um ambiente com o Admin SDK (ou via Console do Firebase > Firestore), crie o documento:'
  );
  proximosPassos.push(`   users/${usuario.uid} = { uid: '${usuario.uid}', email: '${email.toLowerCase()}', displayName: '${email.split('@')[0] || 'Gestor'}', role: 'gestor', updatedAt: <serverTimestamp> }`);
  proximosPassos.push(
    '3. Na mesma transacao, grave o historico de permissao:'
  );
  proximosPassos.push(
    `   historico/{auto-id} = { tipo: 'permissao', entidade: 'users', entidadeId: '${usuario.uid}', entidadeNome: '${email.split('@')[0] || 'Gestor'}', descricao: 'Papel atribuído: gestor (bootstrap)', alteracao: { antes: {}, depois: { role: 'gestor' } }, responsavelId: 'script-bootstrap', responsavelNome: 'Bootstrap Gestor', responsavelEmail: '${email}', timestamp: <serverTimestamp> }`
  );
  proximosPassos.push(
    '4. Valide que users/${usuario.uid}.role === \'gestor\' antes de liberar o acesso ao sistema.'
  );

  if (senhaFoiGerada) {
    proximosPassos.push(
      `5. SENHA TEMPORARIA (exibida so agora): ${senha}. `
        + 'Informe ao gestor para alterar no primeiro login. Hash (sha256, primeiros 12): '
        + hashParaLog(senha)
    );
  } else {
    proximosPassos.push(
      '5. A senha fornecida foi usada para autenticar a identidade; não é persistida.'
    );
  }

  log('success', 'Bootstrap de identidade concluído', {
    uid: usuario.uid,
    email: usuario.email,
    identidadeCriada,
    identidadeExistente: !identidadeCriada,
    perfilPendente: true,
  });

  return {
    ok: true,
    uid: usuario.uid,
    email: usuario.email,
    identidadeCriada,
    identidadeExistente: !identidadeCriada,
    perfilPendente: true,
    mensagem:
      'Identidade do gestor resolvida/criada no Firebase Auth. O perfil no Firestore ' +
      'precisa ser concluido manualmente (veja proximos passos).',
    proximosPassos,
    codigoSaida: 0,
  };
}

// ---------------------------------------------------------------------------
// Ponto de entrada
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let args: Argumentos;

  try {
    args = parseArgs(argv);
  } catch (erro) {
    console.error(`❌ ${(erro as Error).message}`);
    exibirAjuda();
    process.exit(2);
  }

  if (args.ajuda) {
    exibirAjuda();
    process.exit(0);
  }

  let resultado: BootstrapResult;
  try {
    resultado = await bootstrapGestor(args);
  } catch (erro) {
    log('error', 'Falha inesperada durante o bootstrap', erro);
    console.error('Detalhe:', (erro as Error).message);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('RESULTADO DO BOOTSTRAP DO GESTOR');
  console.log('========================================');
  console.log(`OK:             ${resultado.ok}`);
  console.log(`UID:            ${resultado.uid ?? '-'}`);
  console.log(`E-mail:         ${resultado.email ?? '-'}`);
  console.log(`Identidade criada:  ${resultado.identidadeCriada}`);
  console.log(`Identidade existente: ${resultado.identidadeExistente}`);
  console.log(`Perfil pendente:    ${resultado.perfilPendente}`);
  console.log(`Mensagem:       ${resultado.mensagem}`);
  console.log('----------------------------------------');
  console.log('PROXIMOS PASSOS:');
  resultado.proximosPassos.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  console.log('========================================\n');

  process.exit(resultado.codigoSaida);
}

main().catch((erro) => {
  console.error('❌ Erro fatal:', (erro as Error).message);
  process.exit(1);
});
