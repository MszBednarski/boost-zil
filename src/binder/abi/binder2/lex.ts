export interface Word {
  length: number;
  regex: RegExp;
  source: string;
}

export interface WordIn {
  regex: RegExp;
  source: string;
}

export function escapeRegExp(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function prepareWords(wordsIn: WordIn[]): Word[] {
  const _w: Word[] = wordsIn.map((_t) => ({
    length: _t.source.length,
    regex: new RegExp("^" + _t.regex.source),
    source: _t.source,
  }));
  _w.sort((a, b) => b.length - a.length);
  return _w;
}
function prepareSymbols(i: string[]) {
  const _w = i.map((_t) => ({
    length: _t.length,
    regex: new RegExp(`(${escapeRegExp(_t)})`, "g"),
  }));
  _w.sort((a, b) => b.length - a.length);
  return _w;
}

function getAntiTest(t: Word[]): RegExp {
  const anti = Array.from(new Set(t.map((i) => i.source[0])));
  return new RegExp(`^\\s*(${anti.join("|")})`);
}

function lexWords(code: string, _tokens: Word[]): string[] {
  const anti = getAntiTest(_tokens);
  // to accomodate regexes for the longest token +2
  const longestToken = _tokens[0].length + 2;
  const pad = new Array(longestToken).fill(" ").join("");
  code = ` ${code}${pad}`;
  const res: string[] = [];
  let lastToken = 0;
  let i = 0;
  let start = 0;
  windowLoop: while (i < code.length) {
    start = i;
    const end = i + longestToken;
    const chars = code.slice(start, end);
    // if this does not match none of the tokens will
    if (!chars.match(anti)) {
      i++;
      continue windowLoop;
    }
    for (const token of _tokens) {
      const isMatch = chars.match(token.regex);
      if (isMatch) {
        // console.log(token.regex)
        // even if the previous char is matched
        // consider case like =>match then target would be
        // match... it would not connect!
        const jump = isMatch[0].trimEnd().length;
        i = i + jump;
        if (start != lastToken) {
          res.push(code.slice(lastToken, start));
        }
        lastToken = i;
        res.push(token.source);
        continue windowLoop;
      }
    }
    i++;
  }
  return [...res, code.slice(lastToken)]
    .map((t) => t.trim())
    .filter((i) => i != "");
}

export const wrapTokens =
  (tokens: WordIn[], symbols: string[]) => (code: string) => {
    const _tokens = prepareWords(tokens);
    const _symbols = prepareSymbols(symbols);
    const first = _symbols.shift();
    if (!first) {
      throw new Error("Provide at least one symbol");
    }
    // make a first pass for the symbols
    const symbolSplit = _symbols.reduce(
      (prev, cur) =>
        prev.flatMap((a) => (symbols.includes(a) ? [a] : a.split(cur.regex))),
      code.split(first.regex)
    );
    if (!symbolSplit) {
      throw new Error("Error splitting symbols");
    }

    return symbolSplit.flatMap((i) => lexWords(i, _tokens));
  };
