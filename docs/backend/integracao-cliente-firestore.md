# Integração do cliente com Firestore e Functions

**Versão:** 1.0 — 06/11/2026
**Escopo:** contrato operacional para o Front-End consumir o backend sem Cloud
Functions publicadas.
**Fontes:** `docs/arquitetura/modelo-dados-firestore.md` (v1.0),
`docs/arquitetura/padroes-tecnicos.md` (PAD-16), ADR-04 e ADR-05.

> Este documento descreve o contrato. A implementação em `src/**` pertence ao
> Agente Front-End e não é alterada pelo Agente 4.

---

## 1. Situação operacional

Em 06/11/2026 o projeto `complementacao-horario-aula` **não possui Cloud
Functions publicadas**. Portanto:

- O perfil inicial precisa ser criado pelo cliente, de forma idempotente, com
  `role = 'aluno'`, enquanto a exceção temporária de `firestore.rules` estiver
  publicada.
- Catálogo, aulas, configuração, próprias notificações e próprios favoritos são
  lidos diretamente no Firestore (PAD-16).
- Operações administrativas (`salvarAula`, `salvarCadastro`,
  `alterarStatusCadastro`, `excluirCadastro`, `salvarConfiguracao`,
  `listarHistorico`) chamam callables. Sem Functions, devem falhar com mensagem
  clara de “operação não disponível”, sem simular escrita local.
- `listarHistorico` pode retornar `[]` quando a callable não existe
  (`functions/not-found`, `functions/unimplemented` ou `functions/internal`),
  para não derrubar o painel inteiro. Erros de `permission-denied` e
  `invalid-argument` **não** podem ser mascarados.

---

## 2. Perfil inicial (`users/{uid}`)

O cliente deve criar o perfil somente quando o `getDoc` não encontrar o
documento. O papel é sempre `aluno`. Nunca aceitar `role`, `papel`, `claims`,
`isAdmin` ou `permissoes` de formulário.

```ts
await runTransaction(db, async (tx) => {
  const ref = doc(db, 'users', uid);
  const atual = await tx.get(ref);
  if (atual.exists()) return;

  const email = (user.email ?? '').trim().toLowerCase();
  const displayName =
    user.displayName?.trim() ||
    email.split('@')[0] ||
    'Usuário';

  tx.set(ref, {
    uid,
    email,
    displayName,
    role: 'aluno',
    updatedAt: serverTimestamp(),
  });
});
```

### Leitura tolerante a dados legados

- `users` usa `displayName`, não `nome`.
- Perfis antigos podem não ter `displayName` (ex.: perfil do gestor criado por
  script). Nesse caso, usar `user.displayName` do Firebase Auth e, por último, o
  e-mail.
- `photoURL` não é persistido; se necessário, usar `user.photoURL` apenas em
  memória como `fotoUrl`.
- Validar `role` contra `gestor | admin | professor | aluno`; papel inválido
  deve gerar `perfil-indisponivel`.

### Regra correspondente

`firestore.rules` permite `create` do próprio `users/{uid}` somente com:

- `uid` igual ao documento e ao `request.auth.uid`;
- `role = 'aluno'`;
- chaves restritas a `uid`, `email`, `displayName`, `role`, `updatedAt`;
- `displayName` string de 1 a 120 caracteres;
- `updatedAt = request.time` (via `serverTimestamp()`).

`update` e `delete` continuam negados ao cliente.

---

## 3. Conversão de datas

O Firestore persiste `Timestamp`. O domínio do front-end usa ISO 8601 (`string`).

```ts
function paraIso(valor: unknown): string {
  if (typeof valor === 'string') return valor;
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === 'number') return new Date(valor).toISOString();

  const objeto = valor as { toDate?: () => Date; seconds?: number } | null;
  if (objeto && typeof objeto.toDate === 'function') {
    return objeto.toDate().toISOString();
  }
  if (objeto && typeof objeto.seconds === 'number') {
    return new Date(objeto.seconds * 1000).toISOString();
  }
  return '';
}
```

Campos que precisam de conversão: `criadoEm`, `atualizadoEm`, `timestamp`,
`lidaEm`, `expiraEm`.

---

## 4. Leituras diretas permitidas

### 4.1 Catálogo e configuração

| Coleção | Consulta | Conversão |
|---|---|---|
| `professores` | `getDocs(collection(db, 'professores'))` | `id` do documento; `nome`, `status`, `criadoEm` |
| `disciplinas` | `getDocs(collection(db, 'disciplinas'))` | `id` do documento; `nome`, `status`, `criadoEm` |
| `turmas` | `getDocs(collection(db, 'turmas'))` | `id` do documento; `nome`, `serie`, `modalidade`, `status`, `criadoEm` |
| `configuracao/atual` | `getDoc(doc(db, 'configuracao', 'atual'))` | `atualizadoEm` para ISO |

- Não filtrar `status` na consulta: a interface administrativa precisa dos
  arquivados. As listas ativas filtram no cliente.
- `turmas.turno` existe no banco (`manha`), mas o tipo `Turma` do front-end não
  o expõe.
- Se `configuracao/atual` não existir, usar `configuracaoInicial()`.

### 4.2 Aulas

- Consultar no máximo 500 documentos.
- Aplicar no servidor **um** filtro de igualdade (`turmaId` ou `professorId` ou
  `diaSemana`) e os demais no cliente. Isso evita depender de índices compostos
  adicionais.
- Derivar `inicio`/`fim` de `configuracao.periodos[periodo]`.
- Cruzar `turmaId`, `disciplinaId` e `professorId` com o catálogo para preencher
  `turmaNome`, `disciplinaNome` e `professorNome`.
- Ordenar no cliente por `diaSemana`, `periodo` e `turmaNome`.

### 4.3 Notificações

Consulta obrigatória (a regra exige o filtro de `uid`):

```ts
query(
  collection(db, 'notificacoes'),
  where('uid', '==', uid),
  limit(100),
);
```

O modelo canônico usa `turmaIds: string[]`, não `turmaId`. Para o tipo atual do
front-end:

```ts
{
  id: documento.id,
  uid: dados.uid,
  turmaId: dados.turmaIds?.[0] ?? '',
  titulo: dados.titulo,
  mensagem: dados.mensagem,
  lida: dados.lida === true,
  criadoEm: paraIso(dados.criadoEm),
  ...(dados.agrupamento?.totalAulas
    ? { agrupamento: { totalAulas: dados.agrupamento.totalAulas } }
    : {}),
}
```

Marcar uma notificação:

```ts
updateDoc(doc(db, 'notificacoes', id), {
  lida: true,
  lidaEm: serverTimestamp(),
});
```

Marcar todas: consultar `where('uid', '==', uid)`, filtrar `lida !== true` e
atualizar em lotes de até 400 operações.

### 4.4 Favoritos

Consulta obrigatória:

```ts
query(collection(db, 'favoritos'), where('uid', '==', uid), limit(200));
```

Alternar com transação e ID determinístico:

```ts
const ref = doc(db, 'favoritos', `${uid}_${turmaId}`);
await runTransaction(db, async (tx) => {
  const atual = await tx.get(ref);
  if (atual.exists()) {
    tx.delete(ref);
    return;
  }
  const turma = await tx.get(doc(db, 'turmas', turmaId));
  if (!turma.exists()) throw new Error('Turma não encontrada.');
  tx.set(ref, { uid, turmaId, criadoEm: serverTimestamp() });
});
```

A regra exige `exists(turmas/{turmaId})`, `criadoEm = request.time` e o conjunto
exato de campos `uid`, `turmaId`, `criadoEm`.

---

## 5. Callables administrativas

| Callable | Entrada do front-end | Observação |
|---|---|---|
| `salvarAula` | `EntradaAula` | Retorno `{ aula, alterado }`; converter Timestamps. |
| `salvarConfiguracao` | `abertura`, `fechamento`, `periodos`, `intervalo` | **Não enviar `atualizadoEm`**. |
| `salvarCadastro` | `EntradaSalvarCadastro` | Para turma, acrescentar `turno: 'manha'`. |
| `alterarStatusCadastro` | `{ tipo, id, status }` | Recarregar catálogo depois. |
| `excluirCadastro` | `{ tipo, id }` | Recarregar catálogo depois. |
| `listarHistorico` | `{ tipo?, entidade?, ... }` | Resposta `{ itens, proximoCursor }`. |

Nomes de callable e região: `VITE_FUNCTIONS_REGION` (padrão
`southamerica-east1`).

### Erros

Traduzir `functions/*` para os códigos de `ErroDeServico`:

| Firebase | `CodigoErroServico` |
|---|---|
| `functions/unauthenticated` | `permissao` |
| `functions/permission-denied` | `permissao` |
| `functions/invalid-argument` | `validacao` |
| `functions/not-found` | `nao-encontrado` |
| `functions/already-exists` | `validacao` |
| `functions/failed-precondition` | `validacao` |
| `functions/resource-exhausted` | `validacao` |
| `functions/unavailable` | `desconhecido` |
| `functions/internal` | `desconhecido` |

`functions/unimplemented` e `functions/not-found` em operações administrativas
podem ser convertidos em `nao-configurado` com a mensagem:
“Esta operação ainda não está disponível neste ambiente.”

---

## 6. Critérios de aceitação da integração

1. Conta Google sem perfil entra e o perfil é criado como `aluno`.
2. Conta e-mail/senha recém-criada entra e o perfil é criado como `aluno`.
3. Nenhum payload do cliente consegue gravar `role` diferente de `aluno`.
4. Catálogo, 420 aulas e configuração são exibidos após o login.
5. Notificações são listadas por `uid` e podem ser marcadas como lidas.
6. Favoritos são criados/removidos apenas para o próprio `uid` e turma existente.
7. Sem Functions, operações administrativas mostram erro claro e não escrevem.
8. `listarHistorico` sem callable retorna `[]` sem quebrar o painel.
9. Nenhuma chave privada ou Admin SDK é usado no cliente.
