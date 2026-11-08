# Guia de Refatoração: Transição para Arquitetura Client-Only

**Versão:** 1.0 (Transição)
**Status:** Obrigatório para remoção de Cloud Functions e IA.
**Objetivo:** Orientar o time técnico na migração do sistema de um modelo de "autoridade no servidor" para "autoridade no front-end".

---

## 1. Mudança de Paradigma
A arquitetura anterior baseava-se em Cloud Functions como autoridade (`ARC-04`). Sem elas, **o front-end torna-se a autoridade**.
*   **Antes:** Front-end solicitava, servidor validava e gravava.
*   **Depois:** Front-end valida, constrói a transação e grava diretamente no Firestore.

**⚠️ AVISO DE RISCO:** Esta arquitetura é inerentemente menos segura e sujeita a inconsistências por falhas de rede. A integridade dos dados depende estritamente da implementação das regras de negócio no `src/` e das regras de segurança no `firestore.rules`.

---

## 2. Ações de Refatoração (Back-end/Functions)

1.  **Exclusão da pasta `functions/`**: Remover todo o código server-side.
2.  **Remoção de Integrações**:
    *   Excluir qualquer chamada a `httpsCallable`.
    *   Remover dependências do `firebase-admin` no projeto.
    *   Remover segredos (API Keys da Gemini) do ambiente.

---

## 3. Ações de Refatoração (Front-end `src/`)

### 3.1. Validação de Negócio
Toda lógica de validação deve ser movida para camadas de serviço no `src/services/`.
*   **Regra de Conflito de Horário:** Deve ser implementada antes de qualquer `setDoc` ou `updateDoc`. O front-end deve carregar os horários existentes da turma/professor, validar localmente e só então disparar a escrita.
*   **Transações:** Utilizar `runTransaction` do SDK do Firebase para garantir atomicidade mínima em operações críticas (ex: mover um professor de uma turma para outra).

### 3.2. Autorização (Regras do Firestore)
As regras de segurança (`firestore.rules`) devem ser ajustadas para validar permissões de forma estática, sem depender de `custom claims`:
```javascript
// Exemplo de regra migrada
match /aulas/{aulaId} {
  allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

---

## 4. Auditoria e Logs
Sem Cloud Functions, a criação de logs de histórico deve ser feita via `batch write`:
1.  Sempre que houver uma alteração (update/create), o front-end deve adicionar uma operação de escrita na coleção `historico` dentro do mesmo `batch`.
2.  **Risco:** Se o usuário fechar o navegador ou a rede cair exatamente após a gravação da `aula` e antes da `historico`, teremos um dado sem rastro. **Este é um risco aceito nesta arquitetura.**

---

## 5. Roadmap de Implementação

| Etapa | Ação | Responsável |
|---|---|---|
| 1 | Remover pasta `functions/` e dependências relacionadas. | Backend / Dev |
| 2 | Reescrita das `firestore.rules` (regras estáticas). | Arquiteto / Dev |
| 3 | Mover validações (`conflito de horários`) para `src/services/`. | Front-end |
| 4 | Substituir chamadas `callable` por chamadas diretas ao `firestore`. | Front-end |
| 5 | Remoção completa de `src/features/assistente/`. | Front-end |

---

## 6. Próximos Passos
1.  **Imediato:** O time de desenvolvimento deve confirmar a remoção da pasta `functions` do repositório.
2.  **Revisão:** As novas `firestore.rules` devem ser revisadas pelo Arquiteto antes do deploy.
3.  **Deploy:** O deploy no Render será simplificado, focando apenas na build estática do React.
