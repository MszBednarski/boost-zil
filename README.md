# :fire: boost-zil :fire:

# Overview

Welcome to your single stop solution to development on Zilliqa.

boost-zil features:

- :hammer: smart contract isolated server docker testing
- :robot: fully automated typescript smart contract typesafe SDK generation
- :sunglasses: a suite of convenience methods that allow you to go from idea to working app in a matter of hours
- :rocket: SDK works with node and zilpay in the browser out of the box

Q: Why is it 10 times better?

A: The SDK is typed, that means that with an IDE you will be asked to put the parameters that the contract requires AND the parameters will be formatted for you to be consumed by the blockchain.

## :package: Package breakdown

- boost-zil/lib/testing -> testing related methods
- boost-zil -> convenience methods and smart contract SDK types
- boost-zil-build -> bash script that builds the smart contracts in the current directory
- boost-zil-project -> bash script that initializes a boost-zil project in the current directory

Q: Why are imports separate for testing?

A: So that the package convienience methods can be used in the browser!

# Quick start

```bash
npm i boost-zil@latest -g
```

Make your project dir go to it and init:

```bash
mkdir myProject && cd myProject && boost-zil-project
```

✨ Congrats ✨

This is that simple.

You just created a scilla dev project that can build your contract, and test it on an isolated ziliqa blockchain server.

If you want to deploy to mainnet production you are just a step away.

Read through the code and get started!

# Examples

[EXAMPLES](./examples/)

## Build a Scilla smart contract

With boost-zil.json already defined in your directory:

```json
{
  // relative path from current directory to all the contracts you want to build
  "contracts": ["./test/SlotMachine/SlotMachine.scilla"],
  // if you want to make signers for meta transactions
  // experimental
  "makeSigners": false
}
```

In your terminal:

```bash
boost-zil-build
```

✨ Bam! ✨

You are done your contracts are built.

You can import your contract SDK from ../path/to/contract/build/bind.ts

Have a read through the bind to understand how it works.

## Deploy a contract using the SDK

```typescript
import {SDKResolvers, Uint128} from 'boost-zil'
import {SlotMachine} from './test/SlotMachine/build/bind'
import {Zilliqa, Long} from "@zilliqa-js/zilliqa";

const runtimeconfig = {
  "nodeUrl": "https://api.zilliqa.com/",
  "version": 65537,
  "networkName": "mainnet"
}


/**
 * The best concept about this sdk are resolvers
 * why?
 * you can provide and change them in any environment with ease,
 * so you can test the same code you use in production for instance
 * on an isolated server that is integrated into this framework
 * */
const resolvers: SDKResolvers = {
  getZil: async (
    // this will be true if the sdk requires a signer to make a transaction
    // otherwise it means that the sdk is just getting state of the contract for instance
    requireSigner
  ) => {
    // your custom teardown zil function
    // you might need this if your services are using the same private key in multiple places
    // for instance you have a meta transaction submitting service and you neeed an arbitrary
    // private key to submit, but only one process can use it at a time
    // you can make an aquire submitter private key mechanism and then release ownership over
    // the private key when teardown is called
    let teardown = async () => {};
    const zil = new Zilliqa(runtimeconfig.nodeUrl);
    if (signer) {
      zil.wallet.addByPrivateKey(a.privateKey);
      teardown = async () => {};
    }
    return { zil, teardown };
  }
  // version of the blockchain protocol
  getVersion: () => runtimeconfig.version;
  // the name of the network used by the logger to give you viewblock links
  getNetworkName: () => runtimeconfig.networkName;
  // optional to provide custom transaction logging logic
  // example if you are runnning this on google cloud functions
  // you might want to write your custom transaction logging function
  // however on default you have a logging function that gives you viewblock links
  // prints the events errors and if transaction was successsfull (included in the blockchain)
  /* txLog?: (t: Transaction, msg: string) => void; */
}


(async () => {
  const limit = Long.fromString("20000");
  const slotMachine = SlotMachine(resolvers);
  const { address, tx } = await slotMachine
    // deploy always takes the gas limit and the contract init parameters after it
    .deploy(
      limit,
      // now the contract parameters
      // THESE ARE TYPED, JUST HOVER OVER THE FUNCTION IN VS CODE :sunglasses:
      adminPubKey,
      // the admin of the
      fundingAccount.address,
      // will just return the corresponsing number to 10.12 zil
      // which is 10.12 * 10^12
      Uint128.fromFraction("10.12", 12),
      // just "1000" wrapped in Uint128 type
      new Uint128("1000")
    )
    .send();

})()

```

## Make a call to a smart contract

```typescript
import {Uint128, ByStr20} from 'boost-zil'
import {SlotMachine} from './test/SlotMachine/build/bind'
import {Zilliqa, Long} from "@zilliqa-js/zilliqa";


(async () => {
  const limit = Long.fromString("20000");]
  // checkout deploy section to know how to get resolvers
  const slotMachine = SlotMachine(resolvers);
  // just put a bech32 or bystr20 address everything is formatted under the hood :)
  const address = new ByStr20("")
  // all calls that are available for that smart contract will be here
  const slotMachineCall = slotMachine.calls(address)(limit);
  // :sparkles: bam easiest call of my life
  // thats how you can send it directly
  // the sdk AUTOMAGICALLY detects if a transition accepts ZIL
  // the how much ZIL should be sent will be always the first param if the contract accepts
  const {tx} = await slotMachineCall.AddFunds(Uint128.zil("34")).send();
  // but check this out
  // you can also get the json representing the transaction
  const asJson = slotMachineCall.AddFunds(Uint128.zil("45")).toJSON();
  // with the json you can show it to the user, save to db for later, anything!
  // to rejenerate and send a transaction from the json:
  const {tx} = await slotMachine.dangerousFromJSONCall(asJson, limit);

})()

```

## Complex params call to a smart contract

```typescript
import { List, Pair, ScillaString, ByStr20 } from "boost-zil";
import { SlotMachine } from "./test/SlotMachine/build/bind";
import { Zilliqa, Long } from "@zilliqa-js/zilliqa";

(async () => {
  // consider the ignite dao global config contract
  // with the following transition
  // transition UpdateByStrConfig(conf: List (Pair String ByStr20))
  //   IsAdmin;
  //   forall conf UpdateByStr
  // end
  // when you have the config contract sdk the call reduces to:
  await configContract
    .UpdateByStrConfig(
      new List(
        Object.entries(conf.config.config.bystr20).map(
          ([k, v]) => new Pair(new ScillaString(k), new ByStr20(v))
        )
      )
    )
    .send();
})();
```

## Get partial state of a contract (example: GZIL)

```typescript
import { createAccount } from "boost-zil";

const transferTarget = createAccount();
const gzilCall = gzil.calls(address)(limit);
const twoGzil = Uint128.fromFraction("2", 15);
const twoThirdGzil = Uint128.fromFraction("0.66", 15);
await gzilCall.Transfer(transferTarget.address, twoGzil).send();
const mintTarget = createAccount();
await gzilCall.Mint(mintTarget.address, twoThirdGzil).send();

const [state] = await gzil
  .state(
    {
      total_supply: "*",
      balances: {
        // will surgically get the state of mintTarget address and
        // transfer target address
        // remember to use lowerCase() this is how addresses are stored on the
        // blockchain
        [mintTarget.address.lowerCase()]: "*",
        [transferTarget.address.lowerCase()]: "*",
      },
      // you can get other fields too
    },
    // set to true if you want to get the initial state too
    "false"
  )
  .get(address);

expect(state.balances[mintTarget.address.lowerCase()]).to.be.eq(
  twoThirdGzil.toSend()
);
expect(state.balances[transferTarget.address.lowerCase()]).to.be.eq(
  twoGzil.toSend()
);
```

## Get partial state of a contract without the sdk (example: fungible token balance)

You can do that but using sdks is recommended. (the sdks use this under the hood, you can check it out, by generating a sdk and reading the code)

```typescript
const addr = new ByStr20("some address");
const tokens = ["fungible token 1", "fungible token 2", "fungible token 3"]
.map(t => new ByStr20(t))

const states = await partialState(async () => getNoSignerZil())(
          ...tokens.map((t) => ({
              contractAddress: t,
              includeInit: "false" as "false",
              query: {
                  balances: { [addr]: "*" as "*" },
              },
          })),
      );
```

## Test smart contracts

You need to run docker desktop and then checkout the test directory of this project:

[Test directory](./test/)

consider that you will have everything setup if you just use in your commandline:

```bash
boost-zil-project
```

to setup a project for you.

## Transaction logging

On an isolated server (if you would be sending to mainnet you would have viewblock links too):

```bash
Deploy 🔥
Success.
Transfer 🔥
Success.
Events🕵️‍♀️
TransferSuccess
sender: 
"0xd90f2e538ce0df89c8273cad3b63ec44a3c4ed82"
recipient: 
"0x06c586241ae6c6fe02de96b4683b4f45e6868643"
amount: 
"2000000000000000"
Mint 🔥
Success.
Events🕵️‍♀️
Minted
minter: 
"0xd90f2e538ce0df89c8273cad3b63ec44a3c4ed82"
recipient: 
"0x97a89084fe8bacdc2e8e7298c0c3d27bae4f92e5"
amount: 
"660000000000000"
```

## SDK types

```typescript
import {Uint128,ByStr20} from 'boost-zil'

/**
 * Any sdk type like Uint128 and ByStr20 
 * List Pair 
 * Custom ADT 
 * Exist so that they streamline formatting and sending transactions
 * to the blockchain.
 * There are many quirks when it comes to the transactions, such as custom user ADTs
 * the formatting on the addresses across the entire stack.
 * that is why the sdk types corresponding to Scilla types exist.
 * Also it allows for static typing in typescript if you passed the right types to the
 * transaction which is epic!
 * */

// every type class exposes a .toSend() which recursively formats the message to the //// blockchain in conjunction with the contract sdks

const addr = new ByStr20("any address as long as it is an address bech32 or bystr20").toSend();

// addr now will be a formatted address and will be interpreted by the blockchain 
// correctly! same goes for any other type

// since gzil has 15 decimals to get 2.1 gzil all you have to do is:
const twoGzil = Uint128.fromFraction("2.1", 15);
// now twoGzil can be used in a transfer transaction to the GZIL contract !

// if you want a formatted human readable string for a frontend:
const humanReadableTwoGzil = Uint128.fromStringtoFraction(twoGzil.toSend(), 15, 3);
// humanReadableTwoGzil is now "2.100"

// if you want it formatted

```

## Full project examples

[EXAMPLES](./examples/)
