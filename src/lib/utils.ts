import { createCn } from "cn/config";

// cn configurado com os tokens do DS: sem isso, "text-body" (tamanho) e
// "text-navy-500" (cor) seriam tratados como o mesmo grupo e um deles sumiria.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "h1", "h2", "section", "h3", "body", "table", "caption", "overline", "micro"] },
      ],
      rounded: [{ rounded: ["field-sm", "field", "card", "section"] }],
      shadow: [{ shadow: ["modal", "popover", "focus", "field-focus"] }],
    },
  },
});
