# Plano de Auditoria de Segurança - Firestore Rules

## Escopo
Revisão completa das `firestore.rules` dado que, sem Cloud Functions para intermediar, a segurança depende exclusivamente destas regras.

## Objetivos
1. Validar se o controle de acesso horizontal (dados de outros alunos) e vertical (elevação de privilégio) está garantido.
2. Garantir que a integridade dos dados (campos proibidos de alteração) seja respeitada.
3. Verificar a proteção do histórico (somente leitura para usuários).

## Cenários de Teste (Simulação)
- **T1: Tentativa de leitura indevida:** Aluno tenta listar ou ler `professores`, `disciplinas` ou `turmas` (esperado: sucesso, mas limitado a dados permitidos).
- **T2: Tentativa de escrita indevida:** Aluno tenta alterar dados em `professores`, `disciplinas`, `turmas` ou `aulas`.
- **T3: Escala de Privilégio:** Aluno tenta criar/atualizar um usuário para definir `role = 'admin'`.
- **T4: Manipulação de Histórico:** Aluno tenta inserir ou alterar documentos em `historico`.
- **T5: Acesso Cruzado:** Usuário A tenta ler ou excluir `notificacoes` ou `favoritos` do Usuário B.

## Critérios de Sucesso
- Nenhuma operação de escrita não autorizada deve ser permitida.
- Nenhuma leitura de dados sensíveis (se houver) fora do escopo deve ser permitida.
- O campo `role` nunca deve ser alterado pelo cliente.
