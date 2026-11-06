# Estrutura de pastas e módulos

**Versão:** 1.0
**Data:** 03/11/2026
**Status:** alvo para a implementação dos módulos desbloqueados por ADR-01 a ADR-07.
**Observação:** este documento não cria código; define onde cada responsabilidade deve morar.

---

## 1. Front-end

```text
src/
  app/                         # bootstrap, rotas, providers, contexto de sessão
  components/                  # componentes visuais sem regra de negócio
  features/
    autenticacao/
    consulta/
    painel/
    cadastros/                 # CRUD de professores, disciplinas e turmas
    configuracoes/             # configuração de horários
    historico/                 # consulta administrativa de histórico
    notificacoes/
    assistente/
  lib/
    firebase/
      cliente.ts               # inicialização existente
      conversoes.ts            # Timestamp <-> ISO; doc <-> domínio
      consultas.ts             # queries reutilizáveis e tipadas
    utilidades.ts
  services/
    contratos.ts               # interfaces existentes
    firebase/
      autenticacaoFirebase.ts  # existente
      escolaFirebase.ts        # catálogo, aulas, configuração, histórico
      notificacoesFirebase.ts  # leitura própria e marcação de lida
      favoritosFirebase.ts     # favoritos próprios
      assistenteFirebase.ts    # perguntarAoAssistente
    demo/                      # modo demonstração existente
  types/
    dominio.ts                 # tipos de domínio
    contratos.ts               # DTOs de callable (espelho do backend)
  styles/
  assets/
  pwa/
```

### 1.1 Regras de organização

- `features/<dominio>/` contém páginas, hooks e componentes específicos do domínio.
- `components/` não conhece Firestore nem Cloud Functions.
- `services/` é a única camada que chama `httpsCallable` ou `firebase/firestore`.
- `lib/firebase/conversoes.ts` é obrigatório: o cliente não manipula `Timestamp` cru.
- `types/dominio.ts` reflete o schema canônico (ADR-01): `turno`, `criadoEm`,
  `atualizadoEm`, `salaId?`, `RegistroHistorico` estendido, `Notificacao.turmaIds`.

---

## 2. Cloud Functions

```text
functions/src/
  index.ts                     # exporta callables e gatilhos
  core/                        # admin SDK, autorização, erros, correlação (existente)
  contracts/                   # DTOs de entrada/saída
  domain/
    cadastros/
      validacao.ts             # nome, enums, normalização
      slugs.ts                 # IDs determinísticos do seed
    horarios/
      sobreposicao.ts          # existente
      configuracao.ts          # existente
      identidade.ts            # composição do ID da aula
      conflitos.ts             # adaptação para o schema canônico
    historico/
      modelo.ts                # tipos de registro e snapshot
      servico.ts               # gravação append-only
  features/
    perfil/                    # existente
    cadastros/
      funcoes.ts               # salvarCadastro, alterarStatusCadastro, excluirCadastro
      servico.ts
    aulas/
      funcoes.ts               # salvarAula, removerAula
      servico.ts
      emMassa.ts               # prévia e confirmação
    configuracao/
      funcoes.ts
    historico/
      funcoes.ts               # listarHistorico
      consulta.ts
    notificacoes/
      fanout.ts                # gatilho do outbox
    assistente/
      funcoes.ts               # perguntarAoAssistente
      ferramentas.ts           # allowlist
      gemini.ts
      limite.ts
  triggers/
    outbox.ts                  # onDocumentCreated
  scripts/
    bootstrap-gestor.ts        # existente
    seed-horarios.ts
    dados/
      horarios-2026.json       # fonte versionada do seed
```

### 2.1 Regras de organização

- `features/<dominio>/funcoes.ts` expõe callables; não contém regra pura.
- `domain/` não importa Admin SDK nem Firestore; é testável isoladamente.
- `core/` concentra autorização, erros, correlação e Admin SDK.
- `scripts/` nunca é exportado em `index.ts`.
- `contracts/` espelha `src/types/contratos.ts`; mudanças nos dois lados no mesmo PR.

---

## 3. Configurações e infraestrutura

```text
firebase.json                  # functions, firestore, emuladores
firestore.rules                # atualizar caminhos e notificações/favoritos
firestore.indexes.json         # IDX-01 a IDX-09
.firebaserc
```

### 3.1 Mudanças obrigatórias nas regras

| Antes | Depois |
|---|---|
| `professors` | `professores` |
| `subjects` | `disciplinas` |
| `horarios` | `aulas` |
| `historico` fechado | mantém fechado; consulta via callable |
| `notificacoes` fechado | leitura/update do próprio `uid` |
| `favoritos` fechado | CRUD do próprio `uid` |
| `operacoes`, `outbox`, `assistente_uso` | fechados |
| `classrooms` | `salas` fechada (ou remover até LAC-23) |

---

## 4. Dados e seed

| Arquivo | Papel |
|---|---|
| `Plano/arquitetura/modelo-dados-firestore.md` (seção 4) | Fonte histórica dos horários. |
| `functions/src/scripts/dados/horarios-2026.json` | Entrada versionada do seed. |
| `src/services/demo/dadosIniciais.ts` | Fixture do modo demonstração. |

**Risco:** as duas representações podem divergir. O seed deve validar 420 IDs únicos,
14 turmas, 5 dias e 6 períodos; o modo demo deve manter os mesmos IDs de turma. Uma
verificação automatizada de contagem e nomes normalizados deve ser adicionada quando o
seed for implementado.

---

## 5. Testes

| Tipo | Local sugerido | Cobertura mínima |
|---|---|---|
| UNIT | `functions/src/domain/**/*.test.ts` | ID da aula, conflito, configuração, validação de cadastro, slug, hash de payload. |
| INT | `functions/test/` | Contratos de callable, autorização, transações, idempotência. |
| SEC | `test/rules/` | Regras do Firestore (requer JDK 21). |
| E2E | `e2e/` (front-end) | Login, consulta, edição individual, massa, notificações. |

O ambiente atual não executa testes de regras por falta de JDK 21. Isso é um bloqueio
operacional, não uma decisão de arquitetura.
