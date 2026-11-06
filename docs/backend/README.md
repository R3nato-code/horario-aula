# Backend — Sistema de Horários Escolares

**Responsável:** Agente 4 (Back-End e Firebase)
**Versão desta entrega:** 0.4.0
**Data:** 05/11/2026
**Projeto Firebase:** `complementacao-horario-aula`
**Fonte de verdade:** `docs/arquitetura/` (ADR-01 a ADR-07, modelo de dados,
integrações e segurança).

---

## 1. O que foi entregue

| Item | Arquivo | Requisito/decisão |
|---|---|---|
| Perfil automático, idempotente e sincronizado com o Auth | `functions/src/features/perfil/*` | RF01–RF03 |
| Correção de `displayName` após cadastro por e-mail | `functions/src/features/perfil/servico.ts` | RF02 |
| Gestor inicial por e-mail verificado Google | `functions/src/core/config.ts`, `functions/src/features/perfil/modelo.ts` | LAC-03 |
| Rejeição de papel/claims vindos do cliente | `functions/src/features/perfil/funcoes.ts` | RF03 |
| Bootstrap seguro do primeiro gestor (uid ou e-mail) | `functions/src/scripts/bootstrap-gestor.ts` | LAC-03 |
| Definição operacional de papéis com histórico | `functions/src/features/permissoes/servico.ts`, `functions/src/scripts/definir-papel.ts` | RF03, RF58 (proposto) |
| Bootstrap da configuração de horários | `functions/src/scripts/bootstrap-configuracao.ts` | RF36–RF40; modelo §3.6, ADR-04 |
| CRUD transacional de professores, disciplinas e turmas | `functions/src/features/cadastros/*` | RF04–RF06, RF48–RF53; ADR-01/06 |
| Aulas com ID determinístico e conflito revalidado | `functions/src/features/aulas/*` | RF07, RF11–RF16, RF33, RF41/RF42; ADR-02 |
| Configuração de horários com impacto em aulas | `functions/src/features/configuracao/*` | RF36–RF40; ADR-02 |
| Edição em massa com prévia, limite 200 e idempotência | `functions/src/features/massa/*` | RF23–RF30, RF34/RF35; ADR-03 |
| Histórico append-only e consulta paginada | `functions/src/features/historico/*` | RF17–RF22, RF30, RF40; ADR-04 |
| Fan-out de notificações por outbox | `functions/src/features/notificacoes/fanout.ts` | RF43–RF47; ADR-05 |
| Regras do Firestore nos caminhos canônicos | `firestore.rules` | RF03, RF09, RF22, RF43–RF47 |
| Índices IDX-01 a IDX-09 | `firestore.indexes.json` | Modelo de dados §5 |
| Seed das 420 aulas + dados versionados | `functions/src/scripts/seed-horarios.ts`, `functions/src/scripts/dados/horarios-2026.json` | ADR-01 §8 |
| Configuração e seed aplicados no projeto real | Firestore `configuracao/atual`, 14 turmas, 44 professores, 62 disciplinas, 420 aulas | Ver `registro-verificacao.md` |
| 127 testes unitários | `functions/src/**/*.test.ts` | Estratégia de testes |

## 2. Funções exportadas

```text
garantirPerfil            callable  (southamerica-east1)
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

Scripts operacionais (não são Cloud Functions e não são acessíveis pelo cliente):

```text
bootstrap-gestor.js       promove/cria o primeiro gestor por uid ou e-mail
definir-papel.js          define papel de um usuário por uid ou e-mail
bootstrap-configuracao.js cria/substitui configuracao/atual
seed-horarios.js          valida e carrega as 420 aulas
```

Contratos detalhados: `docs/backend/contratos.md`.
Regras: `docs/backend/regras-firestore.md`.
Verificações: `docs/backend/registro-verificacao.md`.
Pendências: `docs/backend/lacunas-e-bloqueios.md`.

## 3. Estrutura

```text
firestore.rules                  # deny-by-default + notificações/favoritos
firestore.indexes.json           # IDX-01..IDX-09
functions/
  src/
    contracts/modelo.ts          # tipos persistidos
    core/                        # coleções, validação, erros, autorização, Admin SDK
    domain/
      cadastros/                 # slug e validação de entrada
      aulas/                     # identidade, conflito, validação
      horarios/                  # sobreposição, configuração, entrada
      massa/                     # limite 200, hash, UUID
      historico/                 # cursor opaco
    features/
      perfil/                    # RF01–RF03 + sincronização do Auth
      permissoes/                # definição operacional de papel
      cadastros/ aulas/ configuracao/ massa/ historico/ notificacoes/
    scripts/
      bootstrap-gestor.ts
      definir-papel.ts
      bootstrap-configuracao.ts
      seed-horarios.ts
      dados/horarios-2026.json
docs/backend/                    # esta documentação
```

## 4. Comandos

```powershell
npm --prefix functions run typecheck
npm --prefix functions run lint
npm --prefix functions run test
npm --prefix functions run build
npm --prefix functions run bootstrap:configuracao -- --dry-run
npm --prefix functions run definir:papel -- --email <email> --papel <papel> --confirmar
```

O `test` executa o build antes da suíte (`node --test lib/**/*.test.js`).

## 5. Decisões aplicadas

| Decisão | Implementação |
|---|---|
| D-01 | Modelo Gemini definido no servidor; integração ainda bloqueada por LAC-07. |
| D-02 | `turno` aceita somente `manha`; salas fechadas. |
| D-03 | Conflito valida professor e turma; sala só no cálculo interno (LAC-23/24). |
| ADR-01 | Coleções em português e campos `camelCase`; exceção `users`. |
| ADR-02 | ID `${turmaId}_${diaSemana}_${periodo}`; horários derivados. |
| ADR-03 | 200 aulas, 402 escritas, idempotência UUID + hash, outbox. |
| ADR-04 | Histórico único, append-only, consulta somente por callable. |
| ADR-05 | Notificações server-side com TTL 180 dias; favoritos diretos do dono. |
| ADR-06 | Ciclo `ativo` → `arquivado` → exclusão; zero aulas para arquivar/excluir. |

## 6. Segurança aplicada

1. **Servidor é a autoridade:** papel lido de `users/{uid}.role` via Admin SDK.
2. **Negar por padrão:** nenhuma escrita de domínio é permitida ao cliente.
3. **Sem claims:** a v1 usa `role` no perfil; custom claims exigem ADR própria.
4. **Histórico imutável:** regra nega leitura/escrita direta; gravação nas transações.
5. **Notificações/favoritos:** isolamento por `uid` nas regras e nas consultas.
6. **Segredos:** nenhum segredo no repositório; Admin SDK usa ADC/service account
   fora do controle de versão. `serviceAccountKey.json` está no `.gitignore`.
7. **Erros estáveis:** `HttpsError` com `correlacao` nos detalhes.
8. **Gestor inicial:** só é promovido no primeiro perfil criado, com e-mail exato,
   e-mail verificado e provedor Google. Cadastro por senha não reivindica o papel.
9. **Definição de papéis:** apenas scripts operacionais com credenciais
   administrativas; não há callable de gestão de usuários enquanto LAC-09 não
   definir o contrato.

## 7. Suposições registradas

| ID | Suposição | Impacto | Precisa de confirmação |
|---|---|---|---|
| A-01 | Papel padrão de conta nova é `aluno`. | Menor privilégio. | Sim |
| A-02 | Região `southamerica-east1`, configurável por `FUNCTIONS_REGION`. | Latência/custo. | Sim, antes do deploy |
| A-03 | Perfil usa `uid`, `email`, `displayName`, `role`. | Sem timestamps/status. | Parcial (LAC-09) |
| A-04 | Front-end chama `garantirPerfil` após login. | Evita corrida do primeiro acesso. | Integração Front-End |
| A-05 | Unicidade de `nome` por consulta `where('nome','==',...)` em transação. | Firestore não tem índice único; resta corrida entre dois cadastros simultâneos. | Sim (Arquiteto) |
| A-06 | `email` e `displayName` são derivados do Firebase Auth e podem ser sincronizados no perfil. | Corrige o perfil criado antes de `updateProfile`; não altera papel. | Sim (Arquiteto) |
| A-07 | `GESTOR_INICIAL_EMAIL` padrão = `mascarenhasr02@gmail.com`, sobrescrevível por ambiente. | Bootstrap do primeiro gestor sem autoatendimento genérico. | Sim, antes do deploy |

## 8. Pendências que impedem a conclusão de itens específicos

| Pendência | Efeito |
|---|---|
| LAC-09 / LAC-03 / RF58 | Gestão de usuários e concessão de admin no cliente não implementadas; há apenas scripts operacionais auditados. |
| JDK 21 ausente | Testes de regras e integração no emulador não executados. |
| Contrato de notificação individual | ADR-05 §2.5 exige, mas o modelo §3.11 só define outbox de edição em massa. |
| LAC-07 | Assistente Gemini não implementado. |
| LAC-23/LAC-24 | `salaId` rejeitado nas callables e `salas` fechada. |
| Front-end | `EscolaIndisponivel` ainda impede a leitura das coleções canônicas pelo cliente; a autenticação já está conectada ao Firestore via `garantirPerfil`. |

## 9. Próximo passo recomendado

1. **Publicar as funções, as regras e os índices** (execução do responsável humano). Em
   05/11/2026 a Cloud Functions API estava desabilitada e havia **0 funções publicadas**;
   por isso `garantirPerfil` não respondia e o login não concluía o perfil. Procedimento
   completo em `docs/backend/runbook-local.md` §10.1. As regras do Firestore não são a
   causa: callables usam o Admin SDK e não passam por elas.
2. Entrar com a conta `mascarenhasr02@gmail.com` pelo Google para que o backend
   crie `users/{uid}` com `role = 'gestor'` e histórico `permissoes`.
2. Se a conta usar senha em vez de Google, executar
   `npm --prefix functions run definir:papel -- --email mascarenhasr02@gmail.com --papel gestor --confirmar`.
3. Instalar JDK 21 e executar os testes de regras/integração no emulador.
4. O Front-End substituir `EscolaIndisponivel` pela leitura real do Firestore.
5. Decidir o transporte da notificação individual (ADR-05 × modelo §3.11).
6. Responder LAC-07 para implementar o assistente Gemini.
