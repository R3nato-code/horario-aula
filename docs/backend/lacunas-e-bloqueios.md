# Lacunas e bloqueios

**Versão:** 0.4.0 — 05/11/2026
**Fonte de verdade:** `docs/arquitetura/respostas-lacunas-backend.md` e ADR-01 a ADR-07.
**Estado:** decisões de arquitetura do backend registradas; restam bloqueios operacionais e
de escopo.

Este documento separa **lacuna resolvida**, **bloqueio operacional** e **pendência de
decisão**. Nenhuma decisão foi tomada por suposição além das registradas em
`docs/backend/README.md` §7.

---

## 1. Lacunas resolvidas pelas ADRs

| Lacuna | Decisão | Efeito na implementação |
|---|---|---|
| LAC-08 | ADR-01 | Coleções em português, campos `camelCase`, exceção `users`; seed com IDs determinísticos. |
| LAC-02 | ADR-02 | ID da aula `${turmaId}_${diaSemana}_${periodo}`; horários derivados de `configuracao/atual`, não persistidos. |
| LAC-05 | ADR-03 | Limite de 200 aulas, 402 escritas na transação, idempotência UUID v4 + hash, outbox. |
| LAC-10/LAC-11 | ADR-04 | Histórico único, append-only, consulta somente por `listarHistorico`. |
| LAC-13 | ADR-05 | Notificações server-side com TTL de 180 dias; favoritos diretos do dono. |
| LAC-16 | ADR-06 | Ciclo `ativo` → `arquivado` → excluído, com zero aulas para arquivar/excluir. |
| LAC-07 | ADR-07 | Assistente somente leitura, cinco ferramentas allowlist, cotas e logs mínimos. |

Consequência: schema, índices IDX-01 a IDX-09, identidade da aula, histórico, notificações,
favoritos, ciclo de cadastros e contrato do assistente estão definidos. O backend
implementado segue essas decisões.

---

## 2. Linha de base: conflitos na grade oficial (resolvida e aplicada)

**Fato (linha de base):** `functions/src/scripts/dados/horarios-2026.json`, gerado
originalmente a partir de `src/services/demo/dadosIniciais.ts`, continha **4 conflitos reais
de professor**:

| Dia/período | Professor | Turmas em conflito |
|---|---|---|
| 5ª, 1ª aula | Ronaldo M. L. P. | `turma-3c` × `turma-2dsb` |
| 5ª, 2ª aula | Sonny O. Carneiro | `turma-3c` × `turma-2dsb` |
| 5ª, 3ª aula | Sonny O. Carneiro | `turma-3c` × `turma-2dsb` |
| 5ª, 5ª aula | Hélcio J. Lourenço | `turma-2dsb` × `turma-2adm` |

**Correção aplicada:** o bloco de sexta-feira da `turma-2dsb` foi substituído pelo conteúdo
de `docs/arquitetura/aulas.md` (Inovação e Tecnologia/Rosa, História/Hélcio, Sociologia/
Priscila, Programação Front-End/Josiane). O verificador local confirma **420 aulas e 0
conflitos de professor/turma**. A correção é uma decisão de dados e aguarda ratificação da
escola/Arquiteto antes do `--confirmar`.

**Ressalva:** `docs/arquitetura/aulas.md` não é integralmente livre de conflitos. A leitura
completa do arquivo produz 3 conflitos adicionais:

| Dia/período | Professor | Turmas em conflito |
|---|---|---|
| 2ª, 6ª aula | Adnilson R. M. | `turma-2a` × `turma-2c` |
| 3ª, 1ª aula | Guilherme A. Neves | `turma-2c` × `turma-3adm` |
| 3ª, 2ª aula | Priscila S. Silva | `turma-2c` × `turma-3b` |

Por isso, apenas o bloco de sexta da 2ª DSB foi adotado; as demais divergências de
`aulas.md` (`turma-2c` e `turma-3dsc`) foram mantidas como estavam no JSON versionado.

**Efeito:** o seed foi executado no projeto `complementacao-horario-aula` em
05/11/2026 com `--confirmar`: **14 turmas, 44 professores, 62 disciplinas e 420
aulas**, com **0 conflitos**. A configuração `configuracao/atual` foi criada antes.

**Decisão necessária:** ratificar retroativamente a correção do bloco de sexta da
`turma-2dsb` ou indicar outra composição para os 4 slots originais. A correção
já está aplicada no Firestore; uma divergência exigirá novo seed com
`--sobrescrever`.

---

## 3. Pendência de contrato: notificação de alteração individual

**Fato:** a ADR-05 §2.5 determina que alteração individual gera notificação por aula/turma.
O modelo de dados §3.11 define `outbox.tipo` apenas como `notificacao-edicao-massa`, e o
fluxo de fan-out documentado parte da edição em massa.

**Estado atual:** `salvarAula` e `removerAula` gravam histórico e são transacionais, mas
**não criam notificação**. O gatilho `processarOutbox` só trata
`notificacao-edicao-massa` e `limpeza-favoritos`.

**Por que não foi implementado:** criar um tipo de outbox, um ID e um critério de
agrupamento sem decisão seria inventar contrato (limite de atuação).

**Decisão necessária:**

- novo `outbox.tipo = 'notificacao-aula'` ou notificação direta na transação;
- ID determinístico (por exemplo `{operacaoId}_{uid}`) e agrupamento por turma/dia;
- comportamento quando a turma tem muitos favoritos (limite de lote);
- se a notificação individual deve ser suprimida quando a alteração vier de uma edição em
  massa (evitar duplicidade).

**Recomendação:** outbox `notificacao-aula` com ID `{correlacao}_{uid}` e fan-out
reutilizando o código atual; a edição em massa continua com notificação agrupada própria.

---

## 4. Bloqueio operacional: JDK 21 para o emulador

**Fato:** o ambiente tem Java 1.8.0_361. O Firestore Emulator exige JDK 21+ e responde:

```text
Error: firebase-tools no longer supports Java version before 21.
```

**Efeito:**

- testes de regras do Firestore **não executados**;
- testes de integração de callables contra o emulador **não executados**;
- o restante (typecheck, lint, 114 testes unitários, build e carregamento do bundle) foi
  executado com sucesso.

**Ação:** instalar JDK 21 e rodar os casos de `docs/backend/regras-firestore.md` §5 antes de
qualquer publicação de regras.

---

## 5. Pendências de decisão ainda abertas

### 5.1 LAC-09 / LAC-03 / RF58 — gestão de usuários e admin

**Estado:** `garantirPerfil`, `bootstrap-gestor` e `definir-papel` existem. O
perfil novo sempre recebe `role`; o e-mail inicial configurado em
`GESTOR_INICIAL_EMAIL` é promovido a `gestor` no primeiro perfil criado com
e-mail verificado Google. O script `definir-papel` permite ao operador definir
`gestor`, `admin`, `professor` ou `aluno`, sempre com histórico `permissao` na
mesma transação. **Não há callable de listagem/gestão de usuários nem interface
de administração de papéis.**

**Perguntas ainda abertas:**

- Quais campos o administrador pode ver/alterar em `users`?
- A concessão/revogação de admin é exclusiva do `gestor` (RF58 proposto)?
- A operação usa apenas `users.role` ou também custom claims?
- Qual o registro de auditoria (histórico `permissao`, log ou ambos)?

**Implementado:** bootstrap automático do gestor inicial e scripts operacionais
auditados. Não há autoatendimento para papéis administrativos.

### 5.2 LAC-23 / LAC-24 — salas

**Estado:** `salas` fechada nas regras; `salaId` é rejeitado explicitamente em
`salvarAula` e não é aceito na edição em massa. O cálculo de conflito já suporta sala
internamente, mas nenhum contrato a expõe.

**Perguntas:** modelo da sala, vínculo com aula, regra de conflito de sala e requisitos
RF54–RF56. Sem isso, não implementar cadastro nem associação.

### 5.3 LAC-21 — fuso e “hoje/amanhã”

**Estado:** a ADR-07 fixa `America/Sao_Paulo` para o assistente, mas marca LAC-21 como
pendente de confirmação. Nenhuma função baseada em “hoje/amanhã” foi implementada.

**Pergunta:** confirmar o fuso e a regra de data para consultas do assistente e
notificações.

### 5.4 LAC-20 — login e abuso

**Estado:** qualquer conta Google pode entrar; não há restrição de domínio nem rate limit
de login. Não implementado por ausência de decisão.

### 5.5 LAC-14 — calendário escolar

**Estado:** não há feriados, recesso, aulas suspensas ou reposições. Impacta “aulas
futuras” (LAC-16) e o assistente.

### 5.6 A-02 — região das funções

**Estado:** `FUNCTIONS_REGION` padrão `southamerica-east1`; o gatilho Auth gen1 roda em
`us-central1`. Confirmar antes do deploy.

### 5.7 A-05 — unicidade de nome

**Estado:** a unicidade é verificada por consulta `where('nome','==',...)` dentro da
transação. O Firestore não possui índice único; duas criações simultâneas com o mesmo nome
podem escapar. **Risco residual documentado**, aceito até decisão do Arquiteto.

**Opções:** aceitar o risco; criar documento de reserva de nome (`nomes_unicos/{tipo}_{slug}`)
com `create` transacional; ou usar ID determinístico pelo nome (muda o contrato de IDs).

---

## 6. Pendências de implementação (arquitetura já decidida)

| Item | Estado | Falta |
|---|---|---|
| Assistente Gemini (RF10, D-01, ADR-07) | Não iniciado | Implementar callable autenticada, ferramentas allowlist, cota em `assistente_uso` e chamada REST ao modelo **sem nova dependência**; configurar `GEMINI_API_KEY` no Secret Manager. |
| Notificação individual de aula | Bloqueada por contrato (§3) | Decisão do Arquiteto. |
| Testes de regras e integração | Bloqueados | JDK 21. |
| Seed das 420 aulas | **Aplicado** em 05/11/2026 | Nenhum, exceto ratificação retroativa da grade (§2). |
| Perfil do gestor inicial | **Mecanismo pronto** | A conta ainda não existe no Auth; o perfil será criado no primeiro login Google ou por script. |

### 6.1 Sobre o assistente

A ADR-07 resolveu a lacuna, mas a ordem de implementação aprovada coloca o assistente como
último item. A chamada ao Gemini deve ser feita por HTTP a partir da Cloud Function, sem
adicionar SDK, respeitando:

- modelo `google/gemini-3.1-flash-lite` (D-01);
- prompt de sistema que só responde com dados das ferramentas;
- 5 ferramentas de leitura, até 100 linhas cada;
- 30/dia e 5/minuto por usuário; 1000/dia global;
- timeout de 20 s;
- logs apenas com metadados, sem pergunta/resposta em texto claro.

Nenhuma chave, token ou service account está no repositório.

---

## 7. Exceção documentada: histórico do seed

O seed grava 420 aulas em lotes (limite de 500 por batch), portanto **não** consegue gravar
a carga e o histórico na mesma transação. O histórico é consolidado em um único documento
`historico/seed-horarios-{versao}` ao final, com ID determinístico e verificação de
existência em transação. Reexecutar a mesma versão **não duplica** o histórico.

Se a gravação do histórico falhar depois dos lotes, a carga permanece aplicada sem o
registro consolidado; a correção é reexecutar o seed (idempotente) ou gravar o histórico
manualmente pelo operador. Esse é o único ponto do backend em que alteração e histórico não
são atômicos, e decorre do limite do Firestore.

---

## 8. Ordem recomendada para desbloquear

| Ordem | Item | Desbloqueia |
|---|---|---|
| 1 | Entrar com `mascarenhasr02@gmail.com` pelo Google ou rodar `definir-papel` | Perfil do gestor inicial. |
| 2 | Ratificar a correção do bloco de sexta da `turma-2dsb` | Consolidação da grade já aplicada. |
| 3 | Instalar JDK 21 | Testes de regras e integração. |
| 4 | Decidir notificação individual | RF43–RF47 completos. |
| 5 | LAC-09/RF58 | Gestão de usuários e admin pela interface. |
| 6 | Implementar assistente conforme ADR-07 | RF10. |
| 7 | LAC-23/LAC-24 | Salas e conflito de sala. |
| 8 | LAC-21/LAC-20/LAC-14 | Datas, abuso e calendário. |
