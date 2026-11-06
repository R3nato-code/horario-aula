# Registro de Verificação — Backend

**Versão:** 0.5.0
**Data:** 06/11/2026
**Responsável:** Patrick (Agente 4 — Back-End e Firebase)
**Escopo:** Cloud Functions, regras do Firestore, índices, seed e documentação de backend.
**Fontes de verdade:** `docs/arquitetura/modelo-dados-firestore.md` (v1.0),
`docs/arquitetura/seguranca-regras.md` (v1.0), ADR-01 a ADR-07.

---

## 1. Resumo da entrega

| Item | Resultado | Evidência |
|---|---|---|
| Funções exportadas | **12** | `functions/src/index.ts` |
| Scripts operacionais | **4** | `functions/src/scripts/` |
| Coleções canônicas cobertas pelas regras | **13/13** | `firestore.rules` × modelo §3 |
| Índices compostos | **9** (IDX-01 a IDX-09) | `firestore.indexes.json` |
| Aulas versionadas no seed | **420** (14 turmas × 5 dias × 6 aulas) | `functions/src/scripts/dados/horarios-2026.json` |
| Conflitos de professor no seed | **0** | ver §3 |
| Typecheck | **PASS** | `tsc -p tsconfig.json --noEmit` |
| Lint | **PASS** | `eslint "src/**/*.ts"` |
| Testes | **127 PASS / 0 FAIL** (33 suítes) | `node --test "lib/**/*.test.js"` |
| Build | **PASS** | `tsc -p tsconfig.json` |
| Bootstrap da configuração | **APLICADO** | `configuracao/atual` criada |
| Seed no projeto real | **APLICADO** | 14 turmas, 44 professores, 62 disciplinas, 420 aulas |
| Regras no emulador | **NÃO EXECUTADO** | JDK 21 ausente (ambiente com Java 1.8.0_361) |

### 1.1 As 12 funções exportadas

```text
garantirPerfil            callable   (southamerica-east1)
aoCriarUsuario            gatilho Auth gen1 (us-central1)
salvarCadastro            callable
alterarStatusCadastro     callable
excluirCadastro           callable
salvarAula                callable
removerAula               callable
salvarConfiguracao        callable
previaEdicaoEmMassa       callable
confirmarEdicaoEmMassa    callable
listarHistorico           callable
processarOutbox           gatilho Firestore onDocumentCreated
```

### 1.2 Coleções canônicas cobertas por `firestore.rules`

| Coleção | Regra implementada |
|---|---|
| `users` | `get` do próprio `uid`; `list/create/update/delete` negados. |
| `professores` | leitura autenticada; escrita negada. |
| `disciplinas` | leitura autenticada; escrita negada. |
| `turmas` | leitura autenticada; escrita negada. |
| `aulas` | leitura autenticada; escrita negada. |
| `configuracao` | leitura autenticada; escrita negada. |
| `historico` | leitura e escrita negadas (append-only no servidor). |
| `notificacoes` | leitura do próprio `uid`; update só de `lida`/`lidaEm`; create/delete negados. |
| `favoritos` | get/list/create/delete do próprio `uid`; update negado. |
| `operacoes` | leitura e escrita negadas. |
| `outbox` | leitura e escrita negadas. |
| `assistente_uso` | leitura e escrita negadas. |
| `salas` | leitura e escrita negadas (reservada a LAC-23/LAC-24). |
| Qualquer outro caminho | negado pelo catch-all. |

> `salas` foi adicionada ao mapa de constantes (`COLECAO_SALAS`) apenas para
> rastreabilidade do modelo. Continua fechada e não é usada por nenhuma função.

---

## 2. Comandos executados nesta entrega

Executados na raiz do repositório, em 05/11/2026:

```powershell
npm --prefix functions run typecheck
npm --prefix functions run lint
npm --prefix functions run test
npm --prefix functions run build
```

### 2.1 Resultados reais

| Comando | Saída resumida | Exit |
|---|---|---|
| `typecheck` | `tsc -p tsconfig.json --noEmit` sem erros | `0` |
| `lint` | `eslint "src/**/*.ts"` sem erros | `0` |
| `test` | `tests 127`, `suites 33`, `pass 127`, `fail 0`, `duration_ms ≈ 10426` | `0` |
| `build` | `tsc -p tsconfig.json` sem erros | `0` |

O script `test` executa `npm run build` antes de `node --test "lib/**/*.test.js"`.
Os logs de erro esperados dos testes de `paraHttpsError` são intencionais e não
representam falha da suíte.

### 2.2 Verificação independente do seed

Além da suíte, foi executado o seed com service account contra o projeto
`complementacao-horario-aula`:

```text
bootstrap-configuracao --dry-run  → acao: criar
bootstrap-configuracao --confirmar → aplicado
seed-horarios --dry-run            → 14 turmas, 44 professores, 62 disciplinas, 420 aulas, 0 conflitos
seed-horarios --confirmar          → aplicado
```

Contagem final verificada no Firestore:

```text
users .......... 0
professores .... 44
disciplinas .... 62
turmas ......... 14
aulas .......... 420
configuracao ... 1 (atual)
historico ...... 2 (configuração + seed)
```

### 2.3 Diagnóstico da falha de login Google (05/11/2026)

**Sintoma relatado:** após escolher uma conta Google, a aplicação exibe
"Não foi possível entrar — O serviço de perfis encontrou um erro inesperado." A conta
aparece no Firebase Authentication mesmo sem ter passado por "Criar conta".

**Investigação executada:**

| Comando | Resultado |
|---|---|
| `npx firebase login:list` | `Logged in as mascarenhasr02@gmail.com` |
| `npx firebase functions:list --project complementacao-horario-aula` | HTTP 403 `SERVICE_DISABLED` — "Cloud Functions API has not been used in project complementacao-horario-aula before or it is disabled" |
| `npx firebase firestore:databases:list --project complementacao-horario-aula` | `projects/complementacao-horario-aula/databases/(default)` — `FIRESTORE_NATIVE` |
| `java -version` | `1.8.0_361` (emulador do Firestore continua bloqueado) |
| `npm --prefix functions run typecheck` | PASS |
| `npm --prefix functions run lint` | PASS |
| `npm --prefix functions run test` | 127 PASS / 0 FAIL |
| `npm --prefix functions run build` | PASS |

**Conclusão (fato):** não há funções publicadas no projeto; a Cloud Functions API está
desabilitada. A URL de `garantirPerfil` não existe, e o SDK JavaScript transforma falha de
rede/CORS em `functions/internal`. O cliente traduz esse código para a mensagem observada
(`src/services/firebase/autenticacaoFirebase.ts`). Não há defeito de regra do Firestore
nesse caminho: callables usam o Admin SDK e as regras não são avaliadas.

**Sobre a conta criada sem "Criar conta":** o provedor Google cria a identidade no Firebase
Authentication no primeiro acesso. O perfil escolar (`users/{uid}`) é um documento separado,
criado por `garantirPerfil`. A identidade já criada é reaproveitada e o perfil é criado de
forma idempotente assim que a função estiver publicada. Nenhum dado precisa ser apagado.

**Correção necessária (operacional, não de código):** habilitar as APIs de Cloud Functions
e publicar as funções, as regras e os índices. Procedimento em
`docs/backend/runbook-local.md` §10.1.

---

## 3. Conflitos de horários

### 3.1 Linha de base (antes da correção)

Os 4 conflitos de professor identificados na fonte anterior eram:

| Dia/período | Professor | Turmas em conflito |
|---|---|---|
| 5ª feira, 1ª aula | Ronaldo M. L. P. | `turma-3c` × `turma-2dsb` |
| 5ª feira, 2ª aula | Sonny O. Carneiro | `turma-3c` × `turma-2dsb` |
| 5ª feira, 3ª aula | Sonny O. Carneiro | `turma-3c` × `turma-2dsb` |
| 5ª feira, 5ª aula | Hélcio J. Lourenço | `turma-2dsb` × `turma-2adm` |

Esses 4 pares foram confirmados por script independente, sem depender do
emulador.

### 3.2 Correção aplicada

O bloco de **sexta-feira da `turma-2dsb`** foi substituído pelo conteúdo
correspondente de `docs/arquitetura/aulas.md`:

| Aula | Disciplina | Professor |
|---|---|---|
| 1ª | Inovação e Tecnologia | Rosa C. Hoffmann |
| 2ª | Inovação e Tecnologia | Rosa C. Hoffmann |
| 3ª | História | Hélcio J. Lourenço |
| 4ª | História | Hélcio J. Lourenço |
| 5ª | Sociologia | Priscila S. Silva |
| 6ª | Programação Front-End | Josiane Taborda A. |

Resultado verificado: **420 aulas, 0 conflitos de professor e 0 conflitos de
turma**. O ID determinístico de cada aula foi preservado.

### 3.3 Ressalva sobre `docs/arquitetura/aulas.md`

O arquivo `aulas.md` **não é integralmente livre de conflitos** quando lido como
fonte única. A análise completa encontrou 3 conflitos adicionais:

| Dia/período | Professor | Turmas em conflito |
|---|---|---|
| 2ª feira, 6ª aula | Adnilson R. M. | `turma-2a` × `turma-2c` |
| 3ª feira, 1ª aula | Guilherme A. Neves | `turma-2c` × `turma-3adm` |
| 3ª feira, 2ª aula | Priscila S. Silva | `turma-2c` × `turma-3b` |

Por isso, **somente o bloco de sexta da 2ª DSB** foi adotado. As demais
divergências entre `aulas.md` e o JSON versionado (`turma-2c` em dois dias e
`turma-3dsc` na quinta) não foram aplicadas, pois introduziriam os 3 conflitos
acima. A correção é uma decisão de dados e deve ser ratificada pela escola/
Arquiteto antes do `--confirmar`.

---

## 4. Dependência criada para o seed

O seed exige `configuracao/atual` com os períodos 1–6. Foi criado o script:

```text
functions/src/scripts/bootstrap-configuracao.ts
npm --prefix functions run bootstrap:configuracao
```

Comportamento:

- `--dry-run`: valida a configuração padrão e informa a ação (`criar` ou
  `sobrescrever`), sem escrever.
- `--confirmar`: grava `configuracao/atual` e o histórico `configuracao` na
  mesma transação (ADR-04).
- `--sobrescrever`: necessário quando já existe configuração diferente.
- Configuração idêntica é no-op (idempotente), sem novo histórico.
- A configuração padrão segue o modelo §3.6 (07:20–12:30, seis períodos,
  intervalo 09:45–10:10).

---

## 5. O que não foi executado e por quê

| Item | Motivo | Como desbloquear |
|---|---|---|
| Testes de regras no emulador | Firestore Emulator exige JDK 21; ambiente tem Java 1.8.0_361. | Instalar JDK 21 e rodar `firebase emulators:exec --only firestore ...`. |
| Publicação de regras/índices/functions | O agente não executa deploy. Em 05/11/2026 a Cloud Functions API estava desabilitada (`SERVICE_DISABLED`), portanto **0 funções publicadas**; ver §2.3. | Responsável humano habilita as APIs e publica conforme `runbook-local.md` §10.1. |
| Criação do perfil do gestor inicial | Não há usuário no Firebase Authentication; o UID só existe após o primeiro login/cadastro. | Entrar com Google usando `mascarenhasr02@gmail.com` ou rodar o script após criar a conta. |
| Integração Gemini | Depende da chave no Secret Manager e da ordem aprovada. | Implementação conforme ADR-07. |

---

## 6. Pendências e próximo passo

1. **Gestor inicial:** entrar com `mascarenhasr02@gmail.com` pelo Google. O
   backend criará `users/{uid}` com `role = 'gestor'` e histórico `permissao`.
   Se a conta for criada por senha, executar:
   ```powershell
   node functions/lib/scripts/definir-papel.js `
     --email "mascarenhasr02@gmail.com" --papel gestor --confirmar
   ```
2. **Instalar JDK 21** e executar os testes de regras do Firestore.
3. **Publicar** regras, índices e funções pelo responsável humano.
4. O Front-End substituir `EscolaIndisponivel` pela leitura real do Firestore.
5. Decidir o transporte da notificação individual de aula (ADR-05 × modelo
   §3.11), hoje não implementado.
6. Responder LAC-09/LAC-03/RF58 (gestão de usuários e admin) e LAC-23/LAC-24
   (salas).

---

## 7. Correção emergencial de 06/11/2026 — login e leitura sem Functions

### 7.1 Causas confirmadas

| Sintoma | Causa | Evidência |
|---|---|---|
| Login Google falha para contas novas | `users/{uid}` não existe e não há `garantirPerfil` publicado; o cliente lança `perfil-indisponivel` após o `getDoc`. | `functions:list` sem funções; 3 usuários no Auth e 1 perfil no Firestore. |
| Login e-mail/senha falha | Nenhuma conta com provedor `password`; além disso, uma conta nova criada pelo cliente também ficaria sem perfil. | Provedores das 3 contas = `google.com`. |
| Catálogo/aulas não aparecem | `src/app/servicos.ts` injeta `EscolaIndisponivel` no modo Firebase. | Código atual do front-end. |
| Notificações não podem ser lidas | Regra atual nega `update`; a consulta direta só é possível após publicar a regra corrigida. | `firestore.rules`, seção de notificações. |
| Favoritos aceitavam turma inexistente | Regra não verificava `exists()` nem o conjunto de campos. | `firestore.rules`, seção de favoritos. |
| `salas` estava legível | Regra permitia leitura autenticada, divergindo do modelo §3.13. | `firestore.rules`, seção de salas. |

### 7.2 Alterações aplicadas neste repositório

1. `firestore.rules`:
   - `users`: create do próprio perfil permitido apenas com `role = 'aluno'` e campos
     fechados; update continua negado. É uma exceção temporária de bootstrap enquanto
     não há Functions publicadas.
   - `notificacoes`: update restrito a `lida`/`lidaEm`, com `lida = true`,
     `lidaEm = request.time` e somente a partir de notificação não lida.
   - `favoritos`: create exige ID `{uid}_{turmaId}`, campos permitidos, `criadoEm`
     do servidor e existência da turma.
   - `salas`: leitura e escrita negadas.
2. `docs/backend/regras-firestore.md` atualizado para refletir o arquivo real e registrar
   a exceção de bootstrap.

### 7.3 Pendências que impedem a correção completa

| Pendência | Responsável | Efeito |
|---|---|---|
| Implementar `src/services/firebase/escolaFirebase.ts` com leitura direta de catálogo, aulas, configuração, notificações e favoritos. | Front-End | Sem isso, o modo Firebase continua usando `EscolaIndisponivel`. |
| Ajustar `src/services/firebase/autenticacaoFirebase.ts` para criar `users/{uid}` com `role = 'aluno'` quando ausente, usando `serverTimestamp()` e fallback de `displayName`. | Front-End | Sem isso, login Google e e-mail/senha de contas sem perfil continuam falhando. |
| Injetar `EscolaFirebase` em `src/app/servicos.ts`. | Front-End | Sem isso, nenhuma leitura real é usada. |
| Publicar `firestore.rules` e os índices. | Responsável humano | As correções de notificações/favoritos só valem após deploy. |
| Publicar as Cloud Functions (quando a API estiver habilitada). | Responsável humano | Operações administrativas (`salvarAula`, cadastros, configuração, histórico) continuam indisponíveis. |

### 7.4 Verificações executadas

| Verificação | Resultado |
|---|---|
| `npx firebase functions:list --project complementacao-horario-aula` | Nenhuma função publicada. |
| Leitura das coleções com Admin SDK | `professores` 44, `disciplinas` 62, `turmas` 14, `aulas` 420, `configuracao` 1, `historico` 0. |
| `users` | 1 perfil (`gestor`); 2 identidades Auth sem perfil. |
| Typecheck/lint/build do app | Não executados nesta etapa; nenhum arquivo de `src/` foi alterado. |
| Teste de regras no emulador | Não executado: JDK 21 ausente. |
| Deploy | Não executado, conforme limite do agente. |
