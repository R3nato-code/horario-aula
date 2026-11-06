# Respostas ao Back-End — desbloqueio de LAC-08 a LAC-07

**Data:** 03/11/2026
**De:** Arquiteto
**Para:** Agente Back-End / Agente Front-End / Engenheiro de Requisitos
**Status:** decisões registradas em `docs/arquitetura/decisoes/ADR-01.md` a `ADR-07.md`.

---

## 1. LAC-08 — qual nomenclatura é canônica?

**Resposta: Opção B.** O front-end está correto no uso de `camelCase` e português.
A arquitetura anterior fica substituída.

### 1.1 Campos canônicos

| Entidade | Coleção | Campos |
|---|---|---|
| Professor | `professores` | `nome`, `status`, `criadoEm`, `atualizadoEm` |
| Disciplina | `disciplinas` | `nome`, `status`, `criadoEm`, `atualizadoEm` |
| Turma | `turmas` | `nome`, `serie`, `modalidade`, `turno`, `status`, `criadoEm`, `atualizadoEm` |
| Aula | `aulas` | `turmaId`, `diaSemana`, `periodo`, `disciplinaId`, `professorId`, `salaId?`, `criadoEm`, `atualizadoEm` |
| Histórico | `historico` | `tipo`, `entidade`, `entidadeId`, `entidadeNome`, `descricao`, `alteracao`, `responsavelId`, `responsavelNome`, `responsavelEmail`, `timestamp`, `operacaoId?`, `correlacao?` |
| Notificação | `notificacoes` | `uid`, `tipo`, `turmaIds`, `titulo`, `mensagem`, `lida`, `lidaEm`, `criadoEm`, `expiraEm`, `operacaoId`, `agrupamento` |
| Favorito | `favoritos` | doc ID `{uid}_{turmaId}`, `uid`, `turmaId`, `criadoEm` |

### 1.2 Regras

- Não persistir `id` em documentos de domínio; o ID do documento é a identidade.
- `users` é exceção: mantém `uid`, `email`, `displayName`, `role`.
- Datas persistidas como `Timestamp`; o cliente converte para ISO 8601.
- `horarios` deixa de existir; a coleção é `aulas`.
- `professors` → `professores`; `subjects` → `disciplinas`.

**Ação Back-End:** atualizar `firestore.rules`, `firestore.indexes.json` e
`docs/backend/*` para os novos caminhos.
**Ação Front-End:** adicionar `turno` em `Turma`, `criadoEm`/`atualizadoEm` em `Aula`,
`turmaIds`/`lidaEm` em `Notificacao`, `entidadeNome`/`responsavelEmail` em
`RegistroHistorico` e conversores de `Timestamp`.

**Não escolhida:** A (arquitetura) geraria retrabalho no cliente; C (tudo via CF)
perderia leitura direta e encareceria o PWA.

---

## 2. LAC-02 — identidade da aula

**Resposta: ID determinístico `${turmaId}_${diaSemana}_${periodo}`; horários derivados da
configuração; sem snapshot de `inicio`/`fim`.**

- Exemplo: `turma-2dsb_3_5`.
- Uma aula por turma/dia/período, garantida estruturalmente.
- Slot vago = ausência de documento.
- `inicio`/`fim` vêm de `configuracao/atual.periodos[periodo]`.
- Trocar a turma de uma aula = remover + criar em outro slot (dois históricos).
- Mudar horários da configuração reflete em todas as aulas sem reescrever documentos.
- Remover/renumerar período com aulas é bloqueado.
- Seed idempotente pelo ID.

**Por que não a Opção 2 (auto-ID + unicidade em transação):** o Firestore não tem índice
único; consultar “não existe” não bloqueia a criação concorrente de outro auto-ID
(phantom write). Seria necessário um documento de trava por slot — complexidade
desnecessária. Ver ADR-02.

**Ação Back-End:** usar `criarIdAula`/helper equivalente; validar `periodo` contra a
configuração; não gravar `inicio`/`fim` em `aulas`. O `detectarConflitos` existente pode ser
reutilizado passando `ativa: true` e `inicioMin`/`fimMin` derivados da configuração.
**Ação Front-End:** `AulaDetalhada.inicio`/`fim` são calculados, não lidos do documento.

---

## 3. LAC-05 — limite e atomicidade em massa

**Resposta: limite de 200 aulas, tudo-ou-nada em uma transação, notificação por outbox.**

- 200 aulas + 200 históricos + 1 `operacoes` + 1 `outbox` = **402 escritas** (limite 500).
- Acima de 200: `resource-exhausted` com `maximo: 200`; nenhuma escrita.
- Conflito: `failed-precondition` com lista; nenhuma escrita.
- Prévia não escreve; confirmação revalida tudo.
- `chaveIdempotencia` UUID + `hashPayload`.
- Notificação após o commit; falha do outbox não desfaz a edição.
- Sem estado parcial.

**Ação Back-End:** implementar `previaEdicaoEmMassa` e `confirmarEdicaoEmMassa`; criar
`operacoes` e `outbox`; histórico com ID `{operacaoId}_{aulaId}`.

---

## 4. LAC-10 / LAC-11 — histórico

**Resposta: coleção única `historico`, append-only, leitura por `admin`/`gestor` via
callable; retenção indefinida; sem exportação na v1; todo CRUD de cadastro gera histórico.**

- `professor`/`aluno` não leem histórico.
- Consulta com paginação por cursor (50/100) e filtros por tipo, entidade, entidadeId,
  responsável e período.
- Exclusão preserva `entidadeId`, `entidadeNome` e snapshot em `alteracao.antes`.
- Histórico de configuração, aulas, cadastros, permissões (futuro) e seed.
- Regras negam leitura/escrita direta.

**Ação Back-End:** implementar `listarHistorico`; gravar histórico em todas as mutações;
criar IDX-04 a IDX-06.

---

## 5. LAC-13 — notificações e favoritos

**Resposta: notificações server-side com TTL de 180 dias e agrupamento por operação/usuário;
favoritos com ID determinístico e CRUD direto do próprio usuário.**

- `notificacoes`: leitura própria, update só de `lida`/`lidaEm`; criação só pelo servidor.
- `favoritos`: doc ID `{uid}_{turmaId}`; leitura/criação/exclusão do próprio `uid`.
- Uma notificação por usuário por operação em massa; `turmaIds` lista as turmas.
- Só quem favoritou recebe; fan-out via outbox.
- Retenção: 180 dias (`expiraEm`, TTL).
- Estado de leitura: `lida` + `lidaEm`.

**Ação Back-End:** atualizar regras; implementar gatilho de outbox e fan-out idempotente;
configurar TTL.
**Ação Front-End:** trocar `Notificacao.turmaId` por `turmaIds`; usar update direto.

---

## 6. LAC-16 — exclusão

**Resposta: ciclo `ativo` → `arquivado` → `excluído`; arquivar e excluir exigem zero aulas
referenciando o cadastro; histórico preservado; sem conceito de “futuras”.**

- Arquivar com aulas ativas: `failed-precondition` + lista para remanejar.
- Reativar: sempre permitido.
- Excluir: exige `arquivado` + zero aulas.
- Exclusão de turma remove favoritos (até 500 na transação; restante via outbox).
- Snapshot completo no histórico.
- “Dependência” = qualquer aula existente, pois LAC-14 (calendário) não existe.

**Ação Back-End:** implementar `alterarStatusCadastro` e `excluirCadastro`; validar
dependências; gravar histórico na mesma transação.

---

## 7. LAC-07 — assistente Gemini

**Resposta: modelo D-01, cinco ferramentas allowlist somente leitura, cotas e logs mínimos.**

- Ferramentas: `consultarTurmas`, `consultarTurma`, `consultarProfessor`,
  `consultarDisciplina`, `consultarHorario`.
- Proibido: escrita, `users`, `historico`, `notificacoes`, caminhos livres do Firestore.
- Limites: pergunta 500 caracteres; resposta 2000; 5 ferramentas; 20 s; 30/dia e 5/min por
  usuário; 1000/dia global.
- Logs: metadados por 30 dias; sem pergunta/resposta em texto claro.
- Chave no Secret Manager.
- Fuso `America/Sao_Paulo` (LAC-21 pendente).
- Erros: `resource-exhausted`, `unavailable`, `invalid-argument`; nunca inventar resposta.

**Ação Back-End:** implementar `perguntarAoAssistente`, ferramentas, cota
`assistente_uso/{uid}_{YYYYMMDD}` e integração Gemini.
**Ação Front-End:** chamar a callable e exibir `fontes` quando houver.

---

## 8. O que já pode ser implementado

| Ordem | Entrega | Depende de |
|---|---|---|
| 1 | Atualizar regras/índices/tipos para os caminhos canônicos | ADR-01 |
| 2 | CRUD de professores/disciplinas/turmas + histórico na mesma transação | ADR-01, ADR-04 |
| 3 | Seed das 420 aulas (dry-run, depois confirmar) | ADR-01, ADR-02 |
| 4 | Aulas individuais + configuração | ADR-02 |
| 5 | Edição em massa + operações + outbox | ADR-03 |
| 6 | Notificações + favoritos + fan-out | ADR-05 |
| 7 | Assistente Gemini | ADR-07 |

### 8.1 Ajustes em relação aos contratos futuros já documentados

| Contrato em `docs/backend/contratos.md` | Situação canônica |
|---|---|
| `salvarProfessor` / `salvarDisciplina` / `salvarTurma` | Substituídos por `salvarCadastro` com `tipo`. |
| `salvarAula` | Mantido, com ID derivado e `salaId` rejeitado até LAC-23. |
| `removerAula` | Novo. |
| `salvarConfiguracao` | Mantido. |
| `previaEdicaoEmMassa` / `confirmarEdicaoEmMassa` | Mantidos com limite 200 e idempotência. |
| `listarHistorico` | Mantido. |
| `listarNotificacoes` / `marcarLida` | **Não criar callables.** Leitura e update direto do próprio usuário. |
| `alternarFavorito` | **Não criar callable.** `set`/`delete` direto do próprio usuário. |
| `perguntarAoAssistente` | Mantido. |

## 9. O que continua aberto (não bloqueia 1–7)

- LAC-03/RF58 (concessão de admin).
- LAC-09 (gestão de usuários).
- LAC-14 (calendário).
- LAC-15 (vaga reservada).
- LAC-20 (domínio/rate limit de login).
- LAC-21 (confirmação de fuso).
- LAC-23/LAC-24 (salas).
- JDK 21 para testes de regras.
- ADC/service account fora do repositório.

## 10. Observação de governança

As decisões foram tomadas pelo Arquiteto a pedido do Back-End e estão registradas como
**Aprovadas** para permitir a implementação. A ratificação do responsável humano é
recomendada antes do deploy, especialmente para:

- retenção indefinida do histórico;
- retenção de 180 dias das notificações;
- bloqueio de arquivamento com aulas ativas;
- cotas do assistente.

Nenhuma delas altera o texto de um RF existente; são decisões de arquitetura e operação.
Se Requisitos discordar de alguma, o ADR correspondente deve ser substituído, não apagado.
