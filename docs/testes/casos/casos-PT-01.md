# Casos de Teste - Fluxo Operacional (PT-01)

| ID | Título | Perfil | Pré-condição | Passos | Resultado Esperado | Prioridade |
|---|---|---|---|---|---|---|
| **CT-01** | Escrita não autorizada (Firestore) | Aluno | Autenticado | Tentar `batch.set` em `aulas` | Erro de permissão (denied) | Crítica |
| **CT-02** | Manipulação de Perfil | Aluno | Autenticado | Tentar `update` em `users.role` | Erro de permissão (denied) | Crítica |
| **CT-03** | Auditoria: Criação de Aula | Admin | Autenticado | Criar nova aula | Doc criado em `aulas` e `historico` | Alta |
| **CT-04** | Auditoria: Exclusão de Aula | Admin | Autenticado | Excluir aula existente | Doc removido em `aulas`, log em `historico` | Alta |
| **CT-05** | Validação de Conflito | Admin | Autenticado | Inserir 2 aulas p/ mesmo prof/horário | UI bloqueia/Firebase rejeita | Alta |
| **CT-06** | Acesso de leitura | Aluno | Autenticado | Ler coleção `aulas` | Leitura permitida | Média |
