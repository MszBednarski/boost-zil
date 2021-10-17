# I. ZilSwap documentation

#### SetFee()



  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `new_fee` | `Uint256`          |

#### TransferOwnership()



  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `new_owner` | `ByStr20`          |

#### AcceptPendingOwnership()



**No Arguments**



#### AddLiquidity()



  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `token_address` | `ByStr20`          |
| @param | `min_contribution_amount` | `Uint128`          |
| @param | `max_token_amount` | `Uint128`          |
| @param | `deadline_block` | `BNum`          |

#### RemoveLiquidity()



  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `token_address` | `ByStr20`          |
| @param | `contribution_amount` | `Uint128`          |
| @param | `min_zil_amount` | `Uint128`          |
| @param | `min_token_amount` | `Uint128`          |
| @param | `deadline_block` | `BNum`          |

#### SwapExactZILForTokens()



  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `token_address` | `ByStr20`          |
| @param | `min_token_amount` | `Uint128`          |
| @param | `deadline_block` | `BNum`          |
| @param | `recipient_address` | `ByStr20`          |

#### SwapExactTokensForZIL()



  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `token_address` | `ByStr20`          |
| @param | `token_amount` | `Uint128`          |
| @param | `min_zil_amount` | `Uint128`          |
| @param | `deadline_block` | `BNum`          |
| @param | `recipient_address` | `ByStr20`          |

#### SwapZILForExactTokens()



  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `token_address` | `ByStr20`          |
| @param | `token_amount` | `Uint128`          |
| @param | `deadline_block` | `BNum`          |
| @param | `recipient_address` | `ByStr20`          |

#### SwapTokensForExactZIL()



  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `token_address` | `ByStr20`          |
| @param | `max_token_amount` | `Uint128`          |
| @param | `zil_amount` | `Uint128`          |
| @param | `deadline_block` | `BNum`          |
| @param | `recipient_address` | `ByStr20`          |

#### SwapExactTokensForTokens()



  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `token0_address` | `ByStr20`          |
| @param | `token1_address` | `ByStr20`          |
| @param | `token0_amount` | `Uint128`          |
| @param | `min_token1_amount` | `Uint128`          |
| @param | `deadline_block` | `BNum`          |
| @param | `recipient_address` | `ByStr20`          |

#### SwapTokensForExactTokens()



  **Arguments:**

|        | Name      | Type               |
| ------ | --------- | ------------------ |
| @param | `token0_address` | `ByStr20`          |
| @param | `token1_address` | `ByStr20`          |
| @param | `max_token0_amount` | `Uint128`          |
| @param | `token1_amount` | `Uint128`          |
| @param | `deadline_block` | `BNum`          |
| @param | `recipient_address` | `ByStr20`          |