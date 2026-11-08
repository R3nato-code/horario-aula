# Runbook local e operação

**Versão:** 0.4.0 — 05/11/2026
**Escopo:** desenvolvimento local, emuladores, seed, bootstrap e checklist de publicação.
O agente **não executa deploy**; os passos de publicação são para o responsável humano.

---

## 1. Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| Node.js | 22 LTS | `functions/package.json` declara `node 22`. Node 24 compila/testa, mas emite aviso de engine. |
| npm | 10+ | — |
| Firebase CLI | 15.x | `npx firebase --version` |
| JDK | **21+** | Obrigatório para o emulador do Firestore. O ambiente atual tem Java 8 e **não** roda o emulador. |

---

## 2. Instalação e build

```powershell
npm --prefix functions install
npm --prefix functions run build
```

Não há dependência de backend no `.env` da raiz. As variáveis `VITE_FIREBASE_*` são
públicas e pertencem ao front-end.

---

## 3. Verificações

```powershell
npm --prefix functions run typecheck
npm --prefix functions run lint
npm --prefix functions run test     # executa build + node --test lib/**/*.test.js
npm --prefix functions run build
```

Estado esperado nesta entrega: 127 testes, todos aprovados.

---

## 4. Emuladores

Com JDK 21+:

```powershell
npx firebase emulators:start --only auth,firestore,functions --project complementacao-horario-aula
```

O emulador de Functions usa o build em `functions/lib`. Rode `npm --prefix functions run build`
antes.

Para executar um comando e derrubar os emuladores:

```powershell
npx firebase --project complementacao-horario-aula emulators:exec --only firestore "node --test ..."
```

> **Bloqueio atual:** o Firestore Emulator exige Java 21+.
> `firebase-tools` responde: `no longer supports Java version before 21`.
> Instale um JDK 21 e reexecute os testes de regras/integração.

---

## 5. Credenciais do Admin SDK

O código usa `initializeApp()` sem chave embutida:

- **Emulador:** defina `FIRESTORE_EMULATOR_HOST` e `GCLOUD_PROJECT`.
- **Produção/local contra o projeto real:** use Application Default Credentials
  (`gcloud auth application-default login`) ou `GOOGLE_APPLICATION_CREDENTIALS`
  apontando para um arquivo **fora do repositório**.

Nunca versionar service account, `.env` com segredo, token ou chave Gemini.
O arquivo `serviceAccountKey.json` usado nesta operação está coberto por
`.gitignore` (`serviceAccount*.json`) e não deve ser commitado.

Exemplo de execução real (PowerShell, na pasta `functions`):

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\caminho\fora-do-repo\serviceAccountKey.json"
$env:GCLOUD_PROJECT="complementacao-horario-aula"
$env:FIREBASE_PROJECT_ID="complementacao-horario-aula"
node lib/scripts/bootstrap-configuracao.js --dry-run
```

---

## 6. Bootstrap do primeiro gestor principal

O procedimento aceita `--email` ou `--uid`. A conta precisa existir no Firebase
Authentication; o perfil pode ser criado pelo script se ainda não existir.

```powershell
# 1. build
npm --prefix functions run build

# 2. executar (confira e-mail antes)
node functions/lib/scripts/bootstrap-gestor.js `
  --email "mascarenhasr02@gmail.com" `
  --confirmar
```

Comportamento:

- exige `--confirmar`;
- resolve o usuário no Auth por e-mail ou uid;
- exige correspondência entre `--email` e o usuário quando ambos são informados;
- cria `users/{uid}` com `role = 'gestor'` se o perfil não existir;
- é idempotente (se já for `gestor` e os dados derivados estiverem iguais, não
  altera e não grava histórico);
- grava `role` e o histórico `permissao` **na mesma transação** (ADR-04);
- o ator registrado é `script-bootstrap`; o stdout também traz log estruturado.

### 6.1 Gestor inicial no primeiro login Google

Além do script, o backend promove automaticamente o e-mail configurado em
`GESTOR_INICIAL_EMAIL` (padrão `mascarenhasr02@gmail.com`) **somente na criação
do perfil** e somente quando o token comprova e-mail verificado e provedor
`google.com`. Cadastro por e-mail/senha não reivindica o papel.

Fluxo recomendado:

1. A conta `mascarenhasr02@gmail.com` entra com **Continuar com Google**.
2. `garantirPerfil` cria `users/{uid}` com `role = 'gestor'`.
3. O histórico `permissao` é gravado na mesma transação.

Se a conta for criada por e-mail/senha, use o script da seção 6.

### 6.2 Definição de papéis de outros usuários

```powershell
node functions/lib/scripts/definir-papel.js `
  --email "pessoa@escola.test" `
  --papel admin `
  --confirmar
```

Papéis aceitos: `gestor`, `admin`, `professor`, `aluno`. O script cria o perfil
a partir do Auth se necessário, sincroniza `email`/`displayName` e grava
histórico `permissao` na mesma transação. Ele **não** é uma API de cliente:
LAC-09 continua aberta para a gestão de usuários pela interface.

Emulador:

```powershell
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
$env:GCLOUD_PROJECT="complementacao-horario-aula"
node functions/lib/scripts/bootstrap-gestor.js --email "mascarenhasr02@gmail.com" --confirmar
```

---

## 6.1 Bootstrap da configuração de horários

O seed exige `configuracao/atual` com os períodos 1–6. Crie-a antes do seed:

```powershell
# validar sem escrever
node functions/lib/scripts/bootstrap-configuracao.js --dry-run

# criar (ou substituir com --sobrescrever)
node functions/lib/scripts/bootstrap-configuracao.js --confirmar
```

Comportamento:

- configuração idêntica é no-op (idempotente), sem gravar histórico;
- configuração diferente exige `--sobrescrever`;
- criação/alteração e histórico `configuracao` são gravados na mesma transação;
- a configuração padrão segue o modelo §3.6: 07:20–12:30, seis períodos,
  intervalo 09:45–10:10.

---

## 7. Seed das 420 aulas

**Pré-requisito:** `configuracao/atual` deve existir e conter os períodos 1 a 6. O seed não
cria a configuração.

```powershell
# validar sem escrever (relatório de catálogo, aulas e conflitos)
node functions/lib/scripts/seed-horarios.js --dry-run

# aplicar (aborta se houver qualquer conflito de professor/turma)
node functions/lib/scripts/seed-horarios.js --confirmar

# aplicar sobrescrevendo aulas existentes
node functions/lib/scripts/seed-horarios.js --confirmar --sobrescrever
```

Comportamento:

1. Procura o arquivo em `lib/scripts/dados/horarios-2026.json` e, na ausência, em
   `src/scripts/dados/horarios-2026.json`.
2. Valida 14 turmas × 5 dias × 6 aulas = **420 aulas**.
3. Confere a configuração vigente e deriva os horários reais.
4. Calcula conflitos de professor e turma no **estado final** (aulas existentes + plano).
5. Se houver conflito, imprime `resultado: "conflitos"` e sai com código 2 **sem escrever**.
6. Grava catálogo e aulas em lotes de até 450 operações.
7. Grava um único histórico `historico/seed-horarios-{versao}`, com ID determinístico e
   verificação de existência em transação. Reexecutar a mesma versão não duplica o
   histórico.

**Estado atual (05/11/2026):** a fonte versionada tem 420 aulas e **0 conflitos**.
O bootstrap da configuração e o seed foram executados no projeto
`complementacao-horario-aula` com service account. Resultado real:

```text
configuracao/atual ......... criada (07:20–12:30, 6 períodos)
professores ................ 44
disciplinas ................ 62
turmas ..................... 14
aulas ...................... 420
conflitos .................. 0
```

A coleção antiga `horarios` e a coleção `usuarios` (não canônicas) permanecem
no projeto e não são usadas pelo backend. Não foram apagadas por serem dados
pré-existentes; a remoção exige confirmação do responsável.

---

## 8. Índices e TTL

### 8.1 Índices

`firestore.indexes.json` contém IDX-01 a IDX-09. A publicação é feita pelo responsável
humano, após revisão do Arquiteto:

```powershell
firebase deploy --only firestore:indexes --project complementacao-horario-aula
```

### 8.2 TTL das notificações

As notificações têm `expiraEm = criadoEm + 180 dias` (ADR-05). O Firestore **não** apaga
sozinho sem uma política de TTL configurada no campo `notificacoes.expiraEm`.

Passo operacional (uma vez por projeto, executado pelo responsável humano):

1. No Console do Firebase → Firestore → TTL, criar política para a coleção `notificacoes`,
   campo `expiraEm`.
2. Confirmar que a política está ativa antes de liberar notificações em produção.
3. Alternativa via `gcloud firestore fields ttls update expiraEm --collection-group=notificacoes`.

Sem essa política, os documentos permanecem e a aplicação deve continuar filtrando
`expiraEm > now` na leitura (a regra atual não filtra; o cliente deve fazê-lo).

---

## 9. Variáveis de ambiente

| Variável | Onde | Uso |
|---|---|---|
| `FUNCTIONS_REGION` | Functions | Região das callables (padrão `southamerica-east1`, A-02). |
| `GCLOUD_PROJECT` / `GOOGLE_CLOUD_PROJECT` | Emulador/script | Projeto do Admin SDK. |
| `GOOGLE_APPLICATION_CREDENTIALS` | Somente shell do operador | ADC; nunca no repositório. |
| `GEMINI_API_KEY` | Secret Manager | ADR-07; ainda não implementado. Nunca no cliente. |

---

## 10. Checklist de deploy (execução humana)

O agente **não executa** deploy. Antes de publicar:

1. Confirmar projeto: `firebase use complementacao-horario-aula`.
2. Confirmar região das funções com o Arquiteto (A-02).
3. `npm --prefix functions run typecheck && npm --prefix functions run lint && npm --prefix functions run test`.
4. Instalar JDK 21 e rodar os testes de regras do Firestore.
5. Revisar `firestore.rules` contra `docs/arquitetura/seguranca-regras.md`.
6. Confirmar que `.env`, service accounts e chaves não estão no commit.
7. Publicar índices e confirmar que estão `READY`.
8. Configurar a política de TTL de `notificacoes.expiraEm`.
9. Publicar regras somente após revisão de segurança.
10. Publicar funções e validar `garantirPerfil` com uma conta de teste.
11. Executar o bootstrap do gestor por procedimento humano auditado.
12. Executar o bootstrap de `configuracao/atual`.
13. Rodar o seed com `--dry-run` e depois `--confirmar` (após ratificar a correção da grade).

### 10.1 Publicação mínima para o login Google concluir

O login Google só conclui o perfil depois que a callable `garantirPerfil` estiver publicada.
Sem ela, o Firebase Authentication cria a identidade Google (comportamento normal do
provedor de identidade), mas `users/{uid}` **não** é criado e o cliente exibe
`O serviço de perfis encontrou um erro inesperado`.

**Diagnóstico realizado em 05/11/2026 no projeto `complementacao-horario-aula`:**

```text
npx firebase login:list
  → Logged in as mascarenhasr02@gmail.com

npx firebase functions:list --project complementacao-horario-aula
  → 403 SERVICE_DISABLED: "Cloud Functions API has not been used in project
    complementacao-horario-aula before or it is disabled."

npx firebase firestore:databases:list --project complementacao-horario-aula
  → projects/complementacao-horario-aula/databases/(default)  FIRESTORE_NATIVE
```

Consequências:

- **0 funções publicadas**: a URL de `garantirPerfil` não existe. O SDK do cliente trata
  falha de rede/CORS como `functions/internal`; por isso a mensagem genérica, e não
  `functions/not-found`.
- **As regras do Firestore não participam desse fluxo.** Callables usam o Admin SDK, que
  ignora as regras. Alterar `firestore.rules` não corrige essa falha.
- O usuário aparece no Firebase Authentication mesmo sem ter usado "Criar conta" porque o
  login Google cria a identidade no primeiro acesso. O perfil escolar é um documento
  separado, criado pelo servidor com `role = 'aluno'` (ou `gestor` para o e-mail inicial
  configurado). A conta sem perfil é reaproveitada na próxima tentativa: `garantirPerfil`
  é idempotente.

**Publicação (execução do responsável humano; o agente não executa deploy):**

1. Habilitar as APIs necessárias no projeto (uma vez), pelo Console ou pelo `gcloud`:

   ```text
   cloudfunctions.googleapis.com
   cloudbuild.googleapis.com
   run.googleapis.com
   eventarc.googleapis.com
   artifactregistry.googleapis.com
   ```

   Atalho: <https://console.cloud.google.com/apis/library?project=complementacao-horario-aula>

2. Confirmar que o projeto está no plano **Blaze**. Cloud Functions não funciona no plano
   Spark.
3. Na raiz do repositório, executar as verificações e publicar:

   ```powershell
   npm --prefix functions run typecheck
   npm --prefix functions run lint
   npm --prefix functions run test
   firebase deploy --only functions --project complementacao-horario-aula
   firebase deploy --only firestore:rules,firestore:indexes --project complementacao-horario-aula
   ```

4. Conferir o resultado:

   ```powershell
   firebase functions:list --project complementacao-horario-aula
   ```

   Esperado: **11 funções em `southamerica-east1`** (10 callables + o gatilho
   `processarOutbox`) e **1 função em `us-central1`** (`aoCriarUsuario`).

5. Verificação funcional:

   - entrar novamente com a **mesma** conta Google usada no teste (não é necessário criar
     outra conta; a identidade já existe);
   - no console do navegador, a chamada `garantirPerfil` deve responder `200`;
   - no Firestore, `users/{uid}` deve existir com `role = "aluno"` (ou `"gestor"` para o
     e-mail inicial configurado, com e-mail verificado e login Google);
   - fechar e reabrir a aplicação para validar a restauração da sessão.

Sem os passos 1–4, o erro continuará acontecendo independentemente de qualquer alteração
em regras, índices ou código do front-end.

---

## 11. Diagnóstico rápido

| Sintoma | Causa provável |
|---|---|
| "O serviço de perfis encontrou um erro inesperado" (`functions/internal`) | Função não publicada, Cloud Functions API desabilitada ou falha de rede/CORS. Confirmar com `firebase functions:list` e seguir §10.1. |
| `perfil-indisponivel` no cliente | Front-end não chamou `garantirPerfil`; ou regra/uid divergente. |
| Nome aparece como e-mail após cadastro | Perfil criado pelo gatilho antes de `updateProfile`; a próxima chamada a `garantirPerfil` sincroniza `displayName`. |
| `unauthenticated` na callable | Token ausente/expirado. |
| `permission-denied` | Perfil inexistente, papel inválido ou operação não autorizada. |
| `failed-precondition` no login | Conta sem e-mail ou perfil com `role` inválido. |
| `failed-precondition` ao salvar aula | Conflito de professor/turma, referência arquivada ou configuração inválida. |
| `resource-exhausted` na edição em massa | Mais de 200 aulas selecionadas. |
| `already-exists` na edição em massa | Mesma `chaveIdempotencia` com payload diferente. |
| Seed sai com código 2 | Conflitos de professor/turma na grade; nada foi escrito. |
| Seed falha em `configuracao/atual` | Configuração não criada ou sem os períodos 1–6; rode `bootstrap-configuracao`. |
| Emulador não inicia | Java < 21 ou porta ocupada (8080/9099/5001/4000). |
