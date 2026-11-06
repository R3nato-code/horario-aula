# ADR-01 — Schema canônico em camelCase e coleções em português

| Campo | Conteúdo |
|---|---|
| ID | ADR-01 |
| Título | Adotar a nomenclatura do front-end (Opção B) e canonicalizar as coleções em português |
| Data | 03/11/2026 |
| Status | Aprovada |
| Lacuna | LAC-08 |
| Requisitos | RF02, RF04–RF06, RF12, RF18, RF48–RF50 |

## Contexto

O repositório tinha duas definições incompatíveis:

- arquitetura: `professors`/`subjects` com `name`, e `horarios` com `turmaID`,
  `disciplinaID`, `professorID`;
- front-end: `nome`, `turmaId`, `disciplinaId`, `professorId`, `criadoEm`.

O front-end lê o Firestore diretamente para catálogo, aulas e configuração. Não há dados
em produção que exijam migração. A arquitetura anterior era um rascunho marcado com
pendências e misturava coleções em inglês (`professors`, `subjects`) e português
(`turmas`, `horarios`).

## Decisão

1. **Campos em camelCase**, conforme o front-end: `nome`, `turmaId`, `disciplinaId`,
   `professorId`, `criadoEm`, `atualizadoEm`, `status`, `serie`, `modalidade`, `turno`.
2. **Coleções em português e no plural:** `professores`, `disciplinas`, `turmas`, `aulas`,
   `historico`, `notificacoes`, `favoritos`, `configuracao`, `operacoes`, `outbox`,
   `assistente_uso`.
3. **Exceção:** `users` permanece com `uid`, `email`, `displayName`, `role`, porque é
   derivado do Firebase Auth e já está implementado em `garantirPerfil`.
4. **Sem `id` persistido** em documentos de domínio; o ID do documento é a identidade.
5. **Datas como `Timestamp`**; o cliente converte para ISO 8601.
6. **`horarios` → `aulas`** para alinhar ao vocabulário de domínio (`Aula`).

## Alternativas

| Alternativa | Motivo do descarte |
|---|---|
| A — seguir a arquitetura (`name`, `turmaID`) | Retrabalho em todo o cliente que lê o Firestore; mantém vocabulário misto. |
| B apenas nos campos, mantendo `professors`/`subjects`/`horarios` | Resolveria o bloqueio imediato, mas perpetuaria a mistura de idiomas e a ambiguidade “horário” × “aula”. |
| C — persistência na arquitetura + DTOs camelCase via CF | Obriga todas as leituras a passar por CF; perde leitura direta, aumenta custo/latência e prejudica o PWA offline. |

## Consequências

**Ganhos**

- Um único vocabulário no cliente, servidor, regras e índices.
- Nenhuma migração de dados: não há produção.
- Consultas e filtros do front-end continuam naturais.

**Custos e impactos**

- Atualizar `firestore.rules`, `firestore.indexes.json`, `docs/backend/*` e o modelo.
- O front-end precisa adicionar `turno`, converter `Timestamp` e ajustar
  `Notificacao.turmaIds` e `RegistroHistorico`.
- `Plano/arquitetura/modelo-dados-firestore.md` passa a ser histórico; a seção 4 continua
  como fonte do seed.

## Riscos

| ID | Risco | Mitigação |
|---|---|---|
| RISCO-01 | Divergência entre regras/documentação e caminhos antigos. | Atualização em um único PR; busca por `professors`, `subjects`, `horarios` antes do deploy. |
| RISCO-02 | Cliente lendo campo antigo `name`/`turmaID`. | Revisão de tipos e conversores; teste de integração após a mudança. |

## Aprovador

Arquiteto — decisão solicitada pelo Agente Back-End em 03/11/2026. Ratificação do
responsável humano recomendada antes do deploy; não é bloqueio para iniciar a implementação.
