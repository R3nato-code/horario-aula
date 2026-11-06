# ADR-06 — Ciclo de vida e exclusão segura de cadastros

| Campo | Conteúdo |
|---|---|
| ID | ADR-06 |
| Título | Ativo → arquivado → excluído, com bloqueio por aulas ativas e histórico preservado |
| Data | 03/11/2026 |
| Status | Aprovada |
| Lacuna | LAC-16 (impacto de LAC-14) |
| Requisitos | RF48–RF53 |

## Contexto

“Dependência pendente” para exclusão não estava definida. A alternativa de considerar
“aulas futuras” depende de calendário escolar (LAC-14), que não existe. Também era preciso
garantir que a exclusão não apagasse a rastreabilidade (RF53).

## Decisão

1. **Ciclo de vida:** `ativo` → `arquivado` → `excluído`.
2. **Arquivar** exige que não exista aula referenciando o cadastro. Se existir,
   `failed-precondition` com `aulasAtivas` e a lista (até 20) para o admin remanejar.
3. **Reativar** é permitido a qualquer momento, sem verificação de dependência.
4. **Excluir** exige:
   - `status === 'arquivado'`;
   - zero aulas referenciando o cadastro.
5. **Exclusão é definitiva** para o documento do cadastro; o histórico permanece com:
   - `entidadeId`;
   - `entidadeNome`;
   - snapshot completo em `alteracao.antes`;
   - `alteracao.depois = {}`.
6. **Exclusão de turma** remove também os favoritos da turma. Até 500 favoritos na mesma
   transação; acima disso, agenda limpeza via outbox.
7. **“Dependência” = qualquer aula existente**, pois não há calendário para distinguir
   futuras. Isso é conservador e não depende de LAC-14.
8. **Nenhuma exclusão direta pelo cliente.** Somente callable autorizada.

## Alternativas

| Alternativa | Motivo do descarte |
|---|---|
| Excluir mesmo com aulas ativas | Deixaria aulas apontando para cadastro inexistente e quebraria RF16/RF52. |
| Excluir apenas com base em “aulas futuras” | Depende de LAC-14, inexistente; não é verificável hoje. |
| Soft delete apenas (`status: 'excluido'`) | Não atende RF51 (exclusão definitiva) e perpetuaria documentos inválidos. |
| Arquivar mesmo com aulas | Cria grades apontando para cadastros fora das listas ativas; difícil de explicar ao usuário. |
| Apagar histórico junto | Viola RF22/RF53. |

## Consequências

**Ganhos**

- Nenhuma referência órfã em aulas.
- Exclusão reversível até o último passo (basta reativar antes de excluir).
- Rastreabilidade preservada.

**Custos e impactos**

- O admin precisa remanejar/remover aulas antes de arquivar.
- A UI deve explicar a dependência e oferecer atalho para as aulas.
- A exclusão de turma pode exigir limpeza assíncrona de favoritos.
- LAC-14 continua aberta, mas não bloqueia a v1.

## Riscos

| ID | Risco | Mitigação |
|---|---|---|
| RISCO-15 | Admin não conseguir arquivar um cadastro em uso e ficar bloqueado. | Mensagem clara com lista de aulas e ação de remanejamento. |
| RISCO-16 | Exclusão de turma com muitos favoritos exceder a transação. | Limite de 500 + outbox para o restante. |
| RISCO-17 | Dados descritivos insuficientes no histórico. | Snapshot completo + `entidadeNome`; teste de exclusão. |

## Aprovador

Arquiteto — decisão solicitada pelo Agente Back-End em 03/11/2026. Ratificação do
responsável humano recomendada antes do deploy.
