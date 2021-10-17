import { allWords } from "./constants";

export function removeComments(lexed: string[]) {
  const start = "(*";
  const end = "*)";
  let isComment = false;
  const res = [];
  for (let x = 0; x < lexed.length; x++) {
    const token = lexed[x];
    if (isComment) {
      if (token == end) {
        isComment = false;
      }
      continue;
    }
    if (token == start) {
      isComment = true;
      continue;
    }
    res.push(token);
  }
  return res;
}

export function justBody(lexed: string[]) {
  const x = lexed.indexOf("contract");
  return lexed.slice(x + 1);
}
export function getInfo(lexed: string[]): { contractName: string } {
  return { contractName: lexed[lexed.indexOf("contract") + 1] };
}

export interface Param {
  vname: string;
  type: string;
  lexed: string[];
}

export interface Method {
  name: string;
  params: Param[];
  nonKeyWords: string[];
  accepts?: true;
}

export type Transition = Method;
export type Procedure = Transition;

const processMethod = (lexed: string[]) => {
  //first is keyword next is the name
  const res: Method = { name: lexed[1], params: [], nonKeyWords: [] };
  // open -> vname : type maybe(,) -> jump back to vname
  // start after (
  let x = 2;
  while (lexed[x] != ")") {
    x++;
    if (lexed[x + 1] == ":") {
      const param: Param = { vname: lexed[x], type: "", lexed: [] };
      //next until , or ) is the type
      const typeStart = x + 2;
      while (lexed[x] != "," && lexed[x] != ")") {
        x++;
      }
      param.lexed = lexed.slice(typeStart, x);
      param.type = param.lexed.join(" ");
      res.params.push(param);
    }
  }
  // body after signature
  let i = x;
  while (i < lexed.length) {
    if (lexed[i] == "accept") res.accepts = true;
    if (!allWords.includes(lexed[i])) res.nonKeyWords.push(lexed[i]);
    i++;
  }
  return res;
};

const justMethods =
  (keyword: string) =>
  (methodProcessor: (lexed: string[]) => Method) =>
  (lexed: string[]) => {
    const res: { [name: string]: Method } = {};
    let x = 0;
    while (x < lexed.length) {
      if (lexed[x] == keyword) {
        const start = x;
        x++;
        while (
          lexed[x] != "transition" &&
          lexed[x] != "procedure" &&
          x < lexed.length
        ) {
          x++;
        }
        const p = methodProcessor(lexed.slice(start, x));
        res[p.name] = p;
        continue;
      }
      x++;
    }
    return res;
  };

export interface CustomType {
  name: string;
  lexed: string[];
  constructors: { [name: string]: { lexed: string[]; name: string } };
}

export function justTypes(lexed: string[]): { [t: string]: CustomType } {
  const types: { [ty: string]: CustomType } = {};
  let x = 0;
  while (x < lexed.length) {
    if (lexed[x] == "type") {
      const start = x;
      let last = x + 3;
      x++;
      const t: CustomType = {
        name: lexed[x],
        constructors: {},
        lexed: [],
      };
      while (
        lexed[x] != "let" &&
        lexed[x] != "contract" &&
        lexed[x] != "type"
      ) {
        if (lexed[x] == "|" && last < x) {
          const name = lexed[last + 1];
          t.constructors[name] = {
            lexed: lexed.slice(last + 1, x),
            name,
          };
          last = x;
        }
        x++;
      }
      const name = lexed[last + 1];
      t.constructors[name] = {
        lexed: lexed.slice(last + 1, x),
        name,
      };
      t.lexed = lexed.slice(start, x);
      Object.entries(t.constructors).forEach(([name, c]) => (types[name] = t));
    }
    x++;
  }
  return types;
}

export function justTransitions(lexed: string[]): Transition[] {
  const procedures = justMethods("procedure")(processMethod)(lexed);
  const procs = Object.keys(procedures);
  // reference procedure calls
  Object.entries(procedures).forEach(
    ([k, v]) =>
      (v.nonKeyWords = v.nonKeyWords
        .map((i) => i.split(" ")[0])
        .filter((i) => procs.includes(i)))
  );
  function findIfAccepts(m: Method): boolean {
    if (m.accepts) {
      return true;
    }
    return m.nonKeyWords
      .map((i) => findIfAccepts(procedures[i]))
      .some((v) => v == true);
  }
  // resolve if procedures accept
  Object.entries(procedures).forEach(([k, v]) => {
    const acc = findIfAccepts(v);
    if (acc) {
      v.accepts = true;
    }
  });
  const transitions = justMethods("transition")((l) => {
    const t = processMethod(l);

    t.nonKeyWords = t.nonKeyWords
      .map((i) => i.split(" ")[0].trim())
      .filter((i) => procs.includes(i));
    const accepts = t.nonKeyWords.reduce<boolean>(
      (prev, cur) => (prev ? true : procedures[cur].accepts == true),
      false
    );
    if (accepts) {
      t.accepts = accepts;
    }
    return t;
  })(lexed);

  return Object.entries(transitions).map(([k, v]) => v) as Transition[];
}
