# Estrutura de pastas e módulos

**Versão:** 1.1
**Data:** 07/11/2026
**Status:** alinhado ao estado real do repositório (Client-Only) e ao deploy no Render.
**Observação:** este documento não cria código; define onde cada responsabilidade deve morar.

---

## 1. Front-end

```text
src/
  app/                         # bootstrap, rotas, providers e contextos globais
    roteamento.ts              # hash routing (#/rota)
    servicos.ts                # seleção demo × firebase
    ContextoAutenticacao.tsx
    ContextoFavoritos.tsx
    ContextoNotificacoes.tsx
    ContextoServicos.tsx
    ContextoToast.tsx
    useAtualizacaoPwa.ts
    useConsulta.ts
  components/
    layout/AppShell.tsx
    ui/                        # componentes visuais sem regra de negócio
    Icone.tsx
  features/
    auth/                      # login, cadastro, recuperação, Google
    consulta/                  # turmas, professores e horários
    favoritos/
    horarios/                  # grade semanal
    notificacoes/
    painel/                    # cadastros, aulas, configuração, histórico
    sistema/                   # páginas institucionais e de erro
  lib/
    firebase/
      cliente.ts               # inicialização do Firebase
      conversoes.ts            # Timestamp <-> ISO; doc <-> domínio
    constantes.ts
    useTituloPagina.ts
    utilidades.ts
    validacaoHorarios.ts
  services/
    contratos.ts               # interfaces dos serviços
    erros.ts                   # ErroDeServico e códigos
    validacao.ts
    firebase/
      autenticacaoFirebase.ts  # Auth + perfil users/{uid}
      escolaFirebase.ts        # catálogo, aulas, configuração, histórico
    demo/                      # modo demonstração local
  types/
    dominio.ts                 # tipos de domínio
    contratos.ts               # DTOs compartilhados
  styles/                      # tokens, base, componentes, layout, páginas
  main.tsx
  App.tsx
  vite-env.d.ts
```

### 1.1 Regras de organização

- `features/<dominio>/` contém páginas, hooks e componentes específicos do domínio.
- `components/` não conhece Firestore nem regras de negócio.
- `services/` é a única camada que chama `firebase/firestore` ou `firebase/auth`.
- `lib/firebase/conversoes.ts` é obrigatório: o cliente não manipula `Timestamp` cru.
- `types/dominio.ts` reflete o schema canônico (ADR-01).
- O roteamento é por hash; não introduzir `BrowserRouter` sem manter o rewrite do Render.

---

## 2. Back-end server-side

**Estado atual:** a pasta `functions/` **não existe**. Ela foi removida na transição
Client-Only documentada em `guia-refatoracao-client-side.md`.

Se Cloud Functions forem reintroduzidas no futuro:

- o código deve voltar em `functions/src/`, com deploy pelo **Firebase CLI**;
- o Render **não** executa Cloud Functions;
- a estrutura de referência histórica permanece em `docs/arquitetura/estrutura-pastas.md`
  (versão 1.0) e nos ADR-01 a ADR-07;
- a decisão de reintrodução exige nova ADR e análise de impacto.

---

## 3. Configurações e infraestrutura

```text
firebase.json                  # firestore e emuladores
firestore.rules                # regras publicadas pelo Firebase CLI
firestore.indexes.json         # índices publicados pelo Firebase CLI
.firebaserc                    # projeto complementacao-horario-aula
render.yaml                    # PROPOSTO em ADR-08; ainda não existe
.env.example                   # modelo de variáveis públicas
package.json
package-lock.json
vite.config.ts
tsconfig.json
tsconfig.app.json
tsconfig.node.json
index.html
public/
  favicon.svg
  manifest.webmanifest
  sw.js
  icons/
scripts/
  bootstrap-gestor.ts          # bootstrap operacional do primeiro gestor
```

### 3.1 Regras do Firestore — estado atual

A migração de caminhos descrita na versão 1.0 deste documento **já foi aplicada**:
`professores`, `disciplinas`, `turmas`, `aulas`, `configuracao`, `historico`,
`notificacoes`, `favoritos`, `users`, `salas`. O arquivo `firestore.rules` é a fonte
vigente; a tabela “antes/depois” da versão 1.0 permanece apenas como histórico.

### 3.2 Arquivos de deploy

| Arquivo/configuração | Papel |
|---|---|
| `render.yaml` (proposto) | Blueprint do Static Site: build, publish, env, rewrite e headers. |
| `dist/` | Artefato publicado; gerado por `npm run build`; não versionado. |
| `public/sw.js` | Service worker copiado para `dist/sw.js`. |
| `public/manifest.webmanifest` | Manifesto PWA copiado para `dist/`. |
| `public/icons/` | Ícones copiados para `dist/icons/`. |
| `.env.example` | Documenta as variáveis `VITE_*`; nunca contém segredo. |

Especificação completa: `docs/arquitetura/deploy-render.md`.

---

## 4. Dados e seed

| Arquivo | Papel |
|---|---|
| `src/services/demo/dadosIniciais.ts` | Fixture do modo demonstração. |
| `src/services/demo/semente.ts` | Semeadura do banco local do modo demo. |
| `src/services/demo/banco.ts` | Persistência local do modo demo. |
| `scripts/bootstrap-gestor.ts` | Bootstrap operacional do primeiro gestor (não grava no Firestore). |

**Observação:** não existe, no estado atual, script de seed do Firestore em produção. O
modo demo é local ao navegador e não substitui a carga real.

---

## 5. Testes

| Tipo | Situação atual | Cobertura mínima desejada |
|---|---|---|
| UNIT | Não há suíte automatizada no repositório. | Regras de conflito, configuração, validação e conversões. |
| INT | Não há suíte automatizada. | Serviços Firebase e fluxos de autenticação. |
| SEC | Não há suíte automatizada; JDK 21 ausente. | Regras do Firestore no emulador. |
| E2E | Não há suíte automatizada. | Login, consulta, edição individual, massa e notificações. |

A ausência de testes de regras é o **RISCO-23**. O deploy no Render não substitui testes:
o build valida tipos, não comportamento nem autorização.

---

## 6. Deploy

| Etapa | Onde | Comando/ação |
|---|---|---|
| Build do front-end | Render | `npm ci && npm run build` |
| Publicação | Render | diretório `dist` |
| Regras do Firestore | Firebase CLI | `firebase deploy --only firestore:rules` |
| Índices do Firestore | Firebase CLI | `firebase deploy --only firestore:indexes` |
| Bootstrap do gestor | Operação manual | `scripts/bootstrap-gestor.ts` + operação administrativa |

O deploy do Render e o deploy do Firebase são **etapas separadas** do mesmo release. Ver
`docs/arquitetura/deploy-render.md`.
