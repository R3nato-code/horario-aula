# Contratos do backend

**Versão:** 0.3.0 — 05/11/2026
**Fonte canônica:** `docs/arquitetura/integracoes.md` e ADR-01 a ADR-07.
**Região:** `FUNCTIONS_REGION` (padrão `southamerica-east1`).

---

## 1. Convenções

- Todas as callables são `onCall` v2, autenticadas e validam o ator no servidor.
- Papéis administrativos: `admin` e `gestor`, lidos de `users/{uid}.role`.
- Datas de entrada em ISO 8601; persistência em `Timestamp`.
- Erros usam `HttpsError` com código estável e `details.correlacao`.
- Campos desconhecidos são rejeitados com `invalid-argument`.

| Código | Uso |
|---|---|
| `unauthenticated` | Sem identidade válida. |
| `permission-denied` | Identidade válida sem autorização. |
| `invalid-argument` | Entrada inválida. |
| `not-found` | Registro/referência inexistente. |
| `already-exists` | Duplicidade ou chave de idempotência reutilizada. |
| `failed-precondition` | Conflito, estado inválido ou dependência pendente. |
| `aborted` | Concorrência. |
| `resource-exhausted` | Limite/cota excedido. |
| `unavailable` | Falha temporária. |
| `internal` | Falha inesperada; detalhe apenas no log. |

---

## 2. `garantirPerfil` (callable)

**Requisitos:** RF01, RF02, RF03.
**Arquivo:** `functions/src/features/perfil/funcoes.ts`.

### Entrada

O payload é ignorado, exceto campos de autorização, que são rejeitados:
`role`, `papel`, `claims`, `isAdmin`, `admin`, `permissoes`.

### Comportamento

1. Exige token com `uid` e e-mail.
2. Em transação, cria `users/{uid}` se não existir.
3. O papel inicial é `aluno` (A-01), exceto o gestor inicial: quando o e-mail é
   exatamente `GESTOR_INICIAL_EMAIL` (padrão `mascarenhasr02@gmail.com`), o
   token comprova `email_verified = true` e o provedor é `google.com`, o papel
   inicial é `gestor`. A atribuição grava histórico `permissao` na mesma
   transação, com ator `sistema-bootstrap`.
4. Se o perfil existir com papel inválido, falha com `failed-precondition`.
5. Sincroniza `email` e `displayName` com o Firebase Authentication:
   - `email` do token é autoritativo e é atualizado quando diverge;
   - `displayName` só é atualizado quando o token traz um `name` não vazio;
   - não altera `role` de perfil existente e não grava nada quando não há
     diferença.
6. Essa sincronização corrige a corrida do cadastro por e-mail, em que o
   gatilho `aoCriarUsuario` pode criar o perfil antes de `updateProfile`.
7. O payload continua sem poder enviar `role`, `papel`, `claims`, `isAdmin`,
   `admin` ou `permissoes`.

### Resposta

```json
{
  "perfil": {
    "uid": "abc123",
    "email": "pessoa@escola.test",
    "displayName": "Pessoa",
    "role": "aluno"
  }
}
```

---

## 3. `aoCriarUsuario` (gatilho Auth gen1)

**Requisito:** RF02 (reforço).
**Região:** `us-central1` (limitação de gatilhos Auth gen1).

- Dispara em criação de usuário no Firebase Auth.
- Usa a mesma transação idempotente de `garantirPerfil`.
- Não relança erro: a callable continua sendo o caminho determinístico.

---

## 4. `salvarCadastro` (callable)

**Requisitos:** RF04–RF06, RF48–RF50.
**Autorização:** `admin` ou `gestor`.

### Entrada

```ts
type EntradaSalvarCadastro =
  | { tipo: 'professor'; id?: string; nome: string }
  | { tipo: 'disciplina'; id?: string; nome: string }
  | {
      tipo: 'turma';
      id?: string;
      nome: string;
      serie: string;
      modalidade: 'ensino-medio' | 'tecnico';
      turno: 'manha';
    };
```

- `id` ausente cria com auto-ID.
- `id` presente exige documento existente; não há criação com ID escolhido pelo cliente.
- `status` não é aceito; use `alterarStatusCadastro`.
- Nome: 1–120 caracteres, normalizado (`trim`, espaços colapsados).
- Unicidade de `nome` por coleção via consulta na transação (A-05; ver §15).

### Comportamento

Em uma transação, grava o documento e o histórico `tipo: 'cadastro'`
(`entidade: 'professores'|'disciplinas'|'turmas'`, `alteracao.antes/depois`).
Se nada mudou, retorna `alterado: false` sem histórico.

### Resposta

```ts
interface RespostaSalvarCadastro {
  id: string;
  cadastro: CadastroResposta;
  alterado: boolean;
}
```

### Erros

`invalid-argument`, `not-found` (id informado inexistente), `already-exists` (nome
duplicado), `permission-denied`.

---

## 5. `alterarStatusCadastro` (callable)

**Requisitos:** RF48–RF50; ADR-06.
**Autorização:** `admin` ou `gestor`.

```ts
interface EntradaAlterarStatus {
  tipo: 'professor' | 'disciplina' | 'turma';
  id: string;
  status: 'ativo' | 'arquivado';
}
```

- Arquivar exige **zero aulas** referenciando o cadastro; senão `failed-precondition`
  com `aulasAtivas` e amostra de até 20 aulas.
- Reativar é sempre permitido e devolve o cadastro ao uso.
- Histórico gravado na mesma transação.
- `status: 'excluido'` é rejeitado (PAD-06).

### Resposta

```ts
{ id: string; status: 'ativo' | 'arquivado'; alterado: boolean }
```

---

## 6. `excluirCadastro` (callable)

**Requisitos:** RF51–RF53; ADR-06.
**Autorização:** `admin` ou `gestor`.

```ts
interface EntradaExcluirCadastro {
  tipo: 'professor' | 'disciplina' | 'turma';
  id: string;
}
```

1. Exige `status === 'arquivado'`; senão `failed-precondition`.
2. Exige zero aulas referenciando o cadastro; senão `failed-precondition`.
3. Em transação: grava histórico com snapshot completo em `alteracao.antes` e
   `depois: {}`; exclui o documento.
4. Se for turma, remove favoritos na mesma transação (até 497). Acima disso, agenda
   `outbox` do tipo `limpeza-favoritos`.
5. O histórico nunca é apagado.

### Resposta

```ts
{ id: string; excluido: true }
```

---

## 7. `salvarAula` (callable)

**Requisitos:** RF07, RF13–RF16, RF33, RF41, RF42; ADR-02.
**Autorização:** `admin` ou `gestor`.

### Entrada

```ts
interface EntradaSalvarAula {
  turmaId: string;
  diaSemana: 1 | 2 | 3 | 4 | 5;
  periodo: number;
  disciplinaId: string;
  professorId: string;
  // salaId: rejeitado explicitamente até LAC-23/LAC-24
}
```

### Comportamento

1. Valida dia 1–5, período existente e referências existentes/ativas.
2. Usa o ID `${turmaId}_${diaSemana}_${periodo}`.
3. Deriva `inicio`/`fim` de `configuracao/atual`.
4. Em transação, detecta conflito de professor e turma (sala apenas no cálculo interno)
   contra as aulas do mesmo dia, excluindo a própria aula.
5. Grava aula + histórico na mesma transação. Se nada mudou, retorna `alterado: false`.
6. **Não gera notificação individual nesta versão** — ver §15.

### Resposta

```ts
interface AulaResposta {
  id: string;
  turmaId: string;
  diaSemana: 1 | 2 | 3 | 4 | 5;
  periodo: number;
  disciplinaId: string;
  professorId: string;
  inicio: string;   // HH:MM derivado
  fim: string;      // HH:MM derivado
  criadoEm: string | null;
  atualizadoEm: string | null;
}

interface RespostaSalvarAula {
  aula: AulaResposta;
  alterado: boolean;
}
```

### Erros

`invalid-argument` (dia/período/IDs/salaId), `not-found` (referência),
`failed-precondition` (referência arquivada, conflito, configuração ausente/inválida).

---

## 8. `removerAula` (callable)

**Requisitos:** RF07, RF13.
**Autorização:** `admin` ou `gestor`.

```ts
interface EntradaRemoverAula {
  turmaId: string;
  diaSemana: 1 | 2 | 3 | 4 | 5;
  periodo: number;
}
```

- Slot vazio: retorna `{ removida: true, jaVazia: true }` sem histórico.
- Slot ocupado: grava histórico com snapshot e remove o documento na mesma transação.
- Não gera notificação individual nesta versão (§15).

### Resposta

```ts
{ removida: true; jaVazia?: true }
```

---

## 9. `salvarConfiguracao` (callable)

**Requisitos:** RF36–RF40; ADR-02.
**Autorização:** `admin` ou `gestor`.

```ts
interface EntradaSalvarConfiguracao {
  abertura: string;          // HH:MM
  fechamento: string;        // HH:MM
  periodos: Array<{ numero: number; inicio: string; fim: string }>;
  intervalo: { inicio: string; fim: string } | null;
}
```

1. Valida formato, coerência, duplicidade e sobreposição de períodos.
2. Bloqueia remoção de período que possua aulas (`failed-precondition` com
   `periodosEmUso`).
3. Grava `configuracao/atual` + histórico na mesma transação.
4. Não reescreve aulas; horários são derivados.
5. Retorna a configuração salva e quantas aulas foram afetadas por mudança de horário.

### Resposta

```ts
interface ConfiguracaoResposta {
  abertura: string;
  fechamento: string;
  periodos: Array<{ numero: number; inicio: string; fim: string }>;
  intervalo: { inicio: string; fim: string } | null;
  atualizadoEm: string | null;
  atualizadoPor: string | null;
}

interface RespostaSalvarConfiguracao {
  configuracao: ConfiguracaoResposta;
  aulasAfetadas: number;
}
```

---

## 10. `previaEdicaoEmMassa` (callable)

**Requisitos:** RF23–RF29, RF34, RF35; ADR-03.
**Autorização:** `admin` ou `gestor`. **Não escreve nada.**

```ts
interface EntradaPreviaMassa {
  selecao: { aulaIds: string[] };  // 1..200, únicos
  alteracao: {
    professorId?: string | null;
    disciplinaId?: string | null;
  };                               // ao menos um
}
```

### Resposta

```ts
interface RespostaPreviaMassa {
  total: number;
  alteracoes: Array<{
    aulaId: string;
    turmaId: string;
    diaSemana: number;
    periodo: number;
    antes: { disciplinaId: string; professorId: string };
    depois: { disciplinaId: string; professorId: string };
  }>;
  conflitos: ConflitoHorario[];
}
```

Erros: `resource-exhausted` acima de 200 (`details.maximo = 200`), `invalid-argument`
(seleção vazia/duplicada, alteração vazia), `not-found` (aula/referência),
`failed-precondition` (conflito ou configuração inválida).

---

## 11. `confirmarEdicaoEmMassa` (callable)

**Requisitos:** RF26–RF30, RF34, RF35, RF47; ADR-03.
**Autorização:** `admin` ou `gestor`.

```ts
interface EntradaConfirmarMassa extends EntradaPreviaMassa {
  chaveIdempotencia: string;  // UUID v4
}
```

1. Revalida no servidor toda a prévia; não confia no resultado do cliente.
2. Detecta conflitos contra o estado atual e contra as demais alterações do lote.
3. Aplica no máximo 200 aulas em uma única transação:
   - 200 aulas;
   - 200 históricos com ID `{operacaoId}_{aulaId}`;
   - 1 `operacoes/{chaveIdempotencia}`;
   - 1 `outbox/{evento}`;
   - total 402 escritas.
4. Mesma chave + mesmo `hashPayload` retorna o resultado anterior.
   Mesma chave + hash diferente → `already-exists`.
5. Conflito ou limite excedido → nenhuma escrita.
6. A notificação é criada após o commit pelo gatilho `processarOutbox`.

### Resposta

```ts
interface RespostaConfirmarMassa {
  operacaoId: string;
  aulasAlteradas: number;
  notificacoesAgendadas: boolean;
}
```

---

## 12. `listarHistorico` (callable)

**Requisitos:** RF17–RF22, RF30, RF40; ADR-04.
**Autorização:** `admin` ou `gestor`. `professor` e `aluno` recebem
`permission-denied`. O cliente nunca lê `historico` diretamente.

```ts
interface EntradaListarHistorico {
  tipo?: 'aula' | 'configuracao' | 'cadastro' | 'permissao' | 'sistema';
  entidade?: 'aulas' | 'professores' | 'disciplinas' | 'turmas' | 'configuracao' | 'users' | 'sistema';
  entidadeId?: string;
  responsavelId?: string;
  de?: string;       // ISO 8601
  ate?: string;      // ISO 8601
  limite?: number;   // padrão 50, máximo 100
  cursor?: string;   // opaco
}
```

Regras:

- Apenas um filtro principal entre `tipo`, `entidade` e `responsavelId`.
- `entidadeId` exige `entidade`.
- Ordenação `timestamp DESC`; paginação por cursor opaco.
- O cursor carrega o timestamp e os IDs já devolvidos naquele timestamp. Isso é
  obrigatório porque uma edição em massa grava vários registros no mesmo
  `serverTimestamp()`.

### Resposta

```ts
interface RespostaListarHistorico {
  itens: Array<{
    id: string;
    tipo: string;
    entidade: string;
    entidadeId: string;
    entidadeNome: string;
    descricao: string;
    alteracao: { antes: ValorJson; depois: ValorJson };
    responsavelId: string;
    responsavelNome: string;
    responsavelEmail: string;
    timestamp: string | null;
    operacaoId: string | null;
    correlacao: string | null;
  }>;
  proximoCursor: string | null;
}
```

---

## 13. `processarOutbox` (gatilho Firestore)

**Requisitos:** RF43–RF47; ADR-03/ADR-05.
**Origem:** `outbox/{eventoId}`, `onDocumentCreated`, `retry: true`.

1. Atualiza `status` para `processando` e incrementa `tentativas`.
2. `notificacao-edicao-massa`: consulta favoritos das `turmaIds`, agrupa por `uid` e
   cria `notificacoes/{operacaoId}_{uid}` de forma idempotente.
3. `limpeza-favoritos`: remove favoritos restantes de uma turma excluída, em lotes.
4. Marca `concluido` ou `falhou`; falha é reprocessável e não desfaz a edição.
5. Criação em lotes de até 500 operações.

---

## 14. Favoritos e notificações (acesso direto)

Não há callable para essas operações; o cliente acessa diretamente o Firestore com as
regras de `firestore.rules`.

### Favoritos

```ts
setDoc(doc(db, 'favoritos', `${uid}_${turmaId}`), {
  uid,
  turmaId,
  criadoEm: serverTimestamp(),
});
deleteDoc(doc(db, 'favoritos', `${uid}_${turmaId}`));
```

Leitura: `where('uid','==',uid)`, `orderBy('criadoEm','desc')` (IDX-09).
Update negado. A regra valida o ID, o `uid` e a existência da turma.

### Notificações

```ts
query(
  collection(db, 'notificacoes'),
  where('uid', '==', uid),
  orderBy('criadoEm', 'desc'),
  limit(50),
);
update(doc(db, 'notificacoes', id), { lida: true, lidaEm: serverTimestamp() });
```

A regra aceita somente `lida` e `lidaEm`, exige coerência entre os dois e mantém
`uid`, `tipo`, `turmaIds`, `criadoEm` e `expiraEm` inalterados.

---

## 15. Pendência de contrato: notificação individual

A ADR-05 §2.5 determina que “alteração individual gera uma notificação por aula/turma”.
O modelo de dados §3.11, porém, define `outbox.tipo` apenas como
`'notificacao-edicao-massa'` e o fluxo documentado de fan-out parte da edição em massa.

**Estado atual:** `salvarAula` e `removerAula` gravam histórico, mas **não** criam
notificação. Implementar isso exige decidir:

- novo tipo de outbox (`notificacao-aula`) ou notificação direta na transação;
- agrupamento e ID determinístico para alteração individual;
- limite de favoritos por turma e comportamento acima do limite.

Sem essa decisão, a implementação falharia por inventar contrato. Registrado como
pendência em `docs/backend/lacunas-e-bloqueios.md` §3.

---

## 16. Scripts operacionais de perfil e papel

Não são Cloud Functions e não são acessíveis pelo cliente. Exigem `--confirmar`
e credenciais administrativas (ADC ou service account fora do repositório).

### 16.1 `bootstrap-gestor`

```powershell
node functions/lib/scripts/bootstrap-gestor.js --email <email> --confirmar
node functions/lib/scripts/bootstrap-gestor.js --uid <uid> --email <email> --confirmar
```

- Resolve o usuário no Firebase Authentication por `--email` ou `--uid`.
- Se `users/{uid}` não existir, cria com `role = 'gestor'`.
- Se existir, altera o papel para `gestor`.
- Grava histórico `permissao` na mesma transação.
- Idempotente: se já for gestor e os dados derivados estiverem iguais, não escreve.

### 16.2 `definir-papel`

```powershell
node functions/lib/scripts/definir-papel.js --email <email> --papel <papel> --confirmar
```

- Papéis aceitos: `gestor`, `admin`, `professor`, `aluno`.
- Cria o perfil a partir do Auth quando ausente.
- Sincroniza `email` e `displayName`.
- Grava histórico `permissao` na mesma transação.
- Não é uma API de gestão de usuários: o contrato de cliente continua bloqueado
  por LAC-09.

## 17. Contratos ainda não implementados

| Contrato | Bloqueio |
|---|---|
| `perguntarAoAssistente` | LAC-07 (ferramentas, custos, retenção). |
| `listarUsuarios`, `concederAdmin`, `revogarAdmin` | LAC-09, LAC-03/RF58. |
| Qualquer operação com `salaId` | LAC-23/LAC-24. |
| Restauração de histórico | Fora do escopo da v1. |
