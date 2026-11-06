import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

/**
 * Inicialização do Firebase restrita a configuração pública.
 * Nenhuma chave privada, service account ou chave da Gemini API pertence a este módulo.
 */
const configuracaoPublica: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

export const firebaseConfigurado = Boolean(
  configuracaoPublica.apiKey &&
    configuracaoPublica.authDomain &&
    configuracaoPublica.projectId &&
    configuracaoPublica.appId,
);

let aplicacao: FirebaseApp | null = null;

export function obterAplicacaoFirebase(): FirebaseApp {
  if (!firebaseConfigurado) {
    throw new Error('A configuração pública do Firebase não está completa.');
  }
  if (!aplicacao) {
    aplicacao = getApps()[0] ?? initializeApp(configuracaoPublica);
  }
  return aplicacao;
}

export function obterAutenticacaoFirebase(): Auth {
  return getAuth(obterAplicacaoFirebase());
}

export function obterFirestore(): Firestore {
  return getFirestore(obterAplicacaoFirebase());
}

/**
 * Região das Cloud Functions callable.
 *
 * O backend usa `FUNCTIONS_REGION` com padrão `southamerica-east1`
 * (`functions/src/core/config.ts`). A variável pública apenas espelha a região
 * para que o cliente encontre as funções callable; não contém segredo.
 *
 * O perfil do usuário (`users/{uid}.role`) é lido diretamente no Firestore
 * pelo serviço de autenticação; não há mais chamada callable para esse fim.
 */
const regiaoFuncoes = import.meta.env.VITE_FUNCTIONS_REGION?.trim() || 'southamerica-east1';

export function obterFuncoesFirebase(): Functions {
  return getFunctions(obterAplicacaoFirebase(), regiaoFuncoes);
}
