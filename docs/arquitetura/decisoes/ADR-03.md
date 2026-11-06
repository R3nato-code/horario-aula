# ADR-03 — Limite de 200 aulas e atomicidade da edição em massa

| Campo | Conteúdo |
|---|---|
| ID | ADR-03 |
| Título | Edição em massa tudo-ou-nada com limite de 200 aulas, idempotência e outbox |
| Data | 03/11/2026 |
| Status | Aprovada |
| Lacuna | LAC-05 |
| Requisitos | RF23–RF30, RF34, RF35, RF47 |

## Contexto

O Firestore limita transações/batches a **500 operações**. Cada aula alterada gera:

- 1 escrita de aula;
- 1 escrita de histórico.

Uma notificação agrupada acrescenta escrita. A operação também precisa de rastreabilidade
e de proteção contra duplo clique/retry.

## Decisão

1. **Limite rígido de 200 aulas** por prévia e por confirmação.
2. **Tudo-ou-nada** em uma transação:
   - 200 aulas;
   - 200 históricos (`{operacaoId}_{aulaId}`);
   - 1 documento `operacoes/{chaveIdempotencia}`;
   - 1 documento `outbox/{evento}`;
   - **402 escritas** (margem de 98 sobre o limite de 500).
3. **Acima de 200:** `resource-exhausted` com `details.maximo = 200`; nenhuma escrita.
4. **Conflito:** `failed-precondition` com a lista de conflitos; nenhuma escrita.
5. **Prévia não escreve.** A confirmação revalida tudo no servidor e não confia na prévia
   do cliente.
6. **Idempotência:** `chaveIdempotencia` UUID v4 + `hashPayload`.
   - mesma chave + mesmo hash → retorna o resultado anterior;
   - mesma chave + hash diferente → `already-exists`.
7. **Notificação fora da transação:** o outbox é gravado na transação e processado por
   gatilho após o commit. Falha do outbox não desfaz a edição; fica para reprocessamento.
8. **Sem aplicação parcial.** Não existe estado “metade aplicada”.

## Alternativas

| Alternativa | Motivo do descarte |
|---|---|
| Limite de 400 aulas sem notificação | 800 escritas (aula + histórico) excedem 500; inviável. |
| Limite de 249 aulas | 498 + operação/outbox = 500; sem margem para erros e para evolução do schema. |
| Operação fatiada e retomável com estado | Não é atômica; exige máquina de estados e compensação. Complexidade desproporcional ao volume (14 turmas, 420 aulas). |
| Sem histórico para caber mais aulas | Viola RF30 e RF17; inaceitável. |
| Notificação na mesma transação | Consome escritas e acopla o sucesso da edição ao fan-out. |

## Consequências

**Ganhos**

- Garantia de consistência e auditoria completa.
- Limite previsível e testável.
- Notificação resiliente e idempotente.

**Custos e impactos**

- O admin precisa dividir seleções maiores que 200.
- A UI deve informar o limite e permitir seleção por turma/filtro.
- Necessidade de `operacoes`, `outbox` e gatilho.
- Monitorar latência da transação e do fan-out.

## Riscos

| ID | Risco | Mitigação |
|---|---|---|
| RISCO-06 | Transação com 200 aulas exceder tempo limite. | Medir em emulador/homologação; reduzir o limite se necessário (decisão registrada em novo ADR). |
| RISCO-07 | Fan-out de notificações para muitos usuários. | Lotes, IDs determinísticos e reprocessamento; se necessário, fan-out por turma. |
| RISCO-08 | Cliente reenviar a operação e duplicar histórico. | Chave de idempotência + histórico com ID determinístico. |

## Aprovador

Arquiteto — decisão solicitada pelo Agente Back-End em 03/11/2026. Ratificação do
responsável humano recomendada antes do deploy.
