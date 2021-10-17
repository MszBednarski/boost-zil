export const reservedWords = [
  "builtin",
  "fun",
  "tfun",
  "let",
  "in",
  "match",
  "with",
  "end",
  "contract",
  "send",
  "log",
  "import",
  "as",
  "if",
  "then",
  "else",
  "type",
  "library",
  "scilla_version",
  "with",
  "transition",
  "procedure",
  "accept",
  "field",
  "of",
];

export const singleCharacterSymbols = [
  "(",
  ")",
  "@",
  "&",
  "=",
  ":",
  "|",
  ";",
  "{",
  "}",
  ",",
];
export const multiCharacterSymbols = ["=>", "->", "<-", ":=", "*)", "(*"];


export const allWords = multiCharacterSymbols
  .concat(singleCharacterSymbols)
  .concat(reservedWords);

export function isGlobalLiteral(s: string) {
  return allWords.includes(s);
}
