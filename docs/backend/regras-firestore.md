# Regras do Firestore

**Arquivo:** `firestore.rules`
**Versão:** 0.4.0 — 06/11/2026
**Fonte de verdade:** `docs/arquitetura/seguranca-regras.md` (v1.0).
**Decisões:** ADR-01 (schema), ADR-04 (histórico), ADR-05 (notificações/favoritos).
**Princípio:** negar por padrão; o cliente não escreve dados de domínio.

> **Cobertura do modelo:** as 13 coleções canônicas de
> `docs/arquitetura/modelo-dados-firestore.md` §3 estão declaradas explicitamente:
> `users`, `professores`, `disciplinas`, `turmas`, `aulas`, `configuracao`,
> `historico`, `notificacoes`, `favoritos`, `operacoes`, `outbox`,
> `assistente_uso` e `salas`. O catch-all continua negando qualquer caminho não
> previsto.

---

## 1. Matriz de acesso (cliente)

| Caminho | `get` | `list` | `create` | `update` | `delete` |
|---|---|---|---|---|---|
| `users/{uid}` | próprio `uid` | negado | próprio `uid`, somente `role = aluno` | negado | negado |
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

> A leitura autenticada do catálogo e das aulas inclui registros arquivados. A aplicação
> filtra por `status`; o administrador acessa a seção "Arquivados" (RF49). As regras não
> filtram campo para não depender do schema em tempo de avaliação.

---

## 2. Condições implementadas

### 2.1 Funções auxiliares

```text
autenticado() = request.auth != null
mesmoUsuario(uid) = autenticado() && request.auth.uid == uid
```

### 2.2 Usuários (RF02/RF03)

```text
match /users/{uid} {
  allow get: if mesmoUsuario(uid);
  allow list, delete: if false;

  allow create: if mesmoUsuario(uid)
    && request.resource.data.keys().hasOnly([
      'uid', 'email', 'displayName', 'role', 'updatedAt'
    ])
    && request.resource.data.uid == uid
    && request.resource.data.role == 'aluno'
    && request.resource.data.displayName is string
    && request.resource.data.displayName.size() > 0
    && request.resource.data.displayName.size() <= 120
    && request.resource.data.updatedAt == request.time;

  allow update: if false;
}
```

> **Exceção temporária de bootstrap:** enquanto as Cloud Functions não estiverem
> publicadas, o cliente pode criar **apenas o próprio** perfil e **apenas** com
> `role = 'aluno'`. O perfil existente nunca pode ser alterado pelo cliente. Papéis
> administrativos continuam exclusivos do Admin SDK. A exceção deve ser removida quando
> `garantirPerfil`/`aoCriarUsuario` estiverem em produção, retornando `create` para
> `false`, conforme a arquitetura.

- O perfil é lido pelo cliente somente no próprio `uid`.
- O cliente não altera `role`, `email`, `displayName` nem qualquer campo de autorização.
- O papel é lido no servidor de `users/{uid}.role`; não há custom claims nesta versão.

### 2.3 Catálogo, aulas e configuração

```text
allow read: if autenticado();
allow write: if false;
```

- Vale para `professores`, `disciplinas`, `turmas`, `aulas` e `configuracao`.
- Não existe exceção para `admin`/`gestor`: a escrita é feita por Cloud Function com
  Admin SDK, que ignora as regras.

### 2.4 Histórico (ADR-04)

```text
match /historico/{id} {
  allow read, write: if false;
}
```

- Append-only. Nenhum cliente, inclusive administrador, lê ou escreve diretamente.
- Consulta somente pela callable `listarHistorico`, com autorização server-side.
- Gravação apenas nas transações das funções.

### 2.5 Notificações (ADR-05)

```text
allow get: if mesmoUsuario(resource.data.uid);
allow list: if mesmoUsuario(resource.data.uid);
allow create, delete: if false;

allow update: if mesmoUsuario(resource.data.uid)
  && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lida', 'lidaEm'])
  && request.resource.data.lida == true
  && request.resource.data.lidaEm == request.time
  && resource.data.lida == false;
```

- A consulta de listagem deve incluir `where('uid','==',request.auth.uid)`; sem o filtro
  a regra nega a consulta (fail closed).
- O `update` aceita somente `lida` e `lidaEm`, exige `lida = true` e
  `lidaEm = request.time`, e só é permitido a partir de uma notificação ainda não lida.
- Criação e exclusão são exclusivas do servidor (outbox).

### 2.6 Favoritos (ADR-05)

```text
allow get, list: if mesmoUsuario(resource.data.uid);
allow update: if false;

allow create: if mesmoUsuario(request.resource.data.uid)
  && favoritoId == request.auth.uid + '_' + request.resource.data.turmaId
  && request.resource.data.keys().hasOnly(['uid', 'turmaId', 'criadoEm'])
  && request.resource.data.criadoEm == request.time
  && exists(/databases/$(database)/documents/turmas/$(request.resource.data.turmaId));

allow delete: if mesmoUsuario(resource.data.uid);
```

- Doc ID obrigatório: `{uid}_{turmaId}`.
- `criadoEm` deve ser exatamente o tempo do servidor da requisição.
- A turma precisa existir; turma excluída deixa o favorito órfão apenas até a limpeza
  transacional/outbox.
- Update negado: favoritar é criar; desfavoritar é excluir.

### 2.7 Coleções internas e salas

```text
match /operacoes/{id}   { allow read, write: if false; }
match /outbox/{id}      { allow read, write: if false; }
match /assistente_uso/{id} { allow read, write: if false; }
match /salas/{id}       { allow read, write: if false; }
```

- `operacoes` guarda a idempotência da edição em massa.
- `outbox` é o transporte interno de notificações/limpezas.
- `assistente_uso` será o controle de cota do assistente (LAC-07).
- `salas` permanece fechada até LAC-23/LAC-24.

### 2.8 Catch-all

```text
match /{document=**} {
  allow read, write: if false;
}
```

Qualquer coleção não prevista é negada por padrão.

---

## 3. Decisões de segurança

1. **Nenhuma escrita direta**, nem para administrador. Toda operação sensível passa por
   Cloud Function com validação de perfil, conflito e transação.
2. **Histórico totalmente fechado** ao cliente. A consulta (RF21) é a callable
   `listarHistorico`, com paginação e filtros validados.
3. **Perfil somente leitura do próprio documento.** O cliente não altera `role`, `email`
   ou `displayName`.
4. **Sem claims nesta versão.** A autorização server-side lê `users/{uid}.role`. Se a
   arquitetura adotar custom claims, regras e funções devem mudar na mesma entrega.
5. **Salas fechadas** até decisão de LAC-23/LAC-24.
6. **Denormalização inexistente nas regras:** nomes de professor/disciplina/turma não são
   copiados para `aulas`; a leitura cruza IDs nas coleções de catálogo.
7. **Admin SDK ignora as regras.** Por isso a validação de autorização e negócio é
   obrigatória nas funções, não apenas nas regras.

---

## 4. Índices

`firestore.indexes.json` contém IDX-01 a IDX-09, conforme
`docs/arquitetura/modelo-dados-firestore.md` §5:

| ID | Coleção | Campos |
|---|---|---|
| IDX-01 | `aulas` | `turmaId`, `diaSemana`, `periodo` |
| IDX-02 | `aulas` | `professorId`, `diaSemana`, `periodo` |
| IDX-03 | `aulas` | `disciplinaId`, `diaSemana`, `periodo` |
| IDX-04 | `historico` | `entidade`, `entidadeId`, `timestamp DESC` |
| IDX-05 | `historico` | `tipo`, `timestamp DESC` |
| IDX-06 | `historico` | `responsavelId`, `timestamp DESC` |
| IDX-07 | `notificacoes` | `uid`, `criadoEm DESC` |
| IDX-08 | `notificacoes` | `uid`, `lida`, `criadoEm DESC` |
| IDX-09 | `favoritos` | `uid`, `criadoEm DESC` |

Nenhum índice foi criado "por precaução". Alterações exigem justificativa e aprovação do
Arquiteto, conforme o protocolo.

---

## 5. Testes de regras

**Estado:** não executados neste ambiente.

O Firestore Emulator exige JDK 21+ e o ambiente possui Java 1.8.0_361. O comando
`firebase emulators:exec --only firestore` responde:

```text
Error: firebase-tools no longer supports Java version before 21.
```

Casos mínimos que devem rodar antes de qualquer publicação:

1. Aluno não escreve em `aulas`, `professores`, `disciplinas`, `turmas` ou `configuracao`.
2. Aluno não lê notificação de outro.
3. Aluno não altera `uid`, `tipo`, `turmaIds` ou `criadoEm` de notificação.
4. Aluno não cria favorito com doc ID divergente do `uid`.
5. Aluno não cria favorito para turma inexistente.
6. Aluno lê histórico → negado.
7. Admin lê histórico direto → negado; via callable → permitido.
8. Consulta de notificações sem filtro `uid` → negada.
9. `users` update/delete pelo próprio dono → negado; `create` do próprio perfil com
   `role = 'aluno'` → permitido; `create` com `role = 'admin'` → negado.
10. `operacoes`, `outbox`, `assistente_uso` e `salas` → negados para todos.

Enquanto não houver teste automatizado no emulador, nenhuma alteração de regra deve ser
publicada sem revisão manual e execução em CI com JDK 21.
