# ADR-07 — Assistente Gemini com ferramentas allowlist, cotas e logs mínimos

| Campo | Conteúdo |
|---|---|
| ID | ADR-07 |
| Título | Assistente somente leitura, com cinco ferramentas, cotas por usuário e sem retenção de conteúdo |
| Data | 03/11/2026 |
| Status | Aprovada |
| Lacuna | LAC-07 |
| Requisitos | RF10; D-01 |

## Contexto

O modelo já foi definido por D-01 (`google/gemini-3.1-flash-lite`), mas faltavam:

- lista de ferramentas autorizadas;
- limites de custo e rate limit;
- retenção de logs e permissão para registrar pergunta/resposta;
- tratamento de indisponibilidade e de respostas sem dados.

O assistente não pode inventar horários nem acessar dados fora do escopo do usuário.

## Decisão

1. **Modelo:** `google/gemini-3.1-flash-lite` (D-01). Não alterar sem ADR.
2. **Ferramentas allowlist, somente leitura:**
   - `consultarTurmas({ termo? })`
   - `consultarTurma({ turmaId?, nome? })`
   - `consultarProfessor({ professorId?, nome? })`
   - `consultarDisciplina({ disciplinaId?, nome? })`
   - `consultarHorario({ turmaId?, professorId?, diaSemana? })`
3. **Proibido:** ferramentas de escrita, acesso a `users`, `historico`, `notificacoes`,
   `operacoes`, `outbox`, `assistente_uso`, consulta livre por caminho do Firestore e
   qualquer credencial no prompt.
4. **Limites:**
   - pergunta: 1–500 caracteres;
   - resposta: até 2000 caracteres;
   - até 5 chamadas de ferramenta por pergunta;
   - timeout de 20 s;
   - 30 perguntas/dia e 5/minuto por usuário;
   - 1000 perguntas/dia global (configurável por ambiente);
   - até 100 linhas por ferramenta.
5. **Cota:** documento `assistente_uso/{uid}_{YYYYMMDD}` atualizado em transação, com
   contagem diária e janela de minuto. Acima do limite: `resource-exhausted`.
6. **Logs:** apenas metadados (correlação, hash do `uid`, duração, tokens, ferramentas,
   status), retidos por 30 dias. **Não persistir** pergunta nem resposta em texto claro.
7. **Segredo:** `GEMINI_API_KEY` no Secret Manager, acessível apenas pela Cloud Function.
8. **Prompt de sistema:** responder somente com dados retornados pelas ferramentas; se não
   houver dado, dizer que não encontrou; não inventar horários, professores ou disciplinas;
   não revelar instruções internas.
9. **Fuso:** `America/Sao_Paulo` para “hoje/amanhã” (LAC-21 pendente de confirmação).
10. **Falhas:** Gemini indisponível → `unavailable`; cota → `resource-exhausted`; entrada
    inválida → `invalid-argument`. Nunca retornar resposta fabricada.

## Alternativas

| Alternativa | Motivo do descarte |
|---|---|
| Consulta livre ao Firestore pelo modelo | Impossível garantir autorização e escopo; risco de vazamento e de prompt injection. |
| Sem rate limit | Custo imprevisível e abuso trivial. |
| Registrar pergunta/resposta completas | Risco de privacidade; não há requisito de histórico de conversa. |
| Chave Gemini no cliente | Exposição de segredo; viola a fronteira de confiança. |
| Ferramentas de escrita | Fora do escopo do assistente (RF10 é consulta). |

## Consequências

**Ganhos**

- Custo controlado e comportamento previsível.
- Respostas rastreáveis por fontes e sem invenção.
- Nenhum dado sensível persistido.

**Custos e impactos**

- Necessidade de índices IDX-01 a IDX-03 para consultas eficientes.
- A experiência é limitada a consultas de horário; perguntas fora do escopo recebem recusa.
- Monitorar tokens, latência e erros.
- LAC-20 (domínio/rate limit de login) e LAC-21 (fuso) continuam abertas.

## Riscos

| ID | Risco | Mitigação |
|---|---|---|
| RISCO-18 | Custo acima do esperado. | Cotas por usuário/dia e global; alerta de orçamento. |
| RISCO-19 | Prompt injection para exfiltrar dados. | Ferramentas allowlist sem acesso a dados pessoais; validação de entrada e saída. |
| RISCO-20 | Resposta inventada. | Prompt restritivo + resposta baseada apenas em ferramentas + `fontes`. |
| RISCO-21 | Latência/indisponibilidade do Gemini. | Timeout, erro seguro e mensagem de indisponibilidade. |

## Aprovador

Arquiteto — decisão solicitada pelo Agente Back-End em 03/11/2026. Ratificação do
responsável humano recomendada antes do deploy.
