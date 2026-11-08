# Relatório de Auditoria de Segurança: Análise das Firestore Rules (Deep Dive)

## Introdução
Esta auditoria analisa as regras de segurança `firestore.rules` sob o cenário de aplicação **client-only** (sem Cloud Functions). A segurança depende estritamente das regras para prevenir acessos indevidos.

## Achados de Segurança

### VUL-04: Exposição do ID de Documentos em `favoritos` (Severidade: Média)
- **Local:** Regra `match /favoritos/{favoritoId}`
- **Descrição:** A regra valida `favoritoId == request.auth.uid + '_' + request.resource.data.turmaId`. Embora o ID seja protegido, a leitura (`allow list`) permite que um usuário autenticado liste seus próprios favoritos.
- **Risco:** Teórico. Se um usuário conseguir prever IDs de favoritos de outros usuários, ele pode tentar acessar. A regra atual impede o acesso via `get` (`resource == null || mesmoUsuario(resource.data.uid)`), o que é uma boa prática.

### VUL-05: Dependência de `get()` para Autorização (Severidade: Alta)
- **Local:** Regra `function ehAdministrativo()` (Linha 16)
- **Análise:** `get(/databases/$(database)/documents/users/$(request.auth.uid))`
- **Risco:**
    1. **Performance/Disponibilidade:** Se o Firestore estiver sob carga, a latência de execução desta função (`get`) pode degradar a experiência do administrador.
    2. **Single Point of Failure:** Se por erro de configuração o documento do administrador no `users/` for deletado ou o campo `role` for alterado, o administrador perde o acesso imediatamente, podendo gerar um bloqueio administrativo (Denial of Service).
- **Recomendação:** Implementar `Custom Claims` no Firebase Auth para armazenar o `role`. Isso elimina o custo e o risco de uma leitura `get()` a cada operação.

### VUL-06: Risco de Race Condition em `historico` (Severidade: Média)
- **Local:** Regra `allow create: if ehAdministrativo()` (Linha 60)
- **Análise:** Como não há `batch` atômico entre a escrita na coleção de domínio (ex: `aulas`) e a escrita no `historico`, há um risco ínfimo de a regra de segurança permitir a escrita na coleção de domínio, mas a aplicação falhar na escrita do histórico, ou vice-versa.
- **Nota:** A aplicação atual utiliza `writeBatch` e `runTransaction` no lado do cliente, o que mitigou este risco significativamente.

## Checklist de Verificação de Segurança (Passou/Falhou)

| Item | Status | Observação |
|---|---|---|
| Autenticação Obrigatória | ✅ Passou | Regra catch-all `allow: if false` aplicada. |
| Proteção de Elevação de Privilégio | ✅ Passou | Regras impedem `update` em `users/` e `role` é forçado em `create`. |
| Proteção de Histórico | ✅ Passou | Usuários comuns não possuem `write` em `historico`. |
| Acesso Cruzado (Horizontal) | ✅ Passou | Filtros por `uid` em `favoritos` e `notificacoes`. |
| Validação de Input de Cliente | ⚠️ Atenção | O cliente envia os dados. As regras são a única validação. |

## Conclusões
O sistema é robusto dentro do modelo proposto. A maior vulnerabilidade não reside nas regras em si, mas na **arquitetura de confiança no cliente**.

### Recomendações Críticas
1. **Migração para Custom Claims:** Migrar `role` para `auth.token.role`. Isso torna a regra `ehAdministrativo` muito mais performática e menos sujeita a erros de leitura.
2. **Defesa em Profundidade (Zero-Trust):** Caso qualquer alteração de regra ocorra, realizar sempre uma auditoria automática antes de publicar.
3. **Monitoramento:** Ativar o monitoramento de uso das regras no console do Firebase para detectar tentativas de acesso negado frequentes (sinal de tentativa de exploração).
