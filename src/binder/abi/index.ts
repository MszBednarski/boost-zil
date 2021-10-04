import "isomorphic-fetch";
import { ABI } from "./generateBindings/interfaces";
import { RED, GREEN } from "../shared";
declare var fetch: any;

export async function getABI(code: string) {
  const res = await fetch("https://scilla-server.zilliqa.com/contract/check", {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
      "content-type": "application/json;charset=UTF-8",
    },
    referrer: "https://ide.zilliqa.com/",
    referrerPolicy: "strict-origin-when-cross-origin",
    body: JSON.stringify({ code: code }),
    method: "POST",
    mode: "cors",
    credentials: "omit",
  });
  const scillaCheckerRes = JSON.parse(await res.text());
  if (scillaCheckerRes.result == "success") {
    console.log(GREEN, `scilla-checker success 🙌`);
  } else {
    console.log(
      RED,
      `scilla-checker fail 😞 ${JSON.stringify(scillaCheckerRes, null, 2)}`
    );
    throw new Error("scilla-checker failed");
  }
  const response = JSON.parse(scillaCheckerRes.message);
  return response as ABI;
}
export { generateBindings } from "./generateBindings";
