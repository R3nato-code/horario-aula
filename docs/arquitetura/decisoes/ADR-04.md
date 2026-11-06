# ADR-04 — Histórico único, append-only e auditável

| Campo | Conteúdo |
|---|---|
| ID | ADR-04 |
| Título | Coleção única `historico`, imutável, consultada por `admin`/`gestor` via callable |
| Data | 03/11/2026 |
| Status | Aprovada |
| Lacunas | LAC-10, LAC-11 |
| Requisitos | RF17–RF22, RF30, RF40, RF53 |

## Contexto

Os requisitos exigem registrar toda alteração de horário (RF17), valores antes/depois
(RF18), responsável (RF19), timestamp do servidor (RF20), consulta autorizada (RF21) e
proteção contra edição/exclusão (RF22). Também era preciso decidir se o CRUD de cadastros
gera auditoria (LAC-11) e por quanto tempo o histórico é retido (LAC-10).

As regras atuais negam toda leitura de `historico`; não havia schema.

## Decisão

1. **Uma coleção única `historico`**, append-only. Não usar subcoleção por entidade, para
   permitir consultas por responsável, tipo e período.
2. **Quem consulta:** `admin` e `gestor`, via callable `listarHistorico`.
   `professor` e `aluno` recebem `permission-denied`.
3. **Acesso direto:** nenhum. Regras negam `read` e `write`; a consulta usa Admin SDK após
   validar o papel.
4. **Retenção:** indefinida na v1. Não há TTL nem exclusão automática. Expurgo futuro exigirá
   ADR e política de privacidade.
5. **Exportação:** não faz parte da v1. Pode ser adicionada como callable administrativa
   futura, sem alterar o schema.
6. **Auditoria de cadastros (LAC-11):** sim. Criar, editar, arquivar, reativar e excluir
   professor, disciplina e turma gera histórico na mesma transação.
7. **Outros eventos auditados:** aula (criar/editar/remover), configuração (RF40),
   permissões (quando RF58 for aprovado) e seed (`tipo: 'sistema'`).
8. **Registro de exclusão:** `alteracao.antes` contém o snapshot completo; `depois` é `{}`;
   `entidadeNome` preserva o nome descritivo (RF53). O histórico nunca é apagado.
9. **Campos:** `tipo`, `entidade`, `entidadeId`, `entidadeNome`, `descricao`, `alteracao`,
   `responsavelId`, `responsavelNome`, `responsavelEmail`, `timestamp`, `operacaoId?`,
   `correlacao?`.
10. **Paginação:** cursor opaco, ordem `timestamp DESC`, 50 itens por padrão e 100 no
    máximo. Filtros: tipo, entidade, entidadeId, responsável, intervalo de datas.

## Alternativas

| Alternativa | Motivo do descarte |
|---|---|
| Subcoleção `historico` por entidade | Facilita leitura por entidade, mas impede consultas globais por responsável/período e multiplica caminhos. |
| Histórico legível pelo cliente | Viola RF22; qualquer admin poderia adulterar ou apagar. |
| TTL de 1 ou 5 anos | A escola pode precisar de auditoria por prazo maior; sem requisito explícito, apagar é irreversível. |
| Logar apenas em Cloud Logging | Não é consultável pela aplicação nem preserva antes/depois de forma estruturada. |
| Histórico apenas para aulas | Não atenderia RF53 nem a auditoria de cadastros. |

## Consequências

**Ganhos**

- Auditoria completa e independente do estado atual dos cadastros.
- Consulta administrativa com filtros e paginação.
- Exclusão de cadastro não perde rastreabilidade.

**Custos e impactos**

- Crescimento contínuo da coleção; monitorar custo e tamanho.
- Índices IDX-04 a IDX-06.
- Nenhuma correção retroativa de histórico: erros geram novos registros.
- Dados pessoais no histórico exigem política de privacidade (NFR-02).

## Riscos

| ID | Risco | Mitigação |
|---|---|---|
| RISCO-09 | Crescimento e custo de armazenamento/consultas. | Paginação, índices seletivos, monitoramento; expurgo somente com ADR. |
| RISCO-10 | Histórico com dados sensíveis. | Registrar apenas o necessário; sem token, IP ou user-agent. |
| RISCO-11 | Admin tenta “corrigir” histórico. | Não há endpoint de update/delete; regras negam; revisão de código. |

## Aprovador

Arquiteto — decisão solicitada pelo Agente Back-End em 03/11/2026. Ratificação do
responsável humano recomendada antes do deploy.
