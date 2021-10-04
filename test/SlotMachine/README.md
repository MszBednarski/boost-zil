# I. SlotMachine documentation

#### SetStagedAdmin()



  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `staged` | `ByStr33`          |

#### ClaimStagedAdmin()



**No Arguments**



#### SetWinTiers()



  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `tiers` | `List (SlotMachine.Uint128Pair)`          |

#### Send()

 to withdraw funds once the contract has too much state 

  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `to` | `ByStr20`          |
| @param | `amt` | `Uint128`          |

#### UpdateFeeAddr()



  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `new` | `ByStr20`          |

#### UpdateTicketPrice()



  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `new` | `Uint128`          |

#### UpdateFeeCut()



  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `new` | `Uint128`          |

#### AddFunds()



**No Arguments**



#### ClaimSpins()

 @dev: have to sign target discount spinNumber winTier _this_addr _sender can be anybody these are meta transactions 

  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `target` | `ByStr20`          |
| @param | `spins` | `List (SlotMachine.SpinClaim)`          |