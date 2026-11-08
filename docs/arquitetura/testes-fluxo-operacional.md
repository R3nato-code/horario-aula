# Plano de Testes: Fluxo Operacional (Client-Only)

**Versão:** 1.0
**Status:** Validação em campo
**Objetivo:** Guia para o testador validar funcionalidades em um sistema que não utiliza mais Cloud Functions. A autoridade da validação agora é dividida entre as regras do React (Interface) e as Regras de Segurança do Firestore.

---

## 1. Regras de Ouro para o Testador
1. **Front-end é a autoridade:** O comportamento de erro deve ser visível no UI.
2. **Segurança em Profundidade:** Mesmo que o UI impeça uma ação inválida, o Firestore deve negar a escrita. Se o Firestore permitir uma ação que o UI deveria bloquear, temos um **BUG de segurança**.
3. **Consistência via Transaction/Batch:** Alterações que afetam múltiplas coleções (ex: `aulas` + `historico`) devem ser atômicas.

---

## 2. Matriz de Fluxos Críticos

| Funcionalidade | Ação no UI | Lógica de Negócio (Front) | Ação no Firestore | Regra de Segurança (Rules) |
|---|---|---|---|---|
| **Criar Aula** | Preencher formulário | Validar conflito horários | `batch.set(aula) + batch.set(historico)` | `request.auth` == admin |
| **Editar Aula** | Atualizar campos | Validar conflito horários | `batch.update(aula) + batch.set(historico)` | `request.auth` == admin |
| **Excluir Aula** | Botão excluir | - | `batch.delete(aula) + batch.set(historico)` | `request.auth` == admin |
| **Consulta** | Filtro de Turma/Prof | - | `getDocs` direto | `request.auth` != null |

---

## 3. Roteiro de Testes (Checklist)

### 3.1. Testes de Integridade (Atomicidade)
- [ ] **Simulação de falha:** Tentar criar uma aula e desconectar a rede logo após o clique (observar se o histórico foi gravado).
- [ ] **Conflito:** Tentar inserir dois registros de aula para o mesmo horário/professor simultaneamente (via múltiplos navegadores).

### 3.2. Testes de Segurança (Negative Testing)
- [ ] **Acesso não autorizado:** Tentar escrever no Firestore via console do navegador (utilizando um UID de aluno ou usuário não autenticado). **Deve ser negado.**
- [ ] **Manipulação de Perfil:** Tentar alterar o campo `role` na coleção `users` via cliente. **Deve ser negado.**

### 3.3. Testes de Auditoria
- [ ] **Rastreabilidade:** Para cada ação bem sucedida de escrita (`CUD`), verificar se existe um documento correspondente na coleção `historico` com o `uid` do autor e o `timestamp` correto.

---

## 4. Onde reportar falhas
Qualquer divergência encontrada (ex: O UI permitiu a gravação de uma aula com conflito de horário) deve ser aberta como `BUG-xx` no sistema de rastreamento, citando este documento como referência de comportamento esperado.
