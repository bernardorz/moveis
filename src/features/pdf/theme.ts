import path from "node:path";
import { Font } from "@react-pdf/renderer";

// Tokens do Design System (globals.css) em valores literais: o react-pdf não lê CSS.
export const pdfColors = {
  navy900: "#101830",
  navy600: "#3D4A6E",
  navy500: "#5A6688",
  navy200: "#DCE0EA",
  navy100: "#EEF0F5",
  navy50: "#F6F7FA",
  white: "#FFFFFF",
  danger: "#B91C1C",
  dangerBg: "#FEF2F2",
};

const fontPath = (weight: number) =>
  path.join(process.cwd(), `src/features/pdf/fonts/poppins-latin-${weight}-normal.woff`);

Font.register({
  family: "Poppins",
  fonts: [400, 500, 600].map((fontWeight) => ({ src: fontPath(fontWeight), fontWeight })),
});

// O hifenizador padrão é para inglês e quebraria palavras em português no lugar errado.
Font.registerHyphenationCallback((word) => [word]);
