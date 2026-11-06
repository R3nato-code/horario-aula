// src/services/firebase/autenticacaoFirebase.ts
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from "firebase/auth";
import {
  doc,
  runTransaction,
  serverTimestamp
} from "firebase/firestore";

// src/services/erros.ts
var ErroDeServico = class extends Error {
  codigo;
  detalhes;
  constructor(codigo, mensagem, detalhes) {
    super(mensagem);
    this.name = "ErroDeServico";
    this.codigo = codigo;
    this.detalhes = detalhes ?? null;
  }
};
function ehErroDeServico(erro) {
  return erro instanceof ErroDeServico;
}

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
function obterFirestore() {
  return getFirestore(obterAplicacaoFirebase());
}
var regiaoFuncoes = "southamerica-east1"?.trim() || "southamerica-east1";
function obterFuncoesFirebase() {
  return getFunctions(obterAplicacaoFirebase(), regiaoFuncoes);
}

// src/lib/constantes.ts
var NUMEROS_PERIODOS = [1, 2, 3, 4, 5, 6];
var HORARIOS_PADRAO = {
  abertura: "07:20",
  fechamento: "12:30",
  periodos: [
    { numero: 1, inicio: "07:20", fim: "08:10" },
    { numero: 2, inicio: "08:10", fim: "09:00" },
    { numero: 3, inicio: "09:00", fim: "09:45" },
    { numero: 4, inicio: "10:10", fim: "10:55" },
    { numero: 5, inicio: "10:55", fim: "11:45" },
    { numero: 6, inicio: "11:45", fim: "12:30" }
  ],
  intervalo: { inicio: "09:45", fim: "10:10" }
};

// src/lib/utilidades.ts
function criarIdAula(turmaId, diaSemana, periodo) {
  return `${turmaId}_${diaSemana}_${periodo}`;
}
function configuracaoInicial() {
  return {
    abertura: HORARIOS_PADRAO.abertura,
    fechamento: HORARIOS_PADRAO.fechamento,
    periodos: HORARIOS_PADRAO.periodos.map((periodo) => ({ ...periodo })),
    intervalo: { ...HORARIOS_PADRAO.intervalo },
    atualizadoEm: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function horarioDoPeriodo(configuracao, periodo) {
  const encontrado = configuracao.periodos.find((item) => item.numero === periodo);
  return encontrado ? { inicio: encontrado.inicio, fim: encontrado.fim } : { inicio: "--:--", fim: "--:--" };
}

// src/lib/firebase/conversoes.ts
function paraIso(valor) {
  if (typeof valor === "string") return valor;
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === "number") return new Date(valor).toISOString();
  const objeto = valor;
  if (objeto && typeof objeto.toDate === "function") {
    return objeto.toDate().toISOString();
  }
  if (objeto && typeof objeto.seconds === "number") {
    return new Date(objeto.seconds * 1e3).toISOString();
  }
  return "";
}
function texto(valor, padrao = "") {
  return typeof valor === "string" ? valor : padrao;
}
function textoNaoVazio(valor, padrao = "") {
  if (typeof valor !== "string") return padrao;
  const normalizado = valor.trim();
  return normalizado.length > 0 ? normalizado : padrao;
}
function diaSemanaValido(valor) {
  const numero = typeof valor === "number" ? valor : Number(valor);
  return Number.isInteger(numero) && numero >= 1 && numero <= 5 ? numero : null;
}
function periodoValido(valor) {
  const numero = typeof valor === "number" ? valor : Number(valor);
  return NUMEROS_PERIODOS.includes(numero) ? numero : null;
}
function statusCadastro(valor) {
  return valor === "arquivado" ? "arquivado" : "ativo";
}
function modalidadeCadastro(valor) {
  return valor === "tecnico" ? "tecnico" : "ensino-medio";
}
function periodosDoValor(valor) {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const mapa = item;
    const numero = periodoValido(mapa.numero);
    const inicio = textoNaoVazio(mapa.inicio);
    const fim = textoNaoVazio(mapa.fim);
    if (numero === null || !inicio || !fim) return [];
    return [{ numero, inicio, fim }];
  }).sort((a, b) => a.numero - b.numero);
}
function intervaloDoValor(valor) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const mapa = valor;
  const inicio = textoNaoVazio(mapa.inicio);
  const fim = textoNaoVazio(mapa.fim);
  return inicio && fim ? { inicio, fim } : null;
}
function configuracaoDoDocumento(dados) {
  const inicial = configuracaoInicial();
  const periodos = periodosDoValor(dados?.periodos);
  return {
    abertura: textoNaoVazio(dados?.abertura, inicial.abertura),
    fechamento: textoNaoVazio(dados?.fechamento, inicial.fechamento),
    periodos: periodos.length > 0 ? periodos : inicial.periodos,
    intervalo: dados && "intervalo" in dados ? intervaloDoValor(dados.intervalo) : inicial.intervalo,
    atualizadoEm: paraIso(dados?.atualizadoEm) || inicial.atualizadoEm
  };
}
function valorJson(valor) {
  if (valor === null || typeof valor === "string" || typeof valor === "boolean") {
    return valor;
  }
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : null;
  }
  if (Array.isArray(valor)) {
    return valor.map(valorJson);
  }
  if (typeof valor === "object") {
    const objeto = valor;
    if (typeof objeto.toDate === "function") return objeto.toDate().toISOString();
    if (typeof objeto.seconds === "number") {
      return new Date(objeto.seconds * 1e3).toISOString();
    }
    const resultado = {};
    Object.entries(valor).forEach(([chave, item]) => {
      resultado[chave] = valorJson(item);
    });
    return resultado;
  }
  return null;
}
function mapaJson(valor) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  const resultado = {};
  Object.entries(valor).forEach(([chave, item]) => {
    resultado[chave] = valorJson(item);
  });
  return resultado;
}

// src/services/firebase/autenticacaoFirebase.ts
var PAPEIS_VALIDOS = ["gestor", "admin", "professor", "aluno"];
var MENSAGENS_POR_CODIGO = {
  "auth/invalid-credential": {
    codigo: "validacao",
    mensagem: "E-mail ou senha incorretos. Verifique os dados e tente novamente."
  },
  "auth/invalid-login-credentials": {
    codigo: "validacao",
    mensagem: "E-mail ou senha incorretos. Verifique os dados e tente novamente."
  },
  "auth/wrong-password": {
    codigo: "validacao",
    mensagem: "E-mail ou senha incorretos. Verifique os dados e tente novamente."
  },
  "auth/user-not-found": {
    codigo: "validacao",
    mensagem: "E-mail ou senha incorretos. Verifique os dados e tente novamente."
  },
  "auth/invalid-email": {
    codigo: "validacao",
    mensagem: "Informe um endere\xE7o de e-mail v\xE1lido."
  },
  "auth/user-disabled": {
    codigo: "permissao",
    mensagem: "Esta conta est\xE1 desativada. Procure a administra\xE7\xE3o."
  },
  "auth/too-many-requests": {
    codigo: "validacao",
    mensagem: "Muitas tentativas em sequ\xEAncia. Aguarde alguns minutos antes de tentar novamente."
  },
  "auth/email-already-in-use": {
    codigo: "validacao",
    mensagem: "J\xE1 existe uma conta com este e-mail. Entre com sua senha ou use a recupera\xE7\xE3o de acesso."
  },
  "auth/weak-password": {
    codigo: "validacao",
    mensagem: "A senha \xE9 muito fraca. Use pelo menos 6 caracteres."
  },
  "auth/network-request-failed": {
    codigo: "desconhecido",
    mensagem: "N\xE3o foi poss\xEDvel conectar ao servi\xE7o de autentica\xE7\xE3o. Verifique sua conex\xE3o e tente novamente."
  },
  "auth/operation-not-allowed": {
    codigo: "nao-configurado",
    mensagem: "Este m\xE9todo de acesso n\xE3o est\xE1 habilitado no projeto. Procure a administra\xE7\xE3o."
  },
  "auth/popup-closed-by-user": {
    codigo: "validacao",
    mensagem: "A janela de login do Google foi fechada antes de concluir o acesso."
  },
  "auth/cancelled-popup-request": {
    codigo: "validacao",
    mensagem: "A janela de login do Google foi fechada antes de concluir o acesso."
  },
  "auth/popup-blocked": {
    codigo: "desconhecido",
    mensagem: "O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente novamente."
  },
  "auth/account-exists-with-different-credential": {
    codigo: "validacao",
    mensagem: "Este e-mail j\xE1 est\xE1 vinculado a outra forma de acesso. Entre pelo m\xE9todo usado no primeiro cadastro."
  },
  "auth/requires-recent-login": {
    codigo: "permissao",
    mensagem: "Por seguran\xE7a, entre novamente antes de concluir esta opera\xE7\xE3o."
  },
  "auth/unauthorized-domain": {
    codigo: "nao-configurado",
    mensagem: "Este endere\xE7o n\xE3o est\xE1 autorizado no Firebase Authentication. Procure a administra\xE7\xE3o."
  },
  "auth/configuration-not-found": {
    codigo: "nao-configurado",
    mensagem: "A autentica\xE7\xE3o n\xE3o est\xE1 configurada corretamente neste ambiente. Procure a administra\xE7\xE3o."
  },
  "auth/invalid-api-key": {
    codigo: "nao-configurado",
    mensagem: "A autentica\xE7\xE3o n\xE3o est\xE1 configurada corretamente neste ambiente. Procure a administra\xE7\xE3o."
  },
  // Falhas ao ler/criar `users/{uid}` diretamente no Firestore.
  "permission-denied": {
    codigo: "permissao",
    mensagem: "N\xE3o foi poss\xEDvel preparar seu perfil de acesso. Sua conta foi autenticada, mas o perfil escolar n\xE3o p\xF4de ser criado. Procure a administra\xE7\xE3o."
  },
  unauthenticated: {
    codigo: "permissao",
    mensagem: "Sua sess\xE3o expirou. Entre novamente para continuar."
  },
  unavailable: {
    codigo: "desconhecido",
    mensagem: "N\xE3o foi poss\xEDvel conectar ao banco de dados. Verifique sua conex\xE3o e tente novamente."
  },
  "failed-precondition": {
    codigo: "nao-configurado",
    mensagem: "O perfil de acesso ainda n\xE3o pode ser preparado neste ambiente. Procure a administra\xE7\xE3o."
  }
};
function papelValido(valor) {
  return typeof valor === "string" && PAPEIS_VALIDOS.includes(valor);
}
function codigoDoErro(erro) {
  if (typeof erro !== "object" || erro === null || !("code" in erro)) return null;
  const codigo = erro.code;
  return typeof codigo === "string" ? codigo : null;
}
function traduzirErro(erro) {
  if (ehErroDeServico(erro)) return erro;
  const codigo = codigoDoErro(erro);
  const mapeado = codigo ? MENSAGENS_POR_CODIGO[codigo] : void 0;
  if (mapeado) {
    return new ErroDeServico(mapeado.codigo, mapeado.mensagem);
  }
  const detalhe = erro instanceof Error ? erro.message : void 0;
  return new ErroDeServico(
    "desconhecido",
    "N\xE3o foi poss\xEDvel concluir a opera\xE7\xE3o. Tente novamente.",
    detalhe
  );
}
async function definirPersistencia(auth, opcoes) {
  const manterConectado = opcoes?.manterConectado ?? true;
  await setPersistence(
    auth,
    manterConectado ? browserLocalPersistence : browserSessionPersistence
  );
}
async function buscarPerfilNoFirestore(usuarioFirebase, nomePreferido) {
  const db = obterFirestore();
  const uid = usuarioFirebase.uid;
  const referencia = doc(db, "users", uid);
  const dados = await runTransaction(db, async (transacao) => {
    const atual = await transacao.get(referencia);
    if (atual.exists()) {
      return atual.data() ?? {};
    }
    const email2 = (usuarioFirebase.email ?? "").trim().toLowerCase();
    const displayName = nomePreferido?.trim() || usuarioFirebase.displayName?.trim() || email2.split("@")[0] || "Usu\xE1rio";
    transacao.set(referencia, {
      uid,
      email: email2,
      displayName,
      role: "aluno",
      updatedAt: serverTimestamp()
    });
    return { uid, email: email2, displayName, role: "aluno" };
  });
  const papel = dados.role;
  if (!papelValido(papel)) {
    throw new ErroDeServico(
      "perfil-indisponivel",
      "Seu perfil n\xE3o possui um n\xEDvel de acesso v\xE1lido."
    );
  }
  const email = textoNaoVazio(dados.email, usuarioFirebase.email?.trim().toLowerCase()) || "";
  const nome = textoNaoVazio(
    dados.displayName,
    usuarioFirebase.displayName?.trim() || email.split("@")[0] || "Usu\xE1rio"
  );
  const fotoUrl = usuarioFirebase.photoURL?.trim() || void 0;
  return {
    uid,
    email,
    nome,
    papel,
    ...fotoUrl ? { fotoUrl } : {}
  };
}
var AutenticacaoFirebase = class {
  modo = "firebase";
  operacaoExplicita = false;
  perfilEmAndamento = null;
  carregarPerfil(usuarioFirebase, nomePreferido) {
    const emAndamento = this.perfilEmAndamento;
    if (emAndamento && emAndamento.uid === usuarioFirebase.uid) {
      return emAndamento.promessa;
    }
    const promessa = buscarPerfilNoFirestore(usuarioFirebase, nomePreferido);
    this.perfilEmAndamento = { uid: usuarioFirebase.uid, promessa };
    const limpar = () => {
      if (this.perfilEmAndamento?.promessa === promessa) {
        this.perfilEmAndamento = null;
      }
    };
    void promessa.then(limpar, limpar);
    return promessa;
  }
  async sessaoAtual() {
    const auth = obterAutenticacaoFirebase();
    await auth.authStateReady();
    if (!auth.currentUser) return null;
    try {
      return await this.carregarPerfil(auth.currentUser);
    } catch (erro) {
      throw traduzirErro(erro);
    }
  }
  async entrarComGoogle(opcoes) {
    this.operacaoExplicita = true;
    try {
      const auth = obterAutenticacaoFirebase();
      await definirPersistencia(auth, opcoes);
      const provedor = new GoogleAuthProvider();
      const credencial = await signInWithPopup(auth, provedor);
      return await this.carregarPerfil(credencial.user);
    } catch (erro) {
      throw traduzirErro(erro);
    } finally {
      this.operacaoExplicita = false;
    }
  }
  async entrarComEmailSenha(credenciais, opcoes) {
    this.operacaoExplicita = true;
    try {
      const auth = obterAutenticacaoFirebase();
      await definirPersistencia(auth, opcoes);
      const credencial = await signInWithEmailAndPassword(
        auth,
        credenciais.email.trim(),
        credenciais.senha
      );
      return await this.carregarPerfil(credencial.user);
    } catch (erro) {
      throw traduzirErro(erro);
    } finally {
      this.operacaoExplicita = false;
    }
  }
  async cadastrarComEmailSenha(dados, opcoes) {
    this.operacaoExplicita = true;
    try {
      const auth = obterAutenticacaoFirebase();
      await definirPersistencia(auth, opcoes ?? { manterConectado: true });
      const credencial = await createUserWithEmailAndPassword(
        auth,
        dados.email.trim(),
        dados.senha
      );
      const nome = dados.nome.trim();
      if (nome) {
        try {
          await updateProfile(credencial.user, { displayName: nome });
        } catch {
        }
      }
      return await this.carregarPerfil(credencial.user, nome);
    } catch (erro) {
      throw traduzirErro(erro);
    } finally {
      this.operacaoExplicita = false;
    }
  }
  async recuperarSenha(email) {
    try {
      const auth = obterAutenticacaoFirebase();
      await sendPasswordResetEmail(auth, email.trim());
    } catch (erro) {
      if (codigoDoErro(erro) === "auth/user-not-found") return;
      throw traduzirErro(erro);
    }
  }
  async entrarDemonstracao() {
    throw new ErroDeServico(
      "nao-configurado",
      "O modo demonstra\xE7\xE3o n\xE3o est\xE1 dispon\xEDvel com o Firebase configurado."
    );
  }
  async sair() {
    await signOut(obterAutenticacaoFirebase());
  }
  assinar(ouvinte, aoErro) {
    return onAuthStateChanged(obterAutenticacaoFirebase(), (usuarioFirebase) => {
      if (!usuarioFirebase) {
        ouvinte(null);
        return;
      }
      if (this.operacaoExplicita) {
        return;
      }
      this.carregarPerfil(usuarioFirebase).then((perfil) => ouvinte(perfil)).catch((erro) => {
        if (aoErro) {
          aoErro(traduzirErro(erro));
          return;
        }
        ouvinte(null);
      });
    });
  }
};

// src/services/firebase/escolaFirebase.ts
import {
  collection,
  doc as doc2,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction as runTransaction2,
  serverTimestamp as serverTimestamp2,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
function codigoDoErro2(erro) {
  if (typeof erro !== "object" || erro === null || !("code" in erro)) return null;
  const codigo = erro.code;
  return typeof codigo === "string" ? codigo : null;
}
var MENSAGENS_FIRESTORE = {
  "permission-denied": {
    codigo: "permissao",
    mensagem: "Voc\xEA n\xE3o tem permiss\xE3o para acessar estes dados. Sua sess\xE3o pode ter expirado ou as regras de acesso ainda n\xE3o foram publicadas."
  },
  unauthenticated: {
    codigo: "permissao",
    mensagem: "Sua sess\xE3o expirou. Entre novamente para continuar."
  },
  unavailable: {
    codigo: "desconhecido",
    mensagem: "N\xE3o foi poss\xEDvel conectar ao banco de dados. Verifique sua conex\xE3o e tente novamente."
  },
  "failed-precondition": {
    codigo: "nao-configurado",
    mensagem: "A consulta necess\xE1ria ainda n\xE3o est\xE1 dispon\xEDvel neste ambiente. Procure a administra\xE7\xE3o."
  },
  "not-found": {
    codigo: "nao-encontrado",
    mensagem: "O registro solicitado n\xE3o foi encontrado."
  },
  "resource-exhausted": {
    codigo: "validacao",
    mensagem: "O limite de dados para esta consulta foi excedido. Ajuste os filtros e tente novamente."
  },
  "invalid-argument": {
    codigo: "validacao",
    mensagem: "Os dados informados n\xE3o s\xE3o v\xE1lidos para esta consulta."
  }
};
var MENSAGENS_CALLABLE = {
  "functions/unauthenticated": {
    codigo: "permissao",
    mensagem: "Sua sess\xE3o expirou. Entre novamente para continuar."
  },
  "functions/permission-denied": {
    codigo: "permissao",
    mensagem: "Seu perfil n\xE3o tem autoriza\xE7\xE3o para esta opera\xE7\xE3o."
  },
  "functions/invalid-argument": {
    codigo: "validacao",
    mensagem: "Os dados informados n\xE3o foram aceitos pelo servidor."
  },
  "functions/already-exists": {
    codigo: "validacao",
    mensagem: "J\xE1 existe um registro com estes dados."
  },
  "functions/failed-precondition": {
    codigo: "validacao",
    mensagem: "A opera\xE7\xE3o n\xE3o pode ser conclu\xEDda no estado atual dos dados."
  },
  "functions/aborted": {
    codigo: "desconhecido",
    mensagem: "A opera\xE7\xE3o foi interrompida por outra altera\xE7\xE3o simult\xE2nea. Tente novamente."
  },
  "functions/resource-exhausted": {
    codigo: "validacao",
    mensagem: "O limite da opera\xE7\xE3o foi excedido. Reduza a sele\xE7\xE3o e tente novamente."
  },
  "functions/deadline-exceeded": {
    codigo: "desconhecido",
    mensagem: "A opera\xE7\xE3o demorou mais que o esperado. Tente novamente."
  },
  "functions/cancelled": {
    codigo: "desconhecido",
    mensagem: "A opera\xE7\xE3o foi cancelada. Tente novamente."
  },
  "functions/not-found": {
    codigo: "nao-encontrado",
    mensagem: "O registro solicitado n\xE3o foi encontrado no servidor."
  }
};
var CALLABLES_INDISPONIVEIS = /* @__PURE__ */ new Set([
  "functions/unimplemented",
  "functions/internal",
  "functions/unavailable"
]);
function traduzirErroFirestore(erro) {
  if (ehErroDeServico(erro)) return erro;
  const codigo = codigoDoErro2(erro);
  const mapeado = codigo ? MENSAGENS_FIRESTORE[codigo] : void 0;
  if (mapeado) return new ErroDeServico(mapeado.codigo, mapeado.mensagem);
  return new ErroDeServico(
    "desconhecido",
    "N\xE3o foi poss\xEDvel concluir a opera\xE7\xE3o. Tente novamente."
  );
}
function traduzirErroCallable(erro) {
  if (ehErroDeServico(erro)) return erro;
  const codigo = codigoDoErro2(erro);
  if (!codigo || !codigo.startsWith("functions/")) {
    return traduzirErroFirestore(erro);
  }
  if (CALLABLES_INDISPONIVEIS.has(codigo)) {
    return new ErroDeServico(
      "nao-configurado",
      "Esta opera\xE7\xE3o ainda n\xE3o est\xE1 dispon\xEDvel neste ambiente."
    );
  }
  const mapeado = MENSAGENS_CALLABLE[codigo];
  if (!mapeado) {
    return new ErroDeServico(
      "desconhecido",
      "N\xE3o foi poss\xEDvel concluir a opera\xE7\xE3o no servidor. Tente novamente."
    );
  }
  const mensagemServidor = codigo === "functions/invalid-argument" || codigo === "functions/already-exists" || codigo === "functions/failed-precondition" || codigo === "functions/resource-exhausted" ? textoNaoVazio(erro instanceof Error ? erro.message : null) : "";
  return new ErroDeServico(mapeado.codigo, mensagemServidor || mapeado.mensagem);
}
function porNome(a, b) {
  return a.nome.localeCompare(b.nome, "pt-BR");
}
function mapearProfessor(documento) {
  const dados = documento.data();
  return {
    id: documento.id,
    nome: textoNaoVazio(dados.nome, "Professor sem nome"),
    status: statusCadastro(dados.status),
    criadoEm: paraIso(dados.criadoEm) || paraIso(dados.atualizadoEm)
  };
}
function mapearDisciplina(documento) {
  const dados = documento.data();
  return {
    id: documento.id,
    nome: textoNaoVazio(dados.nome, "Disciplina sem nome"),
    status: statusCadastro(dados.status),
    criadoEm: paraIso(dados.criadoEm) || paraIso(dados.atualizadoEm)
  };
}
function mapearTurma(documento) {
  const dados = documento.data();
  return {
    id: documento.id,
    nome: textoNaoVazio(dados.nome, "Turma sem nome"),
    serie: textoNaoVazio(dados.serie),
    modalidade: modalidadeCadastro(dados.modalidade),
    status: statusCadastro(dados.status),
    criadoEm: paraIso(dados.criadoEm) || paraIso(dados.atualizadoEm)
  };
}
function mapearAula(documento, configuracao, professores, disciplinas, turmas) {
  const dados = documento.data();
  const diaSemana = diaSemanaValido(dados.diaSemana);
  const periodo = periodoValido(dados.periodo);
  if (diaSemana === null || periodo === null) return null;
  const turmaId = texto(dados.turmaId);
  const disciplinaId = texto(dados.disciplinaId);
  const professorId = texto(dados.professorId);
  const horario = horarioDoPeriodo(configuracao, periodo);
  return {
    id: documento.id,
    turmaId,
    diaSemana,
    periodo,
    disciplinaId,
    professorId,
    atualizadoEm: paraIso(dados.atualizadoEm) || paraIso(dados.criadoEm),
    turmaNome: turmas.get(turmaId) ?? "Turma removida",
    disciplinaNome: disciplinas.get(disciplinaId) ?? "Disciplina removida",
    professorNome: professores.get(professorId) ?? "Professor removido",
    inicio: horario.inicio,
    fim: horario.fim
  };
}
function normalizarAulaResposta(resposta, entrada) {
  const aula = resposta?.aula;
  if (!aula) {
    throw new ErroDeServico(
      "desconhecido",
      "O servidor n\xE3o confirmou a altera\xE7\xE3o da aula. Tente novamente."
    );
  }
  return {
    id: textoNaoVazio(aula.id, criarIdAula(entrada.turmaId, entrada.diaSemana, entrada.periodo)),
    turmaId: textoNaoVazio(aula.turmaId, entrada.turmaId),
    diaSemana: diaSemanaValido(aula.diaSemana) ?? entrada.diaSemana,
    periodo: periodoValido(aula.periodo) ?? entrada.periodo,
    disciplinaId: textoNaoVazio(aula.disciplinaId, entrada.disciplinaId),
    professorId: textoNaoVazio(aula.professorId, entrada.professorId),
    atualizadoEm: paraIso(aula.atualizadoEm) || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function normalizarConfiguracaoResposta(resposta, fallback) {
  const periodos = periodosDoValor(resposta?.periodos);
  return {
    abertura: textoNaoVazio(resposta?.abertura, fallback.abertura),
    fechamento: textoNaoVazio(resposta?.fechamento, fallback.fechamento),
    periodos: periodos.length > 0 ? periodos : fallback.periodos,
    intervalo: resposta ? intervaloDoValor(resposta.intervalo) : fallback.intervalo,
    atualizadoEm: paraIso(resposta?.atualizadoEm) || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function tipoHistorico(valor) {
  return valor === "aula" || valor === "configuracao" || valor === "cadastro" || valor === "permissao" || valor === "sistema" ? valor : "sistema";
}
function mapearHistorico(item) {
  return {
    id: texto(item.id),
    tipo: tipoHistorico(item.tipo),
    entidade: texto(item.entidade),
    entidadeId: texto(item.entidadeId),
    descricao: texto(item.descricao),
    alteracao: {
      antes: mapaJson(item.alteracao?.antes),
      depois: mapaJson(item.alteracao?.depois)
    },
    responsavelId: texto(item.responsavelId),
    responsavelNome: textoNaoVazio(item.responsavelNome, "Sistema"),
    timestamp: paraIso(item.timestamp)
  };
}
function mapearNotificacao(documento) {
  const dados = documento.data();
  const turmaIds = Array.isArray(dados.turmaIds) ? dados.turmaIds.filter((item) => typeof item === "string") : [];
  const totalAulas = dados.agrupamento && typeof dados.agrupamento === "object" ? dados.agrupamento.totalAulas : void 0;
  return {
    id: documento.id,
    uid: texto(dados.uid),
    turmaId: turmaIds[0] ?? texto(dados.turmaId),
    titulo: textoNaoVazio(dados.titulo, "Notifica\xE7\xE3o"),
    mensagem: texto(dados.mensagem),
    lida: dados.lida === true,
    criadoEm: paraIso(dados.criadoEm),
    ...typeof totalAulas === "number" ? { agrupamento: { totalAulas } } : {}
  };
}
function mapearFavorito(documento) {
  const dados = documento.data();
  return {
    uid: texto(dados.uid),
    turmaId: texto(dados.turmaId),
    criadoEm: paraIso(dados.criadoEm)
  };
}
function ordenarPorCriadoEmDesc(itens) {
  return [...itens].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}
var EscolaFirebase = class {
  db;
  constructor(db = obterFirestore()) {
    this.db = db;
  }
  async listarTurmas() {
    try {
      const resultado = await getDocs(query(collection(this.db, "turmas"), limit(500)));
      return resultado.docs.map(mapearTurma).sort(porNome);
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }
  async listarCatalogo() {
    try {
      const [professores, disciplinas, turmas, configuracao] = await Promise.all([
        getDocs(query(collection(this.db, "professores"), limit(500))),
        getDocs(query(collection(this.db, "disciplinas"), limit(500))),
        getDocs(query(collection(this.db, "turmas"), limit(500))),
        getDoc(doc2(this.db, "configuracao", "atual"))
      ]);
      return {
        professores: professores.docs.map(mapearProfessor).sort(porNome),
        disciplinas: disciplinas.docs.map(mapearDisciplina).sort(porNome),
        turmas: turmas.docs.map(mapearTurma).sort(porNome),
        configuracao: configuracaoDoDocumento(
          configuracao.exists() ? configuracao.data() : void 0
        )
      };
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }
  async listarAulas(filtro = {}) {
    try {
      let consulta = collection(this.db, "aulas");
      if (filtro.turmaId) {
        consulta = query(consulta, where("turmaId", "==", filtro.turmaId));
      } else if (filtro.professorId) {
        consulta = query(consulta, where("professorId", "==", filtro.professorId));
      } else if (filtro.diaSemana) {
        consulta = query(consulta, where("diaSemana", "==", filtro.diaSemana));
      }
      consulta = query(consulta, limit(500));
      const [resultado, catalogo] = await Promise.all([
        getDocs(consulta),
        this.listarCatalogo()
      ]);
      const professores = new Map(
        catalogo.professores.map((item) => [item.id, item.nome])
      );
      const disciplinas = new Map(
        catalogo.disciplinas.map((item) => [item.id, item.nome])
      );
      const turmas = new Map(catalogo.turmas.map((item) => [item.id, item.nome]));
      return resultado.docs.map(
        (documento) => mapearAula(documento, catalogo.configuracao, professores, disciplinas, turmas)
      ).filter((aula) => aula !== null).filter((aula) => !filtro.turmaId || aula.turmaId === filtro.turmaId).filter((aula) => !filtro.professorId || aula.professorId === filtro.professorId).filter((aula) => !filtro.diaSemana || aula.diaSemana === filtro.diaSemana).sort(
        (a, b) => a.diaSemana - b.diaSemana || a.periodo - b.periodo || a.turmaNome.localeCompare(b.turmaNome, "pt-BR")
      );
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }
  async salvarAula(entrada, _responsavel) {
    const resposta = await this.chamar(
      "salvarAula",
      entrada
    );
    return normalizarAulaResposta(resposta, entrada);
  }
  async salvarConfiguracao(configuracao, _responsavel) {
    const entrada = {
      abertura: configuracao.abertura,
      fechamento: configuracao.fechamento,
      periodos: configuracao.periodos.map((periodo) => ({ ...periodo })),
      intervalo: configuracao.intervalo ? { ...configuracao.intervalo } : null
    };
    const resposta = await this.chamar(
      "salvarConfiguracao",
      entrada
    );
    return normalizarConfiguracaoResposta(resposta?.configuracao, configuracao);
  }
  async salvarCadastro(entrada, _responsavel) {
    const payload = entrada.tipo === "turma" ? {
      tipo: "turma",
      nome: entrada.nome,
      serie: entrada.serie,
      modalidade: entrada.modalidade,
      turno: "manha",
      ...entrada.id ? { id: entrada.id } : {}
    } : {
      tipo: entrada.tipo,
      nome: entrada.nome,
      ...entrada.id ? { id: entrada.id } : {}
    };
    await this.chamar("salvarCadastro", payload);
    return this.listarCatalogo();
  }
  async alterarStatusCadastro(tipo, id, status, _responsavel) {
    const entrada = { tipo, id, status };
    await this.chamar(
      "alterarStatusCadastro",
      entrada
    );
    return this.listarCatalogo();
  }
  async excluirCadastro(tipo, id, _responsavel) {
    const entrada = { tipo, id };
    await this.chamar("excluirCadastro", entrada);
    return this.listarCatalogo();
  }
  async listarHistorico(filtro = {}) {
    const entrada = filtro.tipo ? { tipo: filtro.tipo } : {};
    try {
      const resposta = await this.chamar(
        "listarHistorico",
        entrada
      );
      return (resposta?.itens ?? []).map(mapearHistorico).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (erro) {
      if (ehErroDeServico(erro) && (erro.codigo === "nao-configurado" || erro.codigo === "nao-encontrado")) {
        return [];
      }
      throw erro;
    }
  }
  async listarNotificacoes(uid) {
    if (!uid) return [];
    try {
      const resultado = await getDocs(
        query(collection(this.db, "notificacoes"), where("uid", "==", uid), limit(100))
      );
      return ordenarPorCriadoEmDesc(resultado.docs.map(mapearNotificacao));
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }
  async marcarNotificacaoLida(uid, notificacaoId) {
    if (!uid) {
      throw new ErroDeServico("permissao", "Sua sess\xE3o expirou. Entre novamente.");
    }
    try {
      await updateDoc(doc2(this.db, "notificacoes", notificacaoId), {
        lida: true,
        lidaEm: serverTimestamp2()
      });
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }
  async marcarTodasNotificacoesLidas(uid) {
    if (!uid) {
      throw new ErroDeServico("permissao", "Sua sess\xE3o expirou. Entre novamente.");
    }
    try {
      const resultado = await getDocs(
        query(collection(this.db, "notificacoes"), where("uid", "==", uid), limit(500))
      );
      const pendentes = resultado.docs.filter((documento) => documento.data().lida !== true);
      for (let inicio = 0; inicio < pendentes.length; inicio += 400) {
        const lote = writeBatch(this.db);
        pendentes.slice(inicio, inicio + 400).forEach((documento) => {
          lote.update(documento.ref, {
            lida: true,
            lidaEm: serverTimestamp2()
          });
        });
        await lote.commit();
      }
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }
  async listarFavoritos(uid) {
    if (!uid) return [];
    try {
      const resultado = await getDocs(
        query(collection(this.db, "favoritos"), where("uid", "==", uid), limit(200))
      );
      return ordenarPorCriadoEmDesc(resultado.docs.map(mapearFavorito));
    } catch (erro) {
      throw traduzirErroFirestore(erro);
    }
  }
  async alternarFavorito(uid, turmaId) {
    if (!uid) {
      throw new ErroDeServico("permissao", "Sua sess\xE3o expirou. Entre novamente.");
    }
    try {
      const referencia = doc2(this.db, "favoritos", `${uid}_${turmaId}`);
      await runTransaction2(this.db, async (transacao) => {
        const atual = await transacao.get(referencia);
        if (atual.exists()) {
          transacao.delete(referencia);
          return;
        }
        const turma = await transacao.get(doc2(this.db, "turmas", turmaId));
        if (!turma.exists()) {
          throw new ErroDeServico("nao-encontrado", "Turma n\xE3o encontrada.");
        }
        transacao.set(referencia, {
          uid,
          turmaId,
          criadoEm: serverTimestamp2()
        });
      });
      return this.listarFavoritos(uid);
    } catch (erro) {
      if (ehErroDeServico(erro)) throw erro;
      throw traduzirErroFirestore(erro);
    }
  }
  async chamar(nome, entrada) {
    try {
      const funcao = httpsCallable(obterFuncoesFirebase(), nome);
      const resposta = await funcao(entrada);
      return resposta.data;
    } catch (erro) {
      throw traduzirErroCallable(erro);
    }
  }
};

// ../../../AppData/Local/Temp/opencode/verificacao-front/teste-admin-sem-functions.ts
async function executar() {
  const email = process.env.TESTE_EMAIL ?? "";
  const senha = process.env.TESTE_SENHA ?? "";
  const autenticacao = new AutenticacaoFirebase();
  const usuario = await autenticacao.cadastrarComEmailSenha({ nome: "Teste Admin", email, senha });
  console.log("perfil:", usuario.uid, usuario.papel);
  const escola = new EscolaFirebase();
  const historico = await escola.listarHistorico();
  console.log("listarHistorico sem Functions:", JSON.stringify(historico));
  try {
    await escola.salvarAula({
      turmaId: "turma-1a",
      diaSemana: 1,
      periodo: 1,
      disciplinaId: "disc-matematica",
      professorId: "prof-edson-gaspar"
    }, usuario);
    console.log("ERRO: salvarAula n\xE3o deveria ter sucesso");
  } catch (erro) {
    console.log("salvarAula:", ehErroDeServico(erro) ? erro.codigo + " | " + erro.message : erro);
  }
  try {
    await escola.salvarCadastro({ tipo: "professor", nome: "Teste Sem Functions" }, usuario);
    console.log("ERRO: salvarCadastro n\xE3o deveria ter sucesso");
  } catch (erro) {
    console.log("salvarCadastro:", ehErroDeServico(erro) ? erro.codigo + " | " + erro.message : erro);
  }
  await autenticacao.sair();
}
executar().catch((erro) => {
  console.error("FALHA:", erro);
  process.exit(1);
});
