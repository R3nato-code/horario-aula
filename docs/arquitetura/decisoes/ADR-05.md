# ADR-05 — Notificações e favoritos

| Campo | Conteúdo |
|---|---|
| ID | ADR-05 |
| Título | Notificações server-side com TTL de 180 dias e favoritos diretos do próprio usuário |
| Data | 03/11/2026 |
| Status | Aprovada |
| Lacuna | LAC-13 |
| Requisitos | RF09, RF43–RF47 |

## Contexto

As coleções `notificacoes` e `favoritos` não existiam na arquitetura e estavam totalmente
fechadas nas regras. Faltava decidir schema, retenção, agrupamento, estado de leitura e se
a marcação de leitura seria via Cloud Function ou update direto.

## Decisão

### Notificações

1. **Schema** em `notificacoes`:
   `uid`, `tipo`, `turmaIds[]`, `titulo`, `mensagem`, `lida`, `lidaEm`, `criadoEm`,
   `expiraEm`, `operacaoId`, `agrupamento`.
2. **Criação somente pelo servidor**, após o commit da edição em massa, via `outbox`.
3. **Leitura direta** pelo próprio usuário: `where('uid','==',uid)`, ordenada por
   `criadoEm DESC`, limite 50.
4. **Marcação de leitura direta**, restrita por regra aos campos `lida` e `lidaEm` e ao
   próprio `uid`.
5. **Agrupamento:** uma notificação por usuário por operação em massa, mesmo que ele tenha
   favoritado várias turmas afetadas; `turmaIds` lista todas e `agrupamento.totalAulas`
   informa o volume. Alteração individual gera uma notificação por aula/turma.
6. **Retenção:** 180 dias, via campo `expiraEm` e política TTL do Firestore.
7. **Somente quem favoritou a turma recebe** (RF44). O fan-out consulta os favoritos no
   momento do processamento; quem desfavoritou antes não recebe.
8. **ID determinístico** `{operacaoId}_{uid}` para edição em massa, tornando retries
   idempotentes.

### Favoritos

1. **Schema** em `favoritos`: `uid`, `turmaId`, `criadoEm`.
2. **ID determinístico** `{uid}_{turmaId}`, que impede duplicidade sem consulta.
3. **CRUD direto do próprio usuário**: leitura, criação e exclusão. Update negado.
4. Regra de criação valida `uid` autenticado, composição do ID e existência da turma.

## Alternativas

| Alternativa | Motivo do descarte |
|---|---|
| Todas as operações de notificação/favorito via Cloud Function | Custo e latência desnecessários para dados do próprio usuário; piora offline do PWA. |
| Notificação com `lida` booleano apenas | Perde a data de leitura; `lidaEm` é útil para suporte e auditoria leve. |
| Notificação com `readAt` apenas | Dificulta consultas de não lidas; manter os dois campos é simples e explícito. |
| Uma notificação por turma afetada | Um usuário com várias turmas favoritas receberia várias notificações da mesma operação. |
| Sem TTL | Crescimento indefinido de uma coleção de baixo valor histórico. |
| Favorito com auto-ID | Permite duplicidade e exige consulta/transação; o ID determinístico resolve. |

## Consequências

**Ganhos**

- Notificações e favoritos funcionam offline e com custo baixo.
- Fan-out idempotente e agrupado.
- Retenção automática sem função agendada.

**Custos e impactos**

- Regras do Firestore precisam ser atualizadas e testadas.
- O front-end muda `Notificacao.turmaId` para `turmaIds` e adiciona `lidaEm`.
- Fan-out com muitos destinatários exige lotes; ver RISCO-07.
- A política TTL precisa ser configurada no Firestore (campo `expiraEm`).

## Riscos

| ID | Risco | Mitigação |
|---|---|---|
| RISCO-12 | Regra de update permitir alterar `uid`/`tipo`. | `diff().affectedKeys().hasOnly(['lida','lidaEm'])` e teste de regras. |
| RISCO-13 | Fan-out lento para muitos favoritos. | Lotes, IDs determinísticos, status no outbox e reprocessamento. |
| RISCO-14 | Notificação órfã de turma excluída. | Exclusão de turma remove favoritos; notificações antigas expiram em 180 dias e são apenas informativas. |

## Aprovador

Arquiteto — decisão solicitada pelo Agente Back-End em 03/11/2026. Ratificação do
responsável humano recomendada antes do deploy.
