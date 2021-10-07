export default `import {
    ByStr20,
    ByStr33,
    createAccount,
    Uint128,
    SDKResolvers,
} from "boost-zil";
import { Account } from "@zilliqa-js/account";
import { isolatedServer, getResolversFromAccount } from "boost-zil/lib/testing";
import { SlotMachine } from "../src/SmartContract/build/bind";
import { Long } from "@zilliqa-js/zilliqa";

let admin: ByStr20;
let adminPubKey: ByStr33;
let adminAcc: Account;
let slotMachine: ReturnType<typeof SlotMachine>;
let fundingAccount: ReturnType<typeof createAccount>;
let resolvers: SDKResolvers;

const limit = Long.fromString("60000");

describe("on blockchain", async () => {
    before(async () => {
        await isolatedServer.start();
        adminAcc = new Account(isolatedServer.submitterPrivateKey);
        admin = new ByStr20(adminAcc.address);
        adminPubKey = new ByStr33(adminAcc.publicKey);
        resolvers = getResolversFromAccount(adminAcc);
        fundingAccount = createAccount();
    });
    after(async () => {
        await isolatedServer.kill();
    });
    it("contract works", async () => {
        const ticketPrice = Uint128.zil("10");
        const vault = createAccount();
        const { address: slotMachineAddr } = await slotMachine
        .deploy(
            limit,
            adminPubKey,
            vault.address,
            ticketPrice,
            // 30% cut
            new Uint128("3000")
        )
        .send();

        const callMachine = slotMachine.calls(slotMachineAddr)(limit);

        // FUND AS ADMIN
        await callMachine.AddFunds(Uint128.zil("1000")).send();

        // TODO: do more tests
    });
});
`