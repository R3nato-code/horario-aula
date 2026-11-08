import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

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


