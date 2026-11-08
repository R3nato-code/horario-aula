# Plano de Testes: PT-01 - Fluxo Operacional (Client-Only)

**Objetivo:** Validar a integridade, segurança e auditoria das operações CRUD de aulas no sistema, garantindo que a lógica de negócio no front-end e as regras de segurança no Firestore estejam alinhadas.

**Escopo:**
- Criação, Edição e Exclusão de Aulas.
- Regras de segurança (Firestore Rules).
- Atomicidade via Batches.
- Rastreabilidade (Coleção `historico`).

**Perfis a Simular:**
- Admin (Perfil autorizado)
- Professor (Perfil com restrições)
- Aluno (Perfil de leitura)
- Não Autenticado

**Referência:** `docs/arquitetura/testes-fluxo-operacional.md`
