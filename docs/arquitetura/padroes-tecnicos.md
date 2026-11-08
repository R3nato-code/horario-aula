# Padrões técnicos

**Versão:** 1.0
**Data:** 03/11/2026
**Status:** obrigatório para front-end e Cloud Functions a partir de ADR-01.

---

## 1. Nomenclatura

| PAD | Regra |
|---|---|
| PAD-01 | Coleções no plural e em português: `professores`, `disciplinas`, `turmas`, `aulas`, `historico`, `notificacoes`, `favoritos`, `operacoes`, `outbox`, `configuracao`, `assistente_uso`. Exceção: `users`. |
| PAD-02 | Campos em `camelCase`. Enums em minúsculas (`'ativo'`, `'arquivado'`, `'ensino-medio'`, `'tecnico'`, `'manha'`). |
| PAD-03 | IDs são strings opacas. Nunca derivar significado de `split`, prefixo ou sufixo, exceto a composição documentada da aula. |
| PAD-04 | Documento de domínio não repete o próprio `id`; o ID do documento é a identidade. |
| PAD-05 | Referências guardam o ID do documento alvo, nunca URL ou caminho absoluto. |
| PAD-06 | Um único vocabulário: “aula” (não “horário” para o registro), “professor”, “disciplina”, “turma”, “configuração”. |

## 2. Tipos e contratos

| PAD | Regra |
|---|---|
| PAD-07 | TypeScript estrito; `any` proibido sem justificativa registrada. |
| PAD-08 | Payloads de callable têm tipo de entrada e saída explícitos. Enquanto não houver pacote compartilhado, os tipos são espelhados em `src/types/contratos.ts` e `functions/src/contracts/` e revisados em conjunto. |
| PAD-09 | O cliente valida para usabilidade; o servidor valida para autoridade. Nunca confiar em validação de UI. |
| PAD-10 | Enums desconhecidos são rejeitados no servidor, não silenciosamente convertidos. |

## 3. Datas e horários

| PAD | Regra |
|---|---|
| PAD-11 | Datas persistidas como `Timestamp` do Firestore. Criação/atualização usam `FieldValue.serverTimestamp()`. |
| PAD-12 | O cliente converte `Timestamp` para ISO 8601 nos conversores (`src/lib/firebase/conversoes.ts`). Componentes nunca recebem `Timestamp` cru. |
| PAD-13 | Horários de aula são strings `HH:MM` derivadas de `configuracao/atual`; não são persistidos em `aulas`. |
| PAD-14 | Fuso de referência para “hoje/amanhã”: `America/Sao_Paulo` (assunção até LAC-21). |

## 4. Camadas e acesso a dados

| PAD | Regra |
|---|---|
| PAD-15 | Fluxo: UI → hook/feature → serviço → (callable ou leitura Firestore). Componente de UI não importa `firebase/firestore`. |
| PAD-16 | Leitura direta permitida apenas para: catálogo, aulas, configuração, próprias notificações e próprios favoritos, conforme regras. |
| PAD-17 | Escrita de domínio somente por Cloud Function. Exceções: favoritos e marcação de notificação como lida, restritos ao próprio usuário (ADR-05). |
| PAD-18 | Histórico, `operacoes`, `outbox` e `assistente_uso` não são acessíveis ao cliente. |

## 5. Integridade

| PAD | Regra |
|---|---|
| PAD-19 | Toda mutação de domínio grava o histórico na mesma transação. Se a transação falhar, nada é aplicado. |
| PAD-20 | Operações em massa são tudo-ou-nada, com limite de 200 aulas e chave de idempotência. |
| PAD-21 | Notificações são efeito colateral assíncrono via outbox; nunca participam da transação principal. |
| PAD-22 | Exclusão de cadastro preserva o histórico com snapshot descritivo. |
| PAD-23 | IDs determinísticos são usados onde a unicidade é regra de negócio: aula e favorito. |
| PAD-24 | O seed é idempotente e nunca sobrescreve dados existentes sem `--sobrescrever`. |

## 6. Erros, logs e observabilidade

| PAD | Regra |
|---|---|
| PAD-25 | Erros de callable usam códigos estáveis: `unauthenticated`, `permission-denied`, `invalid-argument`, `not-found`, `already-exists`, `failed-precondition`, `aborted`, `resource-exhausted`, `unavailable`, `internal`. |
| PAD-26 | Toda resposta de erro inclui `correlacao` em `details`. A mensagem ao usuário é segura; o detalhe técnico vai apenas para o log. |
| PAD-27 | Logs não contêm token, e-mail em texto claro desnecessário, pergunta/resposta do assistente ou conteúdo sensível. |
| PAD-28 | Operações em massa e exclusões registram `correlacao` no histórico e no log. |
| PAD-29 | Falha do outbox é registrada e reprocessável; não é mascarada como sucesso da notificação. |

## 7. Segurança

| PAD | Regra |
|---|---|
| PAD-30 | Negar por padrão nas regras do Firestore. |
| PAD-31 | Papel e escopo vêm do servidor; nunca do payload. |
| PAD-32 | Segredos (Gemini) apenas em Secret Manager/ambiente do servidor. |
| PAD-33 | Menor privilégio: `admin` gerencia catálogo/aulas; `gestor` é o nível superior; `professor` e `aluno` somente leem. |
| PAD-34 | Toda função valida entrada, autoriza o chamador e retorna erro com código estável. |

## 8. Testabilidade

| PAD | Regra |
|---|---|
| PAD-35 | Regras puras (conflito, configuração, validação de cadastro, slug, hash) ficam em `domain/` e têm teste unitário. |
| PAD-36 | Regras do Firestore têm teste no emulador antes da publicação; o bloqueio atual é JDK 21. |
| PAD-37 | Contratos de callable têm teste de integração com payload inválido, sem permissão e caminho feliz. |

## 9. Versionamento de contrato

| PAD | Regra |
|---|---|
| PAD-38 | Mudança incompatível de payload exige análise de impacto (`IMP-xx`) e, se necessário, versionamento da callable (`v2`). |
| PAD-39 | Não renumerar ADRs, `ENT`, `FL`, `PERM`, `IDX` ou `RISCO` publicados. |
| PAD-40 | Documentação viva: toda decisão relevante atualiza o artefato correspondente em `docs/arquitetura/`. |

## 10. Build, deploy e ambientes

| PAD | Regra |
|---|---|
| PAD-41 | O build de produção usa `npm ci` e o `package-lock.json` versionado. `npm install` não é aceito como comando de release. |
| PAD-42 | A versão do Node é fixada no ambiente de build (`NODE_VERSION` ou `.node-version`). O build não pode depender da versão padrão do provedor. |
| PAD-43 | Variáveis `VITE_*` são **públicas** e embutidas no bundle. Segredos, service accounts e chaves de IA nunca usam esse prefixo. |
| PAD-44 | Variáveis `VITE_*` são resolvidas em tempo de build; alteração exige novo deploy, não apenas restart. |
| PAD-45 | O modo de produção deve ser explícito: `VITE_DATA_MODE=firebase`. A partir do primeiro release no Render, o build deve falhar se a configuração Firebase estiver incompleta, em vez de cair silenciosamente em demonstração. Implementação pendente. |
| PAD-46 | O roteamento por hash é o contrato de compatibilidade com hospedagem estática. History routing exige rewrite e teste de deep link. |
| PAD-47 | Regras e índices do Firestore são publicados pelo Firebase CLI, em etapa separada do build do front-end. Nenhum release é considerado completo sem os dois. |
| PAD-48 | Assets com hash usam cache imutável; `sw.js` e `manifest.webmanifest` usam `no-cache`. Cabeçalhos de segurança são verificados após o deploy. |
| PAD-49 | Todo deploy passa pelo checklist e pelo smoke test de `docs/arquitetura/deploy-render.md`. |
