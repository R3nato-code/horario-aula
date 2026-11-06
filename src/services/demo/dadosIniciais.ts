import type { DiaSemana, Modalidade, Papel, Usuario } from '@/types/dominio';

/**
 * Dados escolares extraídos do documento de arquitetura (seção 4).
 * Fonte: horários oficiais da manhã, 14 turmas, 6 aulas por dia.
 *
 * Formato de cada dia: "Disciplina|Professor; ..." (6 entradas).
 */
export interface TurmaInicial {
  id: string;
  nome: string;
  serie: string;
  modalidade: Modalidade;
  /** Segunda, terça, quarta, quinta e sexta-feira. */
  dias: readonly [string, string, string, string, string];
}

export const TURMAS_INICIAIS: readonly TurmaInicial[] = [
  {
    id: 'turma-1a',
    nome: '1º A',
    serie: '1º ano',
    modalidade: 'ensino-medio',
    dias: [
      'Matemática|Edson Gaspar; Biologia|Fabio L. R.; História (conteúdo complementar)|Angela C. H. B.; Educação Física|Laertes J. O. J.; Química|Andressa H. S.; História (conteúdo complementar)|Angela C. H. B.',
      'Geografia|Paulo C. Paes; Geografia (conteúdo complementar)|Paulo C. Paes; Arte|Marcelo A. Luz; Língua Portuguesa|Ana Maria C.; Química|Andressa H. S.; Língua Portuguesa|Ana Maria C.',
      'Arte|Marcelo A. Luz; Geografia (conteúdo complementar)|Paulo C. Paes; Arte (conteúdo complementar)|Marrie A. Cailleaux; Educação Financeira|Fabieli C. M. M.; Geografia|Paulo C. Paes; Educação Financeira|Fabieli C. M. M.',
      'Educação Física|Laertes J. O. J.; Língua Portuguesa|Ana Maria C.; Arte (conteúdo complementar)|Marrie A. Cailleaux; Matemática|Edson Gaspar; Língua Inglesa|Adriele S.; Educação Digital|Josiane Taborda A.',
      'Matemática|Edson Gaspar; Língua Inglesa|Adriele S.; Educação Digital|Josiane Taborda A.; Língua Portuguesa|Ana Maria C.; Matemática|Edson Gaspar; Biologia|Fabio L. R.',
    ],
  },
  {
    id: 'turma-1b',
    nome: '1º B',
    serie: '1º ano',
    modalidade: 'ensino-medio',
    dias: [
      'Biologia|Fabio L. R.; Matemática|Edson Gaspar; Educação Física|Laertes J. O. J.; Biologia|Fabio L. R.; Língua Portuguesa|Luciane R. S.; Língua Portuguesa|Luciane R. S.',
      'Arte|Irene Banaczek; Arte|Irene Banaczek; Geografia (conteúdo complementar)|Paulo C. Paes; Educação Financeira|Fabieli C. M. M.; Geografia|Paulo C. Paes; Educação Financeira|Fabieli C. M. M.',
      'Matemática|Edson Gaspar; Língua Inglesa|Luis Otavio. R. C.; Língua Inglesa|Luis Otavio. R. C.; História (conteúdo complementar)|Angela C. H. B.; Matemática|Edson Gaspar; História (conteúdo complementar)|Angela C. H. B.',
      'Arte (conteúdo complementar)|Marrie A. Cailleaux; Matemática|Edson Gaspar; Educação Física|Laertes J. O. J.; Arte (conteúdo complementar)|Marrie A. Cailleaux; Educação Digital|Daniele P. Silva; Educação Digital|Daniele P. Silva.',
      'Química|Andressa H. S.; Geografia (conteúdo complementar)|Paulo C. Paes; Química|Andressa H. S.; Geografia|Paulo C. Paes; Língua Portuguesa|Luciane R. S.; Língua Portuguesa|Luciane R. S.',
    ],
  },
  {
    id: 'turma-1c',
    nome: '1º C',
    serie: '1º ano',
    modalidade: 'ensino-medio',
    dias: [
      'Química (conteúdo técnico, provisório)|Andressa H. S.; Língua Portuguesa|Alana Marceli Machado; Biologia|Fabio L. R.; Química (conteúdo técnico, provisório)|Andressa H. S.; Biologia e Sustentabilidade|Fabio L. R.; Educação Digital|Daniele P. Silva.',
      'Química|Andressa H. S.; Língua Portuguesa|Alana Marceli Machado; Educação Digital|Daniele P. Silva; Biologia e Sustentabilidade|Fabio L. R.; Língua Portuguesa|Alana Marceli Machado; Biologia|Fabio L. R.',
      'Língua Portuguesa|Alana Marceli Machado; Matemática|Edson Gaspar; Arte|Marcelo A. Luz; Geografia|Paulo C. Paes; Língua Inglesa|Luis Otavio. R. C.; Língua Inglesa|Luis Otavio. R. C.',
      'Matemática|Edson Gaspar; Educação Física|Laertes J. O. J.; Educação Financeira|Fabieli C. M. M.; Educação Financeira|Fabieli C. M. M.; Matemática (recomposição/complementação, provisório)|Sonny O. Carneiro; Matemática (recomposição/complementação, provisório)|Sonny O. Carneiro.',
      'Educação Física|Laertes J. O. J.; Matemática|Edson Gaspar; Geografia|Paulo C. Paes; Matemática|Edson Gaspar; Química|Andressa H. S.; Arte|Marcelo A. Luz.',
    ],
  },
  {
    id: 'turma-2a',
    nome: '2º A',
    serie: '2º ano',
    modalidade: 'ensino-medio',
    dias: [
      'Arte|Irene Banaczek; Arte|Irene Banaczek; Língua Portuguesa|Alana Marceli Machado; Matemática|Adnilson R. M.; Língua Portuguesa|Alana Marceli Machado; Matemática|Adnilson R. M.',
      'Língua Portuguesa|Alana Marceli Machado; Filosofia|Ronaldo M. L. P.; Literatura e Produção de Texto|Ana Maria C.; Física|Guilherme A. Neves; Filosofia (conteúdo complementar, provisório)|Ronaldo M. L. P.; Física|Guilherme A. Neves.',
      'Educação Financeira|Fabieli C. M. M.; História|Jovana Carraro; Educação Financeira|Fabieli C. M. M.; Língua Inglesa|Adriele S.; Filosofia|Ronaldo M. L. P.; Língua Portuguesa|Alana Marceli Machado.',
      'Literatura e Produção de Texto|Ana Maria C.; Matemática|Adnilson R. M.; Filosofia (conteúdo complementar, provisório)|Ronaldo M. L. P.; Educação Física|Laertes J. O. J.; Sociologia|Priscila S. Silva; Matemática|Adnilson R. M.',
      'História|Jovana Carraro; Sociologia (conteúdo complementar, provisório)|Priscila S. Silva; Educação Física|Laertes J. O. J.; Sociologia|Priscila S. Silva; Língua Inglesa|Adriele S.; Sociologia (conteúdo complementar, provisório)|Priscila S. Silva.',
    ],
  },
  {
    id: 'turma-2b',
    nome: '2º B',
    serie: '2º ano',
    modalidade: 'ensino-medio',
    dias: [
      'Matemática|Adnilson R. M.; Educação Física|Laertes J. O. J.; Física|Guilherme A. Neves; Língua Portuguesa|Irene Banaczek; Língua Portuguesa|Irene Banaczek; Sociologia (conteúdo complementar, provisório)|Priscila S. Silva.',
      'Matemática|Adnilson R. M.; Educação Física|Laertes J. O. J.; Matemática|Adnilson R. M.; Língua Portuguesa|Irene Banaczek; Língua Portuguesa|Irene Banaczek; Sociologia|Priscila S. Silva.',
      'Filosofia|Ronaldo M. L. P.; Arte|Marcelo A. Luz; Língua Inglesa|Adriele S.; Filosofia|Ronaldo M. L. P.; Arte|Marcelo A. Luz; Física|Guilherme A. Neves.',
      'História|Jovana Carraro; Filosofia (conteúdo complementar, provisório)|Geane C. Wiltemburg; Filosofia (conteúdo complementar, provisório)|Geane C. Wiltemburg; Matemática|Adnilson R. M.; Literatura e Produção de Texto|Maria do Carmo; Literatura e Produção de Texto|Maria do Carmo.',
      'Sociologia (conteúdo complementar, provisório)|Priscila S. Silva; História|Jovana Carraro; Sociologia|Priscila S. Silva; Língua Inglesa|Adriele S.; Educação Financeira|Fabieli C. M. M.; Educação Financeira|Fabieli C. M. M.',
    ],
  },
  {
    id: 'turma-2c',
    nome: '2º C',
    serie: '2º ano',
    modalidade: 'ensino-medio',
    dias: [
      'Língua Portuguesa|Alana Marceli Machado; Física (conteúdo técnico/complementar, provisório)|Cleiton de Matos; Física (conteúdo técnico/complementar, provisório)|Cleiton de Matos; Língua Portuguesa|Alana Marceli Machado; Matemática|Adnilson R. M.; Física|Guilherme A. Neves.',
      'Sociologia|Priscila S. Silva; Matemática|Adnilson R. M.; Língua Portuguesa|Alana Marceli Machado; Língua Portuguesa|Alana Marceli Machado; Programação|Daniele P. Silva; Programação|Daniele P. Silva.',
      'História|Jovana Carraro; Física|Guilherme A. Neves; Educação Física|Laertes J. O. J.; Arte|Marcelo A. Luz; Língua Inglesa|Adriele S.; Arte|Marcelo A. Luz.',
      'Educação Financeira|Fabieli C. M. M.; História|Jovana Carraro; Matemática|Adnilson R. M.; Filosofia|Ronaldo M. L. P.; Matemática|Adnilson R. M.; Sociologia|Priscila S. Silva.',
      'Língua Inglesa|Adriele S.; Educação Financeira|Fabieli C. M. M.; Filosofia|Ronaldo M. L. P.; Educação Física|Laertes J. O. J.; Robótica e Tecnologia (provisório)|Marcio Hilgemberg. A.; Robótica e Tecnologia (provisório)|Marcio Hilgemberg. A.',
    ],
  },
  {
    id: 'turma-3a',
    nome: '3º A',
    serie: '3º ano',
    modalidade: 'ensino-medio',
    dias: [
      'História (componente 1, provisório)|Angela C. H. B.; Física|Guilherme A. Neves; Recomposição de Aprendizagem em Língua Portuguesa|Carolina C. M. B.; Física|Guilherme A. Neves; História (componente 1, provisório)|Angela C. H. B.; Educação Financeira|Fabieli C. M. M.',
      'Educação Física|Laertes J. O. J.; Língua Inglesa (componente 1, provisório)|Kellis C. Farias; Matemática|Luiz F. Schmidt; Língua Inglesa (componente 1, provisório)|Kellis C. Farias; Educação Financeira|Fabieli C. M. M.; Recomposição de Aprendizagem em Língua Portuguesa|Carolina C. M. B.',
      'Geografia (componente 1, provisório)|Paulo C. Paes; Educação Física|Laertes J. O. J.; Matemática|Luiz F. Schmidt; Língua Portuguesa|Ana Maria C.; Arte (componente 2, provisório)|Marrie A. Cailleaux; Matemática (recomposição/complementação, provisório)|Sonny O. Carneiro.',
      'Sociologia (componente 1, provisório)|Priscila S. Silva; Matemática|Luiz F. Schmidt; Sociologia (componente 1, provisório)|Priscila S. Silva; Língua Portuguesa|Ana Maria C.; Matemática|Luiz F. Schmidt; Arte (componente 2, provisório)|Marrie A. Cailleaux.',
      'Língua Portuguesa|Ana Maria C.; Projeto de Vida|Ronaldo M. L. P.; Língua Portuguesa|Ana Maria C.; Matemática (recomposição/complementação, provisório)|Sonny O. Carneiro; Geografia (componente 1, provisório)|Paulo C. Paes; Língua Inglesa (componente 1, provisório)|Kellis C. Farias.',
    ],
  },
  {
    id: 'turma-3b',
    nome: '3º B',
    serie: '3º ano',
    modalidade: 'ensino-medio',
    dias: [
      'Educação Física|Laertes J. O. J.; História (componente 1, provisório)|Angela C. H. B.; Matemática|Luiz F. Schmidt; História (componente 1, provisório)|Angela C. H. B.; Matemática|Luiz F. Schmidt; Recomposição de Aprendizagem em Língua Portuguesa|Carolina C. M. B.',
      'Língua Inglesa (componente 1, provisório)|Kellis C. Farias; Sociologia (componente 1, provisório)|Priscila S. Silva; Física|Guilherme A. Neves; Geografia (componente 1, provisório)|Paulo C. Paes; Matemática|Luiz F. Schmidt; Língua Inglesa (componente 1, provisório)|Kellis C. Farias.',
      'Educação Física|Laertes J. O. J.; Matemática|Luiz F. Schmidt; Recomposição de Aprendizagem em Língua Portuguesa|Carolina C. M. B.; Física|Guilherme A. Neves; Língua Portuguesa|Ana Maria C.; Arte (componente 2, provisório)|Marrie A. Cailleaux.',
      'Projeto de Vida|Ronaldo M. L. P.; Matemática (recomposição/complementação, provisório)|Sonny O. Carneiro; Matemática (recomposição/complementação, provisório)|Sonny O. Carneiro; Sociologia (componente 1, provisório)|Priscila S. Silva; Arte (componente 2, provisório)|Marrie A. Cailleaux; Língua Portuguesa|Ana Maria C.',
      'Geografia (componente 1, provisório)|Paulo C. Paes; Língua Portuguesa|Ana Maria C.; Educação Financeira|Fabieli C. M. M.; Educação Financeira|Fabieli C. M. M.; Língua Inglesa (componente 1, provisório)|Kellis C. Farias; Língua Portuguesa|Ana Maria C.',
    ],
  },
  {
    id: 'turma-3c',
    nome: '3º C',
    serie: '3º ano',
    modalidade: 'ensino-medio',
    dias: [
      'Educação Financeira|Fabieli C. M. M.; Educação Física|Fabiano Ogg; Educação Física|Fabiano Ogg; Matemática|Luiz F. Schmidt; Educação Financeira|Fabieli C. M. M.; Biologia (componente 2, provisório)|Fabio L. R.',
      'Matemática|Luiz F. Schmidt; Física (componente 3, provisório)|Guilherme A. Neves; Biologia (componente 2, provisório)|Fabio L. R.; Química (componente 1, provisório)|Andressa H. S.; Biologia (componente 2, provisório)|Fabio L. R.; Matemática|Luiz F. Schmidt.',
      'Física|Guilherme A. Neves; Língua Portuguesa|Ana Maria C.; Física|Guilherme A. Neves; Recomposição de Aprendizagem em Língua Portuguesa|Carolina C. M. B.; Física (componente 3, provisório)|Guilherme A. Neves; Língua Portuguesa|Ana Maria C.',
      'Física (componente 2, provisório)|André Almeida; Física (componente 2, provisório)|André Almeida; Língua Portuguesa|Ana Maria C.; Matemática (recomposição/complementação, provisório)|Sonny O. Carneiro; Língua Portuguesa|Ana Maria C.; Matemática|Luiz F. Schmidt.',
      'Projeto de Vida|Ronaldo M. L. P.; Matemática (componente 2, provisório)|Sonny O. Carneiro; Matemática (componente 2, provisório)|Sonny O. Carneiro; Química (componente 1, provisório)|Andressa H. S.; Recomposição de Aprendizagem em Língua Portuguesa|Carolina C. M. B.; Matemática (recomposição/complementação, provisório)|Sonny O. Carneiro.',
    ],
  },
  {
    id: 'turma-2dsb',
    nome: '2º DSB',
    serie: '2º ano',
    modalidade: 'tecnico',
    dias: [
      'Língua Portuguesa|Carolina C. M. B.; Educação Financeira|Fabieli C. M. M.; Banco de Dados II|Patrick O. R. S.; Sociologia|Priscila S. Silva; Programação Back-End|Patrick O. R. S.; Programação Back-End|Patrick O. R. S.',
      'Filosofia|Ronaldo M. L. P.; Física|Eleandro A. de Matos; Língua Portuguesa|Carolina C. M. B.; Física|Eleandro A. de Matos; Língua Portuguesa|Carolina C. M. B.; Banco de Dados II|Patrick O. R. S.',
      'Programação Back-End|Patrick O. R. S.; Língua Inglesa|Adriele S.; Matemática|Inês V. N. Pinheiro; Matemática|Inês V. N. Pinheiro; Educação Física|Samuel Scheiffer; Banco de Dados II|Patrick O. R. S.',
      'Inovação e Tecnologia|Rosa C. Hoffmann; Filosofia|Ronaldo M. L. P.; Programação Front-End|Josiane Taborda A.; Programação Front-End|Josiane Taborda A.; Educação Física|Samuel Scheiffer; Língua Inglesa|Adriele S.',
      'Projeto de Vida|Ronaldo M. L. P.; Matemática (componente 2, provisório)|Sonny O. Carneiro; Matemática (componente 2, provisório)|Sonny O. Carneiro; História|Hélcio J. Lourenço; História|Hélcio J. Lourenço; Programação Front-End|Josiane Taborda A.',
    ],
  },
  {
    id: 'turma-3dsb',
    nome: '3º DSB',
    serie: '3º ano',
    modalidade: 'tecnico',
    dias: [
      'Programação Back-End|Patrick O. R. S.; Programação Back-End|Patrick O. R. S.; Educação Financeira|Fabieli C. M. M.; Língua Portuguesa|Carolina C. M. B.; Computação Gráfica|Marcio Hilgemberg. A.; Computação Gráfica|Marcio Hilgemberg. A.',
      'Física|Eleandro A. de Matos; Língua Portuguesa|Carolina C. M. B.; Programação de Sistemas|Patrick O. R. S.; Programação de Sistemas|Patrick O. R. S.; Ciência de Dados|Cesar M. Chauchuty; Ciência de Dados|Cesar M. Chauchuty.',
      'Matemática|Inês V. N. Pinheiro; Programação Back-End|Patrick O. R. S.; Atividades de Projeto|Paulo H. J.; Educação Física|Samuel Scheiffer; Matemática|Inês V. N. Pinheiro; Língua Portuguesa|Carolina C. M. B.',
      'Matemática|Inês V. N. Pinheiro; Programação para Dispositivos Móveis|Cesar M. Chauchuty; Programação para Dispositivos Móveis|Cesar M. Chauchuty; Matemática|Inês V. N. Pinheiro; Atividades de Projeto|Paulo H. J.; Atividades de Projeto|Paulo H. J.',
      'Programação Back-End|Patrick O. R. S.; Língua Portuguesa|Carolina C. M. B.; Banco de Dados|Marcio Hilgemberg. A.; Banco de Dados|Marcio Hilgemberg. A.; Programação de Sistemas|Patrick O. R. S.; Programação de Sistemas|Patrick O. R. S.',
    ],
  },
  {
    id: 'turma-3dsc',
    nome: '3º DSC',
    serie: '3º ano',
    modalidade: 'tecnico',
    dias: [
      'Matemática|Luiz F. Schmidt; Programação para Dispositivos Móveis|Cesar M. Chauchuty; Programação para Dispositivos Móveis|Cesar M. Chauchuty; Programação de Sistemas|Patrick O. R. S.; Língua Portuguesa|Carolina C. M. B.; Matemática|Luiz F. Schmidt.',
      'Educação Financeira|Fabieli C. M. M.; Matemática|Luiz F. Schmidt; Física|Eleandro A. de Matos; Língua Portuguesa|Carolina C. M. B.; Computação Gráfica|Marcio Hilgemberg. A.; Computação Gráfica|Marcio Hilgemberg. A.',
      'Matemática|Luiz F. Schmidt; Língua Portuguesa|Carolina C. M. B.; Programação Back-End|Patrick O. R. S.; Banco de Dados|Paulo H. J.; Banco de Dados|Paulo H. J.; Atividades de Projeto|Paulo H. J.',
      'Atividades de Projeto|Paulo H. J.; Atividades de Projeto|Paulo H. J.; Educação Física|Samuel Scheiffer; Programação Back-End|Patrick O. R. S.; Programação Back-End|Patrick O. R. S.; Programação Back-End|Patrick O. R. S.',
      'Língua Portuguesa|Carolina C. M. B.; Programação de Sistemas|Patrick O. R. S.; Programação de Sistemas|Patrick O. R. S.; Programação de Sistemas|Patrick O. R. S.; Ciência de Dados|Cesar M. Chauchuty; Ciência de Dados|Cesar M. Chauchuty.',
    ],
  },
  {
    id: 'turma-2adm',
    nome: '2º ADM',
    serie: '2º ano',
    modalidade: 'tecnico',
    dias: [
      'Liderança e Organização|Jean C. L.; Liderança e Organização|Jean C. L.; Recursos Humanos|Graziella R. V. Palhano; Recursos Humanos|Graziella R. V. Palhano; Sociologia|Priscila S. Silva; Comunicação e Vendas|Graziella R. V. Palhano.',
      'Língua Portuguesa|Carolina C. M. B.; Empreendedorismo e Marketing|Jean C. L.; Empreendedorismo e Marketing|Jean C. L.; Filosofia|Ronaldo M. L. P.; Física|Eleandro A. de Matos; Física|Eleandro A. de Matos.',
      'Língua Portuguesa|Carolina C. M. B.; Filosofia|Ronaldo M. L. P.; Educação Física|Samuel Scheiffer; Formação Empreendedora|Jean C. L.; Formação Empreendedora|Jean C. L.; Projeto Econômico|Graziella R. V. Palhano.',
      'Educação Física|Samuel Scheiffer; Sociologia|Priscila S. Silva; Matemática|Inês V. N. Pinheiro; Língua Inglesa|Adriele S.; Matemática|Inês V. N. Pinheiro; Educação Financeira|Fabieli C. M. M.',
      'História|Hélcio J. Lourenço; Tecnologia e Inovação|Josiane Taborda A.; Língua Inglesa|Adriele S.; Inovação e Empreendedorismo|Josiane Taborda A.; História|Hélcio J. Lourenço; Língua Portuguesa|Carolina C. M. B.',
    ],
  },
  {
    id: 'turma-3adm',
    nome: '3º ADM',
    serie: '3º ano',
    modalidade: 'tecnico',
    dias: [
      'Física|Guilherme A. Neves; Língua Portuguesa|Carolina C. M. B.; Tecnologia e Formação Gerencial|Jean C. L.; Tecnologia e Formação Gerencial|Jean C. L.; Administração Financeira|Suellen Carneiro Machado; Administração Financeira|Suellen Carneiro Machado.',
      'Física|Guilherme A. Neves; Negócios e Direito|Barbara C. Kruse; Negócios e Direito|Barbara C. Kruse; Negociação e Vendas|Jean C. L.; Negociação e Vendas|Jean C. L.; Liderança e Gestão|Jean C. L.',
      'Liderança e Gestão|Jean C. L.; Liderança e Gestão|Jean C. L.; Liderança e Gestão|Jean C. L.; Matemática|Luiz F. Schmidt; Língua Portuguesa|Carolina C. M. B.; Matemática|Luiz F. Schmidt.',
      'Matemática|Luiz F. Schmidt; Educação Física|Samuel Scheiffer; Matemática|Luiz F. Schmidt; Educação Física|Samuel Scheiffer; Contabilidade Financeira|Suellen Carneiro Machado; Contabilidade Financeira|Suellen Carneiro Machado.',
      'Educação Financeira|Fabieli C. M. M.; Projeto de Vida|Andressa H. S.; Língua Portuguesa|Carolina C. M. B.; Língua Portuguesa|Carolina C. M. B.; Recursos Humanos|Graziella R. V. Palhano; Recursos Humanos|Graziella R. V. Palhano.',
    ],
  },
];

export const USUARIOS_DEMO: readonly Usuario[] = [
  {
    uid: 'demo-gestor',
    email: 'gestor@demonstracao.local',
    nome: 'Direção — Demonstração',
    papel: 'gestor',
  },
  {
    uid: 'demo-admin',
    email: 'admin@demonstracao.local',
    nome: 'Secretaria — Demonstração',
    papel: 'admin',
  },
  {
    uid: 'demo-professor',
    email: 'professor@demonstracao.local',
    nome: 'Docente — Demonstração',
    papel: 'professor',
  },
  {
    uid: 'demo-aluno',
    email: 'aluno@demonstracao.local',
    nome: 'Estudante — Demonstração',
    papel: 'aluno',
  },
];

export const PAPEIS_DEMONSTRACAO: readonly Papel[] = ['aluno', 'professor', 'admin', 'gestor'];

export const FAVORITOS_INICIAIS: readonly { uid: string; turmaId: string }[] = [
  { uid: 'demo-aluno', turmaId: 'turma-2dsb' },
];

export const DIAS_DEMONSTRACAO: readonly DiaSemana[] = [1, 2, 3, 4, 5];
