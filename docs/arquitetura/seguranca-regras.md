# Segurança e regras do Firestore

**Versão:** 1.0
**Data:** 03/11/2026
**Status:** canônico; substitui a matriz de `docs/backend/regras-firestore.md` quanto aos
caminhos das coleções.
**Decisões:** ADR-01, ADR-04, ADR-05.

> **Estado atual:** o repositório está no modelo Client-Only. A matriz abaixo descreve o
> modelo server-side histórico (ADR-01 a ADR-07); as regras vigentes estão em
> `firestore.rules`. Para a superfície pública do deploy, ver
> `docs/arquitetura/deploy-render.md`.

---

## 1. Modelo de ameaças

| RISCO | Ameaça | Mitigação |
|---|---|---|
| RISCO-01 | Cliente tenta escrever diretamente em catálogo, aulas, configuração ou histórico. | Regras `allow write: if false`; toda escrita de domínio via Admin SDK. |
| RISCO-02 | Usuário tenta se autoatribuir `admin`/`gestor`. | `users` é somente leitura do próprio perfil; papel só pelo servidor. |
| RISCO-03 | Usuário lê notificações ou favoritos de outro. | Regras exigem `request.auth.uid == resource.data.uid`; consultas sem filtro falham. |
| RISCO-04 | Usuário adultera o estado de leitura de notificação alheia. | Update restrito ao dono e aos campos `lida`/`lidaEm`. |
| RISCO-05 | Administrador tenta apagar/editar histórico. | `historico` fechado ao cliente; consulta só por callable; append-only no servidor. |
| RISCO-06 | Cliente contorna validação de conflito. | Conflito sempre revalidado no servidor; regras negam escrita de aula. |
| RISCO-07 | Abuso de edição em massa para esgotar cota. | Limite de 200, transação, idempotência e autorização administrativa. |
| RISCO-08 | Prompt injection no assistente para acessar dados indevidos. | Ferramentas allowlist, somente leitura, sem acesso a `users`/histórico; prompt de sistema restritivo. |
| RISCO-09 | Vazamento da chave Gemini. | Secret Manager; nunca no cliente, `.env` público ou repositório. |
| RISCO-10 | Regra publicada com erro e sem teste. | Testes no emulador antes do deploy; JDK 21 pendente. |

---

## 2. Matriz de acesso (cliente)

| Caminho | `get` | `list` | `create` | `update` | `delete` |
|---|---|---|---|---|---|
| `users/{uid}` | próprio `uid` | negado | negado | negado | negado |
| `professores/{id}` | autenticado | autenticado | negado | negado | negado |
| `disciplinas/{id}` | autenticado | autenticado | negado | negado | negado |
| `turmas/{id}` | autenticado | autenticado | negado | negado | negado |
| `aulas/{id}` | autenticado | autenticado | negado | negado | negado |
| `configuracao/{id}` | autenticado | autenticado | negado | negado | negado |
| `historico/{id}` | negado | negado | negado | negado | negado |
| `notificacoes/{id}` | próprio `uid` | próprio `uid` | negado | próprio `uid`, só `lida`/`lidaEm` | negado |
| `favoritos/{id}` | próprio `uid` | próprio `uid` | próprio `uid` + turma existente | negado | próprio `uid` |
| `operacoes/{id}` | negado | negado | negado | negado | negado |
| `outbox/{id}` | negado | negado | negado | negado | negado |
| `assistente_uso/{id}` | negado | negado | negado | negado | negado |
| `salas/{id}` | negado | negado | negado | negado | negado |
| Qualquer outro | negado | negado | negado | negado | negado |

> A leitura autenticada do catálogo/aulas inclui registros arquivados. A aplicação filtra
> por `status`; o admin acessa a seção Arquivados (RF49). As regras não filtram campo para
> não depender do schema em tempo de avaliação.

---

## 3. Condições das regras

### 3.1 Funções auxiliares

```text
autenticado() = request.auth != null
mesmoUsuario(uid) = autenticado() && request.auth.uid == uid
```

### 3.2 Notificações

- `get`: `mesmoUsuario(resource.data.uid)`
- `list`: `mesmoUsuario(resource.data.uid)` — a consulta deve incluir
  `where('uid','==',request.auth.uid)`.
- `update`: `mesmoUsuario(resource.data.uid)`
  - `request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lida','lidaEm'])`
  - `request.resource.data.uid == resource.data.uid`
  - `request.resource.data.tipo == resource.data.tipo`
  - `request.resource.data.lida == true` implica `request.resource.data.lidaEm != null`
  - `request.resource.data.lida == false` implica `request.resource.data.lidaEm == null`
- `create`, `delete`: negados.

### 3.3 Favoritos

- Doc ID: `{uid}_{turmaId}`.
- `get`/`list`: `mesmoUsuario(resource.data.uid)`.
- `create`:
  - `mesmoUsuario(request.resource.data.uid)`
  - `favoritoId == request.auth.uid + '_' + request.resource.data.turmaId`
  - `exists(/databases/$(database)/documents/turmas/$(request.resource.data.turmaId))`
  - `request.resource.data.keys().hasOnly(['uid','turmaId','criadoEm'])`
- `update`: negado.
- `delete`: `mesmoUsuario(resource.data.uid)`.

### 3.4 Catálogo, aulas e configuração

- `read`: `autenticado()`.
- `write`: `false`.
- Nenhuma exceção para `admin`/`gestor`: a escrita é feita pelo Admin SDK, que ignora as
  regras.

### 3.5 Histórico, operações, outbox e uso do assistente

- `read`, `write`: `false`.
- Consulta de histórico somente via `listarHistorico`, com autorização server-side.
- Criação de histórico somente nas transações das funções.

### 3.6 Salas

- `read`, `write`: `false` até LAC-23/LAC-24.

---

## 4. Autorização server-side

| PERM | Perfil | Operação | Validação no servidor | Regra Firestore |
|---|---|---|---|---|
| PERM-01 | `aluno`, `professor` | Ler catálogo, aulas, configuração, notificações próprias, favoritos próprios. | Token válido. | Leitura autenticada; notificações/favoritos só do próprio `uid`. |
| PERM-02 | `admin` | CRUD de professores, disciplinas e turmas; aulas; configuração; histórico. | `role ∈ {admin, gestor}`. | Escrita negada; função usa Admin SDK. |
| PERM-03 | `gestor` | Tudo de `admin` + concessão/revogação de admin (RF58, pendente). | `role === 'gestor'`; contrato ainda não definido. | Escrita negada; função usa Admin SDK. |
| PERM-04 | `professor` | Consultar horários; favoritar; notificações. | Token válido. | Leitura autenticada; favoritos/notificações próprios. |
| PERM-05 | `aluno` | Consultar horários; favoritar; notificações; assistente. | Token válido. | Leitura autenticada; favoritos/notificações próprios. |
| PERM-06 | `admin` | Ler histórico. | `role ∈ {admin, gestor}`. | `historico` fechado; callable. |
| PERM-07 | `aluno`, `professor` | Ler histórico. | Negado. | `historico` fechado. |
| PERM-08 | `admin`/`gestor` | Editar em massa. | Papel + limite 200 + conflitos. | Escrita negada; transação. |
| PERM-09 | Qualquer autenticado | Assistente. | Cota por usuário/dia e minuto. | `assistente_uso` fechado. |

### 4.1 Claims

- Nesta versão, a autoridade é `users/{uid}.role`, lida pelo Admin SDK.
- **Custom claims não são usadas** porque a arquitetura de autenticação/claims ainda não
  possui ADR própria. Se forem adotadas, as regras e funções devem ser atualizadas na
  mesma entrega, com teste de regressão.
- O cliente nunca envia `role`, `papel`, `claims` ou `isAdmin`; esses campos são rejeitados
  com `invalid-argument`.

---

## 5. Segredos e ambientes

| Item | Regra |
|---|---|
| Gemini API key | Secret Manager; acessível apenas pela Cloud Function. |
| Service account / ADC | Fora do repositório; usada pelo script de seed e pelo Admin SDK. |
| `.env` do front-end | Apenas configuração pública do Firebase; nunca chave de IA. |
| Render | Hospeda o front-end; não executa Cloud Functions. |
| Emuladores | Podem usar credenciais locais; nunca commitar. |

### 5.1 Superfície pública no Render

| Item | Regra |
|---|---|
| Conteúdo publicado | Apenas `dist/` (HTML, JS, CSS, ícones, manifest, service worker). |
| Configuração embutida | Somente `VITE_*` públicas do Firebase. Nenhum segredo. |
| Autorização | Firebase Authentication + `firestore.rules`; o Render não autentica nem autoriza. |
| Domínios de login | `*.onrender.com` e domínio customizado precisam estar em **Authorized domains**. |
| Previews de PR | Desligados por padrão; cada preview teria domínio próprio e exigiria autorização manual. |
| Cabeçalhos | COOP `same-origin-allow-popups`, `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, HSTS. |
| Regras/índices | Publicados pelo Firebase CLI, em etapa separada do build do Render. |

---

## 6. Abuso e limites

| Item | Decisão |
|---|---|
| Login | Sem restrição de domínio Google na v1 (LAC-20). |
| Assistente | 30/dia e 5/minuto por usuário; 1000/dia global. |
| Edição em massa | 200 aulas; acima disso, `resource-exhausted`. |
| Histórico | Paginação máxima de 100. |
| Notificações | Leitura máxima de 50 por consulta. |
| Seed | Execução humana com `--confirmar`; não exposto como callable. |

---

## 7. Testes de regras

- O emulador do Firestore exige JDK 21; o ambiente atual possui Java 8.
- Enquanto o JDK 21 não for instalado, nenhuma regra nova deve ser publicada sem revisão
  manual e teste de integração com o emulador em outra máquina/CI.
- Casos mínimos:
  1. Aluno não escreve em `aulas`/`professores`.
  2. Aluno não lê notificação de outro.
  3. Aluno não altera `uid`, `tipo` ou `turmaIds` de notificação.
  4. Aluno cria favorito com doc ID divergente do `uid` → negado.
  5. Aluno lê histórico → negado.
  6. Admin lê histórico via callable → permitido; direto → negado.
  7. Consulta de notificações sem filtro `uid` → negada.
