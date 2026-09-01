// Gera o PDF do Contrato de Concessão de Direito de Uso de Marca e Parceria Comercial
// a partir dos dados da venda. Espelha docs/contratos/contrato-concessao-marca-template.md.
// pdfmake client-side.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import pdfMake from 'pdfmake/build/pdfmake'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as pdfFonts from 'pdfmake/build/vfs_fonts'

// vfs shim (a chave muda entre versões do pdfmake)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs ?? (pdfFonts as any).vfs ?? (pdfFonts as any).default?.vfs

export interface ContractData {
  matriz_endereco: string
  matriz_cidade: string
  unidade_nome: string
  cidade: string
  uf: string
  raio?: string | null
  municipios?: string | null
  responsavel_nome: string
  responsavel_cpf: string
  responsavel_rg?: string | null
  responsavel_email: string
  responsavel_telefone: string
  valor_adesao: string
  forma_pagamento: string
  plano_pagamento: string
  data_contrato: string
}

function clause(n: number, title: string, body: string) {
  return [
    { text: `Cláusula ${n} — ${title}`, style: 'h2', margin: [0, 10, 0, 4] },
    { text: body, style: 'p' },
  ]
}

export function buildContractDoc(d: ContractData) {
  const territorio = [
    `O REPRESENTANTE atuará na cidade de ${d.cidade}/${d.uf}`,
    d.raio ? `, com área de abrangência de até ${d.raio} km` : '',
    d.municipios ? `, atendendo os municípios de: ${d.municipios}` : '',
    '. A exclusividade territorial, quando aplicável, limita-se à área aqui definida.',
  ].join('')

  const rg = d.responsavel_rg ? `, RG nº ${d.responsavel_rg}` : ''

  return {
    pageMargins: [50, 55, 50, 55] as [number, number, number, number],
    info: { title: 'Contrato de Concessão de Uso de Marca e Parceria Comercial' },
    content: [
      { text: 'CONTRATO DE CONCESSÃO DE DIREITO DE USO DE MARCA E PARCERIA COMERCIAL', style: 'h1' },
      { text: 'Pelo presente instrumento particular, as partes abaixo qualificadas celebram o presente Contrato de Concessão de Direito de Uso de Marca e Parceria Comercial, que se regerá pelas cláusulas seguintes.', style: 'p', margin: [0, 8, 0, 4] },

      ...clause(1, 'Das Partes',
        `CONCEDENTE: INJEDIESEL PEÇAS E SERVIÇOS LTDA - ME, CNPJ nº 15.154.660/0001-02, Inscrição Estadual nº 90588183-37, Inscrição Municipal nº 813900-0, com sede em ${d.matriz_endereco}, e-mail contato@injediesel.com, doravante CONCEDENTE (marca INJEDIESEL POWER CHIP).\n\nREPRESENTANTE: ${d.unidade_nome}, representada por ${d.responsavel_nome}, CPF nº ${d.responsavel_cpf}${rg}, e-mail ${d.responsavel_email}, telefone ${d.responsavel_telefone}, doravante REPRESENTANTE (Parceiro Injediesel).`),

      ...clause(2, 'Da Natureza do Contrato',
        'Este contrato tem natureza de concessão de direito de uso de marca e parceria comercial, não gerando vínculo societário, empregatício ou de rede de negócios com remuneração periódica fixa. Não há cobrança de royalties, mensalidade ou qualquer taxa periódica da CONCEDENTE sobre o REPRESENTANTE. A relação comercial recorrente se dá exclusivamente pela prestação de serviços descrita na Cláusula 5.'),

      ...clause(3, 'Do Objeto',
        'O objeto é a concessão, pela CONCEDENTE ao REPRESENTANTE, do direito de uso da marca INJEDIESEL para atuar como Parceiro/Representante na prestação de serviços de remapeamento de ECU. O REPRESENTANTE fica autorizado a usar a marca INJEDIESEL em meios físicos e online — fachada, papelaria, redes sociais e materiais de divulgação — dentro das regras da Cláusula 13.'),

      ...clause(4, 'Do Território', territorio),

      ...clause(5, 'Da Contraprestação e do Modelo de Cobrança',
        'Não há mensalidade nem royalties. A relação comercial recorrente se dá por arquivo/mapa de ECU processado: para cada arquivo enviado pelo REPRESENTANTE e processado pela CONCEDENTE, incide o valor unitário por mapa conforme a tabela vigente da CONCEDENTE, que pode ser atualizada com comunicação prévia. Este é o único fluxo de remuneração da CONCEDENTE decorrente da operação.'),

      ...clause(6, 'Do Software INJE.TECH e do Benefício de Uso Gratuito',
        'O sistema INJE.TECH (gestão empresarial + processamento de arquivos de ECU) é de uso exclusivo dos REPRESENTANTES com contrato ativo e adimplentes. Durante a vigência, o uso é gratuito, constituindo benefício concedido pela CONCEDENTE. O valor de referência de mercado é de R$ 150,00 por mês, do qual o REPRESENTANTE fica isento enquanto durar o contrato — economia de, por exemplo, R$ 1.800,00 em 12 meses. Encerrado, revogado ou suspenso o contrato, cessa imediatamente o acesso ao sistema.'),

      ...clause(7, 'Do Valor de Adesão',
        `Pela concessão do direito de uso da marca e ingresso na rede de Representantes, o REPRESENTANTE pagará à CONCEDENTE o valor de adesão de R$ ${d.valor_adesao}, na forma de pagamento ${d.forma_pagamento}, conforme o plano ${d.plano_pagamento}. As condições, datas e parcelas seguem o acordado na contratação e ficam registradas no sistema da CONCEDENTE.`),

      ...clause(8, 'Do SLA de Atendimento',
        'A CONCEDENTE compromete-se a iniciar o acerto dos arquivos de ECU enviados pelo REPRESENTANTE em até 24 (vinte e quatro) horas corridas do recebimento, ressalvados casos de força maior e indisponibilidade técnica comunicados.'),

      ...clause(9, 'Das Responsabilidades do Representante',
        'O REPRESENTANTE é responsável por: (a) atendimento local ao cliente final; (b) coleta e envio dos arquivos originais de ECU; (c) gestão financeira e cobrança junto ao seu cliente final; (d) conformidade com a LGPD no atendimento presencial; (e) guarda dos documentos; (f) uso adequado da marca conforme a Cláusula 13.'),

      ...clause(10, 'Das Responsabilidades da Concedente',
        'A CONCEDENTE é responsável por: (a) processamento técnico dos arquivos de ECU; (b) suporte; (c) disponibilidade da plataforma INJE.TECH; (d) treinamento inicial; (e) concessão e manutenção do direito de uso da marca.'),

      ...clause(11, 'Da Propriedade dos Clientes, dos Mapas e do Sistema (Direitos Intelectuais)',
        'O sistema INJE.TECH, a marca INJEDIESEL, os mapas e arquivos de ECU e a base de clientes atendida sob a marca INJEDIESEL são de titularidade e propriedade intelectual exclusiva da INJEDIESEL POWER CHIP. O REPRESENTANTE reconhece que os clientes e os dados a eles vinculados integram o patrimônio intelectual da CONCEDENTE. Em caso de revogação, rescisão ou encerramento, o REPRESENTANTE perde o acesso ao sistema e não detém qualquer direito sobre a base de clientes, os mapas ou o sistema, que permanecem com a CONCEDENTE.'),

      ...clause(12, 'Do Cancelamento',
        'O contrato pode ser cancelado por qualquer das partes, mediante comunicação por escrito com antecedência mínima de 30 (trinta) dias, condicionado à quitação de eventuais pendências financeiras. Encerrado o contrato, cessam o direito de uso da marca e o acesso ao sistema. O valor de adesão já pago não é restituível, salvo disposição em contrário.'),

      ...clause(13, 'Do Uso da Marca',
        'O direito de uso da marca INJEDIESEL é pessoal e intransferível, restrito ao escopo deste contrato. O REPRESENTANTE deve seguir as diretrizes de identidade visual da CONCEDENTE, sendo vedado o uso que prejudique a imagem da marca. Cessado o contrato, o REPRESENTANTE deve retirar a marca de fachada, papelaria, meios online e demais materiais no prazo de 30 (trinta) dias.'),

      ...clause(14, 'Do Bloqueio',
        'A CONCEDENTE poderá bloquear temporariamente o acesso do REPRESENTANTE à plataforma em caso de inadimplência ou quebra de conduta. O bloqueio é comunicado e permanece até a regularização.'),

      ...clause(15, 'Da Proteção de Dados (LGPD)',
        'As partes tratam os dados pessoais dos clientes finais em conformidade com a Lei nº 13.709/2018 (LGPD). O REPRESENTANTE atua como controlador dos dados coletados presencialmente e a CONCEDENTE como operadora no processamento técnico, sem prejuízo da titularidade prevista na Cláusula 11.'),

      ...clause(16, 'Do Foro',
        `Fica eleito o foro da comarca da sede da CONCEDENTE (${d.matriz_cidade}) para dirimir quaisquer questões oriundas deste contrato, com renúncia a qualquer outro.`),

      ...clause(17, 'Das Assinaturas',
        `As partes assinam eletronicamente. O REPRESENTANTE manifesta seu aceite por meio de link enviado ao e-mail ${d.responsavel_email}, com registro de data, hora, IP e hash do documento, conferindo autenticidade e integridade ao aceite.`),

      { text: `\n${d.cidade}/${d.uf}, ${d.data_contrato}.`, style: 'p', margin: [0, 14, 0, 10] },
      { text: 'CONCEDENTE: INJEDIESEL PEÇAS E SERVIÇOS LTDA - ME', style: 'p' },
      { text: `REPRESENTANTE: ${d.responsavel_nome} — ${d.unidade_nome}`, style: 'p' },
    ],
    styles: {
      h1: { fontSize: 13, bold: true, alignment: 'center' as const },
      h2: { fontSize: 10, bold: true },
      p:  { fontSize: 9, lineHeight: 1.25, alignment: 'justify' as const },
    },
    defaultStyle: { fontSize: 9 },
  }
}

export function generateContractPdfBlob(d: ContractData): Promise<Blob> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(pdfMake as any).createPdf(buildContractDoc(d)).getBlob((blob: Blob) => resolve(blob))
  })
}
