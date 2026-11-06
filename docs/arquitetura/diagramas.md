# Diagramas

**Versão:** 1.0
**Data:** 03/11/2026

> Os diagramas de sequência dos fluxos `FL-01` (edição individual) e `FL-02` (edição em
> massa + notificação) estão em `docs/arquitetura/integracoes.md` para ficarem próximos
> dos contratos.

---

## 1. Contexto e fronteiras de confiança

```mermaid
graph LR
    subgraph Cliente["Fronteira do cliente (não confiável)"]
        UI[React + PWA]
    end

    subgraph Firebase["Fronteira confiável"]
        AUTH[Firebase Auth]
        CF[Cloud Functions]
        FS[(Firestore)]
        SM[Secret Manager]
    end

    GEM[Gemini API]

    UI -->|login| AUTH
    UI -->|leitura autorizada| FS
    UI -->|callable autenticada| CF
    CF -->|Admin SDK| FS
    CF -->|segredo| SM
    CF -->|somente leitura| GEM
```

---

## 2. Modelo de entidades

```mermaid
erDiagram
    users ||--o{ favoritos : "favorita"
    users ||--o{ notificacoes : "recebe"
    turmas ||--o{ aulas : "possui"
    turmas ||--o{ favoritos : "é favoritada"
    professores ||--o{ aulas : "leciona"
    disciplinas ||--o{ aulas : "é lecionada"
    configuracao ||--o{ aulas : "define o período"
    operacoes ||--o{ historico : "agrupa"
    operacoes ||--o{ outbox : "gera"
    operacoes ||--o{ notificacoes : "origina"

    users {
      string uid PK
      string email
      string displayName
      string role
    }
    professores {
      string id PK
      string nome
      string status
      timestamp criadoEm
      timestamp atualizadoEm
    }
    disciplinas {
      string id PK
      string nome
      string status
      timestamp criadoEm
      timestamp atualizadoEm
    }
    turmas {
      string id PK
      string nome
      string serie
      string modalidade
      string turno
      string status
      timestamp criadoEm
      timestamp atualizadoEm
    }
    aulas {
      string id PK "turmaId_dia_periodo"
      string turmaId FK
      int diaSemana
      int periodo
      string disciplinaId FK
      string professorId FK
      string salaId "reservado"
      timestamp criadoEm
      timestamp atualizadoEm
    }
    configuracao {
      string id PK "atual"
      string abertura
      string fechamento
      array periodos
      map intervalo
      timestamp atualizadoEm
      string atualizadoPor
    }
    historico {
      string id PK
      string tipo
      string entidade
      string entidadeId
      string entidadeNome
      string descricao
      map alteracao
      string responsavelId
      string responsavelNome
      string responsavelEmail
      timestamp timestamp
      string operacaoId
    }
    notificacoes {
      string id PK
      string uid FK
      string tipo
      array turmaIds
      string titulo
      string mensagem
      bool lida
      timestamp lidaEm
      timestamp criadoEm
      timestamp expiraEm
      string operacaoId
      map agrupamento
    }
    favoritos {
      string id PK "uid_turmaId"
      string uid FK
      string turmaId FK
      timestamp criadoEm
    }
    operacoes {
      string id PK "chaveIdempotencia"
      string tipo
      string status
      string hashPayload
      string solicitanteId
      int totalAulas
      map resultado
      timestamp criadoEm
      timestamp concluidoEm
    }
    outbox {
      string id PK
      string tipo
      string operacaoId FK
      array turmaIds
      int totalAulas
      string status
      int tentativas
      timestamp criadoEm
      timestamp expiraEm
    }
```

---

## 3. Ciclo de vida de cadastro

```mermaid
stateDiagram-v2
    [*] --> ativo: criar
    ativo --> arquivado: arquivar (sem aulas)
    arquivado --> ativo: reativar
    arquivado --> excluido: excluir (sem aulas)
    excluido --> [*]
    note right of excluido
      Documento removido;
      histórico preserva o snapshot.
    end note
```

---

## 4. Ciclo de vida da aula

```mermaid
stateDiagram-v2
    [*] --> livre: slot sem documento
    livre --> ocupada: salvarAula
    ocupada --> ocupada: salvarAula (edição)
    ocupada --> livre: removerAula
    note right of ocupada
      ID = turmaId_diaSemana_periodo.
      Horários derivados da configuração.
    end note
```

---

## 5. Fluxo de configuração de horários

```mermaid
flowchart TD
    A[Admin edita abertura, períodos e intervalo] --> B[Validar coerência no servidor]
    B -->|inválida| C[invalid-argument / failed-precondition]
    B -->|válida| D{Removeu ou renumerou período em uso?}
    D -->|sim| E[failed-precondition: remanejar aulas]
    D -->|não| F[Transação: configuracao/atual + histórico]
    F --> G[Aulas passam a exibir novos horários derivados]
```
