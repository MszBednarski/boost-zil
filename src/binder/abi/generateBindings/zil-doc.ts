import { Transition } from "./interfaces";
import { Labeled } from "./zil-accept";

export function getZilDocHeader(contractName: string) {
  return `# I. ${contractName} documentation\n\n`;
}

function getTransitionArgumentsTable(t: Transition) {
  if (t.params.length == 0) {
    return `**No Arguments**\n\n`;
  }
  return `  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
${t.params
  .map((p) => `| @param | \`${p.vname}\` | \`${p.type}\`          |`)
  .join("\n")}`;
}

export function zilDoc(t: Transition, lexed: Labeled[]) {
  const reversed = [...lexed].reverse();
  const name = t.vname;
  let isBody = false;
  const comments: Labeled[] = [];
  let index = 0;
  while (index < reversed.length) {
    const l = reversed[index];
    if (l.w == name && l.s == "other") {
      if (reversed[index + 1].s == "transition") {
        index++;
        break;
      }
    }
    index++;
  }
  for (let x = index; x < reversed.length; x++) {
    const l = reversed[x];
    if (l.w == "end" || l.w == "field") {
      break;
    }
    comments.push(l);
  }
  const commentsTextTmp = comments.map((c) => c.w).reverse();
  commentsTextTmp.pop();

  const commentsText = commentsTextTmp
    .join(" ")
    .replace(/(\*\))|(\(\*)|(\*)/g, "")
    .replace(/\s+/g, " ");

  return `#### ${t.vname}()\n\n${commentsText}\n\n${getTransitionArgumentsTable(
    t
  )}`;
}
