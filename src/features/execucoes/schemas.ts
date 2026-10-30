import { z } from "zod";

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.").nullable();

export const agendaSchema = z
  .object({ producaoInicio: data, producaoFim: data, previsaoEntrega: data })
  .superRefine((a, ctx) => {
    if (a.producaoInicio && !a.producaoFim) ctx.addIssue({ code: "custom", path: ["producaoFim"], message: "Informe também o fim." });
    if (a.producaoFim && !a.producaoInicio) ctx.addIssue({ code: "custom", path: ["producaoInicio"], message: "Informe também o início." });
    if (a.producaoInicio && a.producaoFim && a.producaoFim < a.producaoInicio) {
      ctx.addIssue({ code: "custom", path: ["producaoFim"], message: "O fim não pode ser antes do início." });
    }
  });
