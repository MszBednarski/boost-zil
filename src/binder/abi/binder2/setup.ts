import {
  singleCharacterSymbols,
  multiCharacterSymbols,
  reservedWords,
} from "./constants";
import { wrapTokens } from "./lex";
import { removeComments } from "./parser";

const escSpace = (r: string) => ({
  regex: new RegExp(`\\s+${r}\\s+`),
  source: r,
});
const symbols = [...singleCharacterSymbols, ...multiCharacterSymbols];
const words = reservedWords.map(escSpace);

const lex = wrapTokens(words, symbols);

export const lexScilla = (s: string, removeComm = true) => {
  console.time("wrapTokens");
  const lexed = lex(s);
  console.timeEnd("wrapTokens");
  if (removeComm) {
    return removeComments(lexed);
  }
  return lexed;
};
