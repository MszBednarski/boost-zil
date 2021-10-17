type Syntax =
  | "transition"
  | "procedure"
  | "match"
  | "end"
  | "contract"
  | "other";

const keywords = ["transition", "procedure", "match", "end", "contract"];

const flow = new RegExp(/\s|\r|\n/g);

export interface Labeled {
  s: Syntax;
  w: string;
}

function labelWords(words: string[]): Labeled[] {
  return words.map((w) => {
    if (keywords.includes(w)) {
      return { s: w, w } as Labeled;
    }
    return { s: "other", w };
  });
}

export function wrapTokens(code: string, tokens: string[]) {
  tokens.sort((a, b) => b.length - a.length);
  const longestToken = tokens[0].length;
  const subIterate = longestToken - 1;
  for (let i = 0; i < code.length - subIterate; i++) {
    for (const token of tokens) {
      const start = i;
      const jump = token.length + 1;
      const end = i + token.length;
      const chars = code.substring(start, end);
      if (chars == token) {
        code =
          code.slice(0, start) + ` ${token} ` + code.slice(end, code.length);
        i = i + jump;
        break;
      }
    }
  }
  return code;
}

export function customLex(code: string, tokens: string[]) {
  const words = wrapTokens(code, tokens)
    .split(flow)
    .filter((c) => c != "");
  const labeled = labelWords(words);
  return labeled;
}

export function lexer(code: string) {
  return customLex(code, [";", "(", "(", "(*", "*)", ":=", "=", "=>"]);
}
