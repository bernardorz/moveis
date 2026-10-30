import type { ContratoClausula } from "@/db/schema";

/** Cláusulas padrão do contrato. São copiadas para cada contrato e podem ser editadas nele. */
export const CLAUSULAS_PADRAO: ContratoClausula[] = [
  {
    titulo: "Objeto",
    texto:
      "Fabricação e instalação dos móveis planejados descritos no resumo deste contrato, conforme o orçamento aprovado pelo CONTRATANTE.",
  },
  {
    titulo: "Medidas e projeto",
    texto:
      "As medidas são confirmadas por medição técnica no local antes do início da produção. Alterações de projeto após a confirmação podem alterar valor e prazo.",
  },
  {
    titulo: "Prazo de entrega",
    texto:
      "O prazo de entrega é contado em dias úteis a partir da assinatura deste contrato e da confirmação das medidas, podendo ser prorrogado por motivo de força maior ou atraso na liberação do local.",
  },
  {
    titulo: "Pagamento",
    texto:
      "O pagamento será realizado conforme a forma e as condições indicadas neste contrato. Parcelas pagas em cheque são consideradas quitadas após a compensação.",
  },
  {
    titulo: "Garantia",
    texto:
      "A CONTRATADA oferece garantia de 5 (cinco) anos contra defeitos de fabricação, excluídos danos por mau uso, umidade excessiva ou intervenção de terceiros.",
  },
  {
    titulo: "Itens não inclusos",
    texto:
      "Não estão inclusos eletrodomésticos, cubas, metais, pedras não especificadas e serviços de alvenaria, elétrica ou hidráulica.",
  },
  {
    titulo: "Rescisão",
    texto:
      "Em caso de rescisão após o início da produção, os valores correspondentes aos materiais adquiridos e aos serviços executados não serão restituídos.",
  },
];
