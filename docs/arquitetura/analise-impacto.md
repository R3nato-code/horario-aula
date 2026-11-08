# Análise de impacto

**Versão:** 1.0
**Data:** 03/11/2026
**Status:** aprovada para implementação; impactos e riscos registrados.

---

## IMP-01 — Schema canônico (LAC-08)

| Campo | Conteúdo |
|---|---|
| ID | IMP-01 |
| Mudança proposta | Adotar `nome`, `turmaId`, `disciplinaId`, `professorId`, `criadoEm`, `atualizadoEm`, `turno`; coleções `professores`, `disciplinas`, `turmas`, `aulas`. |
| Origem | LAC-08 / ADR-01. |
| Componentes afetados | ARC-01, ARC-03, ARC-04; ENT-01 a ENT-05; FL-01, FL-02. |
| Dados | Sem migração (não há dados em produção). Se houver emulador, limpar e reimportar. |
| Segurança | Regras passam a usar novos caminhos; notificações/favoritos ganham regras próprias. |
| Contratos | `salvarCadastro`, `salvarAula`, leituras diretas e tipos de domínio. |
| Operação | Atualizar `firestore.rules`, `firestore.indexes.json`, `docs/backend/*` e o front-end no mesmo PR. |
| Requisitos afetados | RF02, RF04–RF06, RF12, RF18, RF48–RF50. |
| Riscos | RISCO-01, RISCO-02. |
| Recomendação | **Aprovar.** É o bloqueio raiz; sem ele não há índices, CRUD nem seed. |

---

## IMP-02 — Identidade da aula e horários derivados (LAC-02)

| Campo | Conteúdo |
|---|---|
| ID | IMP-02 |
| Mudança proposta | ID `${turmaId}_${diaSemana}_${periodo}`; sem `inicio`/`fim` persistidos; configuração é a fonte dos horários. |
| Origem | LAC-02 / ADR-02. |
| Componentes afetados | ARC-03, ARC-04; ENT-04, ENT-06; FL-01. |
| Dados | Nenhuma migração; seed cria 420 documentos determinísticos. |
| Segurança | Escrita de aula continua server-side; conflito revalidado no servidor. |
| Contratos | `salvarAula`, `removerAula`, `salvarConfiguracao`, leitura de aulas. |
| Operação | Configuração global; exclusão/renumeração de período em uso bloqueada. |
| Requisitos afetados | RF07, RF11–RF15, RF33, RF36–RF42; RF57 proposto. |
| Riscos | RISCO-03, RISCO-04, RISCO-05. |
| Recomendação | **Aprovar.** Evita duplicidade e elimina sincronização de snapshot. |

---

## IMP-03 — Edição em massa (LAC-05)

| Campo | Conteúdo |
|---|---|
| ID | IMP-03 |
| Mudança proposta | Limite de 200 aulas, transação única, operação idempotente e outbox. |
| Origem | LAC-05 / ADR-03. |
| Componentes afetados | ARC-03, ARC-04; ENT-04, ENT-07, ENT-09, ENT-10; FL-02. |
| Dados | Novas coleções `operacoes` e `outbox`; sem migração. |
| Segurança | Autorização administrativa; limite contra abuso; chave de idempotência. |
| Contratos | `previaEdicaoEmMassa`, `confirmarEdicaoEmMassa`. |
| Operação | Monitorar transações de 402 escritas e fan-out; alertas de erro. |
| Requisitos afetados | RF23–RF30, RF34, RF35, RF47. |
| Riscos | RISCO-06, RISCO-07, RISCO-08. |
| Recomendação | **Aprovar.** É a única opção que preserva tudo-ou-nada e auditoria. |

---

## IMP-04 — Histórico e auditoria (LAC-10/LAC-11)

| Campo | Conteúdo |
|---|---|
| ID | IMP-04 |
| Mudança proposta | Coleção única `historico`, append-only, consulta por `admin`/`gestor`, retenção indefinida. |
| Origem | LAC-10, LAC-11 / ADR-04. |
| Componentes afetados | ARC-03, ARC-04; ENT-05; FL-01, FL-02. |
| Dados | Nenhum dado existente; histórico começa na implantação. |
| Segurança | Fechado ao cliente; callable valida papel; sem update/delete. |
| Contratos | `listarHistorico`; gravação interna em todas as mutações. |
| Operação | Índices IDX-04 a IDX-06; monitorar crescimento. |
| Requisitos afetados | RF17–RF22, RF30, RF40, RF53. |
| Riscos | RISCO-09, RISCO-10, RISCO-11. |
| Recomendação | **Aprovar.** Atende RF22 e RF53 sem depender de subcoleções. |

---

## IMP-05 — Notificações e favoritos (LAC-13)

| Campo | Conteúdo |
|---|---|
| ID | IMP-05 |
| Mudança proposta | `notificacoes` com TTL 180 dias, agrupamento por operação/usuário; `favoritos` com ID determinístico. |
| Origem | LAC-13 / ADR-05. |
| Componentes afetados | ARC-01, ARC-03, ARC-04; ENT-07, ENT-08; FL-02. |
| Dados | Novas coleções; TTL em `expiraEm`. |
| Segurança | Leitura/update só do próprio `uid`; criação server-side. |
| Contratos | Leitura direta e update de `lida`/`lidaEm`; sem callable de notificação. |
| Operação | Configurar TTL; monitorar fan-out e falhas do outbox. |
| Requisitos afetados | RF09, RF43–RF47. |
| Riscos | RISCO-12, RISCO-13, RISCO-14. |
| Recomendação | **Aprovar.** Menor custo e melhor offline que CF para dados do próprio usuário. |

---

## IMP-06 — Exclusão segura (LAC-16)

| Campo | Conteúdo |
|---|---|
| ID | IMP-06 |
| Mudança proposta | Ciclo ativo → arquivado → excluído; bloqueio por aulas ativas; snapshot no histórico. |
| Origem | LAC-16 / ADR-06. |
| Componentes afetados | ARC-04; ENT-01 a ENT-03; FL-01. |
| Dados | Nenhuma migração; exclusão remove documento e preserva histórico. |
| Segurança | Somente callable administrativa; regras negam delete direto. |
| Contratos | `alterarStatusCadastro`, `excluirCadastro`. |
| Operação | Fluxo em duas etapas; exclusão de turma limpa favoritos. |
| Requisitos afetados | RF48–RF53. |
| Riscos | RISCO-15, RISCO-16, RISCO-17. |
| Recomendação | **Aprovar.** É a interpretação conservadora possível sem LAC-14. |

---

## IMP-07 — Assistente Gemini (LAC-07)

| Campo | Conteúdo |
|---|---|
| ID | IMP-07 |
| Mudança proposta | Callable `perguntarAoAssistente` com 5 ferramentas allowlist, cotas e logs mínimos. |
| Origem | LAC-07 / ADR-07; D-01. |
| Componentes afetados | ARC-01, ARC-04, ARC-05, ARC-06; FL-03. |
| Dados | `assistente_uso` para cota; nenhum conteúdo de conversa persistido. |
| Segurança | Segredo no Secret Manager; somente leitura; sem dados pessoais. |
| Contratos | `perguntarAoAssistente`; ferramentas internas. |
| Operação | Monitorar custo, latência, erros 429/5xx e cota. |
| Requisitos afetados | RF10. |
| Riscos | RISCO-18, RISCO-19, RISCO-20, RISCO-21. |
| Recomendação | **Aprovar.** Custo e escopo controlados; nenhum acesso amplo ao Firestore. |

---

## IMP-08 — Publicação do front-end como Static Site no Render (ADR-08)

| Campo | Conteúdo |
|---|---|
| ID | IMP-08 |
| Mudança proposta | Publicar a SPA React/Vite como Static Site no Render, com build `npm ci && npm run build`, publish `dist`, variáveis `VITE_*` em tempo de build, rewrite `/* → /index.html`, cabeçalhos de segurança/cache e domínios autorizados no Firebase Auth. Regras e índices do Firestore continuam em release separado pelo Firebase CLI. |
| Origem | Solicitação do responsável pelo projeto (deploy no Render) / ADR-08. |
| Componentes afetados | ARC-01, ARC-02, ARC-03, ARC-07. |
| Dados | Nenhuma migração. Firestore inalterado; índices publicados separadamente. O artefato `dist/` não é versionado. |
| Segurança | Domínios autorizados no Firebase Auth; COOP para popup Google; headers de segurança; proibição de segredos em `VITE_*`; regras do Firestore permanecem a autoridade. LAC-20 continua aberta. |
| Contratos | Nenhum contrato de dados muda. O contrato operacional passa a ser: `VITE_DATA_MODE=firebase`, build reprodutível, `dist/` publicado, regras/índices em etapa própria. |
| Operação | Deploy automático por push em `main`; build atômico; rollback por histórico do Render ou `git revert`; variáveis não são revertidas pelo rollback; PWA com `sw.js` sem cache. |
| Requisitos afetados | NFR de disponibilidade, segurança e operação (rastreabilidade pendente; matriz de requisitos não está no repositório). |
| Riscos | RISCO-24 a RISCO-32. |
| Recomendação | **Aprovar**, condicionado à aprovação humana da ADR-08, à autorização dos domínios no Firebase e à decisão sobre LAC-20 antes de divulgar a URL. |

### IMP-08.1 — Ordem de release

1. Publicar índices do Firestore e aguardar `Enabled`.
2. Publicar regras do Firestore.
3. Publicar o front-end no Render.
4. Executar checklist e smoke test de `deploy-render.md`.

### IMP-08.2 — Rollback do deploy Render

| Cenário | Ação |
|---|---|
| Build falhou | Nenhuma ação: o Render mantém o deploy anterior. |
| Versão nova com defeito | Rollback pelo histórico de deploys do Render ou `git revert` + push. |
| Variável de ambiente errada | Corrigir no dashboard e refazer o deploy; rollback de deploy não reverte env. |
| Regra/índice com problema | Reverter o arquivo e publicar pelo Firebase CLI; o front-end não é afetado automaticamente. |
| Cache/PWA antigo | Conferir `Cache-Control` de `sw.js`; hard reload; versionar `CACHE_NAME`. |

---

## 8. Plano de implementação recomendado

> **Nota:** este plano foi escrito para o modelo server-side (ADR-01 a ADR-07). No estado
> Client-Only atual, as etapas 1–9 são históricas. O release vigente é o de
> `docs/arquitetura/deploy-render.md` (ver IMP-08.1).

1. **Schema e regras (Back-End):** atualizar `firestore.rules`, `firestore.indexes.json`,
   tipos e documentação para os caminhos canônicos.
2. **CRUD de cadastros + histórico:** `salvarCadastro`, `alterarStatusCadastro`,
   `excluirCadastro`; histórico na mesma transação.
3. **Seed:** validar `horarios-2026.json`, executar `--dry-run`, depois `--confirmar`.
4. **Aulas e configuração:** `salvarAula`, `removerAula`, `salvarConfiguracao`.
5. **Edição em massa:** prévia, confirmação, `operacoes`, `outbox`.
6. **Notificações e favoritos:** regras diretas + fan-out.
7. **Assistente:** ferramentas, cotas, Gemini.
8. **Front-End:** chamar `garantirPerfil` após login; adaptar tipos/conversores; implementar
   telas e serviços.
9. **Testes:** unidade + integração; regras quando JDK 21 estiver disponível.
10. **Deploy Render:** índices → regras → front-end; checklist e smoke test (IMP-08.1).

## 9. Rollback

- **Antes de dados em produção:** reverter o PR; não há migração.
- **Depois do seed:** exportar o Firestore antes de mudanças de schema; rollback exige
  restaurar o export ou script de migração inversa. Nenhuma mudança de schema deve ser
  feita “por conveniência” após o seed.
- **Edição em massa:** a transação é atômica; não há rollback parcial. Se o outbox falhar,
  a edição permanece e a notificação é reprocessada.

## 10. Riscos consolidados

| ID | Risco | Prob. | Impacto | Mitigação | Responsável |
|---|---|---|---|---|---|
| RISCO-01 | Divergência de caminhos antigos | Média | Alto | Busca global e PR único | Back-End |
| RISCO-02 | Cliente lendo campo antigo | Média | Alto | Revisão de tipos/conversores | Front-End |
| RISCO-03 | ID composto interpretado errado | Baixa | Médio | Helper único; ID opaco | Back-End |
| RISCO-04 | Configuração orfana aulas | Média | Alto | Bloqueio + prévia | Back-End |
| RISCO-05 | Horário diferente por turma | Baixa | Alto | Fora de D-02; novo ADR se necessário | Arquiteto/Requisitos |
| RISCO-06 | Transação de 200 aulas lenta | Média | Médio | Medir e reduzir limite se preciso | Back-End |
| RISCO-07 | Fan-out excessivo | Média | Médio | Lotes e idempotência | Back-End |
| RISCO-08 | Duplo envio de massa | Média | Alto | Chave de idempotência | Back-End/Front-End |
| RISCO-09 | Histórico crescendo | Alta | Médio | Paginação e monitoramento | Back-End |
| RISCO-10 | Dados sensíveis no histórico | Baixa | Alto | Campos mínimos | Arquiteto/Back-End |
| RISCO-11 | Tentativa de alterar histórico | Baixa | Alto | Sem endpoint; regras fechadas | Back-End |
| RISCO-12 | Regra de notificação permissiva | Média | Alto | Testes de regras | Back-End |
| RISCO-13 | Fan-out lento | Média | Médio | Lotes/outbox | Back-End |
| RISCO-14 | Notificação órfã | Baixa | Baixo | TTL 180 dias | Back-End |
| RISCO-15 | Admin bloqueado ao arquivar | Média | Médio | Mensagem + atalho de remanejamento | Front-End |
| RISCO-16 | Exclusão de turma com muitos favoritos | Baixa | Médio | Limite 500 + outbox | Back-End |
| RISCO-17 | Snapshot insuficiente | Baixa | Alto | Snapshot completo + teste | Back-End |
| RISCO-18 | Custo Gemini | Média | Alto | Cotas + alerta de orçamento | Back-End |
| RISCO-19 | Prompt injection | Média | Alto | Allowlist e prompt restritivo | Back-End |
| RISCO-20 | Resposta inventada | Média | Alto | Ferramentas + recusa explícita | Back-End |
| RISCO-21 | Indisponibilidade Gemini | Média | Baixo | Timeout e erro seguro | Back-End |
| RISCO-22 | Seed divergente da fixture demo | Média | Médio | Validação de 420/14/5/6 | Back-End |
| RISCO-23 | Regras sem teste (JDK 21) | Alta | Alto | Instalar JDK 21 / CI | Responsável humano |
| RISCO-24 | Produção publicada em modo demo por `VITE_DATA_MODE` ausente ou configuração Firebase incompleta | Alta | Alto | Checklist de env; falha de build quando o modo Firebase estiver incompleto | Front-End/Operação |
| RISCO-25 | Login quebrado por domínio não autorizado no Firebase Auth | Alta | Alto | Autorizar `*.onrender.com` e domínio customizado antes do go-live | Operação |
| RISCO-26 | PWA/CDN servindo versão antiga após deploy | Média | Médio | `sw.js` com `no-cache`; versionar `CACHE_NAME`; smoke test de atualização | Front-End |
| RISCO-27 | Segredo exposto em variável `VITE_*` | Baixa | Alto | Apenas configuração pública; revisão do bundle e do `.env.example` | Arquiteto/Front-End |
| RISCO-28 | Regras/índices dessincronizados do front-end | Média | Alto | Release em ordem: índices → regras → front-end; checklist único | Operação/Back-End |
| RISCO-29 | Limites de banda/build do plano Render | Média | Baixo | Monitorar dashboard; cache imutável de assets; build filter | Operação |
| RISCO-30 | Popup Google bloqueado ou `window.opener` perdido | Média | Médio | COOP `same-origin-allow-popups`; teste em navegadores; fallback de mensagem | Front-End |
| RISCO-31 | Acesso público amplo por LAC-20 (sem restrição de domínio de login) | Alta | Alto | Decisão de negócio antes de divulgar a URL; restringir provider/domínio quando aprovado | Requisitos/Responsável humano |
| RISCO-32 | Modelo Client-Only sem autoridade server-side, contrariando a diretriz original | Alta | Alto | Ratificação explícita do modelo; regras revisadas; considerar Functions em nova ADR | Arquiteto/Responsável humano |
