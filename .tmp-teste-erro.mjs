// ../../../AppData/Local/Temp/opencode/verificacao-front/teste-erro-callable.ts
import { signInWithEmailAndPassword } from "firebase/auth";
import { httpsCallable } from "firebase/functions";

// src/lib/firebase/cliente.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
var configuracaoPublica = {
  apiKey: "AIzaSyD-MXsVeR-HHvGM125_t32xMjaOMcpQY8E",
  authDomain: "complementacao-horario-aula.firebaseapp.com",
  projectId: "complementacao-horario-aula",
  appId: "1:1078551640248:web:cb4287e4d1926793129c4d"
};
var firebaseConfigurado = Boolean(
  configuracaoPublica.apiKey && configuracaoPublica.authDomain && configuracaoPublica.projectId && configuracaoPublica.appId
);
var aplicacao = null;
function obterAplicacaoFirebase() {
  if (!firebaseConfigurado) {
    throw new Error("A configura\xE7\xE3o p\xFAblica do Firebase n\xE3o est\xE1 completa.");
  }
  if (!aplicacao) {
    aplicacao = getApps()[0] ?? initializeApp(configuracaoPublica);
  }
  return aplicacao;
}
function obterAutenticacaoFirebase() {
  return getAuth(obterAplicacaoFirebase());
}
var regiaoFuncoes = "southamerica-east1"?.trim() || "southamerica-east1";
function obterFuncoesFirebase() {
  return getFunctions(obterAplicacaoFirebase(), regiaoFuncoes);
}

// ../../../AppData/Local/Temp/opencode/verificacao-front/teste-erro-callable.ts
async function executar() {
  const auth = obterAutenticacaoFirebase();
  await signInWithEmailAndPassword(auth, process.env.TESTE_EMAIL ?? "", process.env.TESTE_SENHA ?? "");
  const chamar = httpsCallable(obterFuncoesFirebase(), "salvarAula");
  try {
    await chamar({ turmaId: "turma-1a", diaSemana: 1, periodo: 1, disciplinaId: "disc-matematica", professorId: "prof-edson-gaspar" });
    console.log("sucesso inesperado");
  } catch (erro) {
    const e = erro;
    console.log("code:", e.code);
    console.log("message:", JSON.stringify(e.message));
    console.log("details:", JSON.stringify(e.details));
  }
  await auth.signOut();
}
executar().catch((e) => {
  console.error(e);
  process.exit(1);
});
