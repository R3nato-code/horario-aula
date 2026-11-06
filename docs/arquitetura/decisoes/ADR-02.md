# ADR-02 — ID determinístico da aula e horários derivados da configuração

| Campo | Conteúdo |
|---|---|
| ID | ADR-02 |
| Título | Identidade da aula por `{turmaId}_{diaSemana}_{periodo}`, sem snapshot de horário |
| Data | 03/11/2026 |
| Status | Aprovada |
| Lacuna | LAC-02 (impacto de LAC-12) |
| Requisitos | RF07, RF11–RF15, RF33, RF36–RF42; RF57 (proposto) |

## Contexto

Era preciso definir:

1. a chave de uma aula;
2. o que acontece quando a configuração de horários muda;
3. como impedir duas aulas da mesma turma no mesmo slot;
4. como tornar o seed de 420 aulas idempotente.

O front-end já usa `criarIdAula(turmaId, diaSemana, periodo)` retornando
`${turmaId}_${diaSemana}_${periodo}`. O Firestore não possui restrição de unicidade.

## Decisão

1. **ID do documento:** `${turmaId}_${diaSemana}_${periodo}`.
   Exemplo: `turma-2dsb_3_5`.
2. **Uma aula por turma/dia/período**, garantida estruturalmente pelo ID.
3. **Sem documento para slot vago.** Slot livre = ausência de documento.
4. **Horários não são persistidos na aula.** `inicio`/`fim` são derivados de
   `configuracao/atual.periodos[periodo]` no cliente e no servidor.
5. **Trocar a turma de uma aula** não é edição: é remoção do documento antigo + criação no
   novo slot, com dois registros de histórico. Não existe `moverAula` na v1.
6. **Alterar a configuração**:
   - mudar `inicio`/`fim` reflete em todas as aulas, sem reescrever documentos;
   - adicionar período é permitido;
   - remover ou renumerar período que possua aulas é bloqueado com
     `failed-precondition`, exigindo remanejar as aulas;
   - toda alteração grava histórico.
7. **Seed idempotente** pelo ID determinístico.

## Alternativas

| Alternativa | Motivo do descarte |
|---|---|
| Auto-ID + unicidade lógica validada em transação (recomendação original da LAC-02) | O Firestore não tem índice único. Uma consulta “não existe” dentro de transação não bloqueia a criação concorrente de outro auto-ID (phantom write). Seria necessário um documento de trava por slot, com complexidade e contenção desnecessárias. |
| ID composto + snapshot `inicio`/`fim` na aula | Duplica a fonte de verdade. Toda mudança de configuração exigiria migração de 420 documentos e reconciliação; aumenta o risco de horários divergentes. |
| ID composto + documento de trava por slot | Desnecessário: o próprio ID já é a trava. |
| Documento para slot vago | Contraria RF16 (aula ativa exige disciplina e professor) e antecipa LAC-15. |

## Consequências

**Ganhos**

- Unicidade sem índice único e sem condição de corrida.
- Seed e edição idempotentes.
- Mudança de configuração é atômica e barata: um documento + histórico.
- Nenhum dado derivado duplicado.

**Custos e impactos**

- O ID é opaco; nenhum código pode fazer `split('_')`.
- O cliente precisa derivar `inicio`/`fim` da configuração.
- A consulta de conflito precisa carregar a configuração.
- `salaId` permanece reservado; LAC-23/LAC-24 não são resolvidas aqui.
- LAC-15 continua aberta: “vaga reservada” exigiria outro modelo.

## Riscos

| ID | Risco | Mitigação |
|---|---|---|
| RISCO-03 | Algum código tentar interpretar o ID composto. | Documentar ID como opaco e centralizar a composição em um único helper. |
| RISCO-04 | Configuração removida/renumerada orfanar aulas. | Bloqueio no servidor + prévia de impacto. |
| RISCO-05 | A escola exigir horário diferente por turma. | Fora do escopo (D-02: todas as turmas de manhã). Se necessário, novo ADR com `inicio`/`fim` por aula. |

## Aprovador

Arquiteto — decisão solicitada pelo Agente Back-End em 03/11/2026. Ratificação do
responsável humano recomendada antes do deploy.
