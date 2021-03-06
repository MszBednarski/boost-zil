export default `scilla_version 0

import IntUtils

library SlotMachine
type Error =
| NotAuthorized
| NoStagedAdmin
| NotEnoughZILSent
| InvalidSignature
| CannotClaimMoreThanMax
| UnknownRewardTier
| DiscountTooBig
| InvalidCheque

let make_error =
fun (result: Error) =>
let result_code =
match result with
| NotAuthorized => Int32 -1
| NoStagedAdmin => Int32 -2
| NotEnoughZILSent => Int32 -3
| InvalidSignature => Int32 -4
| CannotClaimMoreThanMax => Int32 -5
| UnknownRewardTier => Int32 -6
| DiscountTooBig => Int32 -7
| InvalidCheque => Int32 -8
end
in
{ _exception: "Error"; code: result_code }

let one_msg = 
    fun(msg: Message) =>
    let nil_msg = Nil{Message} in Cons{Message} msg nil_msg

let zero = Uint128 0
let one = Uint128 1
let zeroByStr0 = 0x
let zeroByStr20 = 0x0000000000000000000000000000000000000000
let zeroByStr = builtin to_bystr zeroByStr0
let discount_denominator = Uint128 10000
let true = True

type Uint128Pair =
| Uint128Pair of Uint128 Uint128
let uint128_to_uint256: Uint128 -> Uint256 =
  fun (x: Uint128) =>
    let ox256 = builtin to_uint256 x in
      match ox256 with
      | None =>
        (* this never happens, hence we throw a division by zero exception just in case *)
        let zero = Uint256 0 in
        builtin div zero zero
      | Some x256 => x256
      end
(* Compute "(x * y) / z" with protection against integer overflows *)
let muldiv: Uint128 -> Uint128 -> Uint128 -> Uint128 =
    fun (x: Uint128) =>
    fun (y: Uint128) =>
    fun (z: Uint128) =>
      let x256 = uint128_to_uint256 x in
      let y256 = uint128_to_uint256 y in
      let z256 = uint128_to_uint256 z in
      let x_mul_y256 = builtin mul x256 y256 in
      let res256 = builtin div x_mul_y256 z256 in
      let ores128 = builtin to_uint128 res256 in
      match ores128 with
      | None =>
        (* this must never happen, hence we throw an integer overflow exception *)
        let max_uint128 = Uint128 340282366920938463463374607431768211455 in
        let fourtytwo128 = Uint128 42 in
        builtin mul max_uint128 fourtytwo128
      | Some res128 =>
        res128
      end

(* calculate amounts without comission *)
let sub_percentage_of_amt: Uint128 -> Uint128 -> Uint128Pair =
    fun (amount: Uint128) => fun (commission_numerator: Uint128) =>
    let commission = muldiv amount commission_numerator discount_denominator in
    let amount_sub_commission = builtin sub amount commission in
    let res = Uint128Pair amount_sub_commission commission in
    res

type SpinClaim =
| SpinClaim of Uint128 Uint128 Uint128 ByStr64

type Signable =
| Signable of ByStr20 Uint128 Uint128 Uint128 ByStr20

type HashableArg =
| B of ByStr20
| U of Uint128

let hash_signable_arg: HashableArg -> ByStr32 =
    fun(s: HashableArg)=> 
    match s with
    | B a => builtin sha256hash a
    | U a => builtin sha256hash a
    end

let hash_concat: ByStr -> HashableArg -> ByStr =
    fun(prefix: ByStr) => fun(suffix: HashableArg) =>
    let bystr_32 = hash_signable_arg suffix in
    let bystr = builtin to_bystr bystr_32 in
    builtin concat prefix bystr


let signable_to_cheque_hash: Signable -> ByStr =
    fun(args: Signable) =>
        match args with
            | Signable b0 u0 u1 u2 b1 =>
            let c0 = let a0 = B  b0 in hash_concat zeroByStr a0 in
            let c1 = let a1 = U  u0 in hash_concat        c0 a1 in
            let c2 = let a2 = U  u1 in hash_concat        c1 a2 in
            let c3 = let a3 = U  u2 in hash_concat        c2 a3 in
            let c4 = let a4 = B  b1 in hash_concat        c3 a4 in
                c4
        end

let optional_uint128: Option Uint128 -> Uint128 =
    fun(o: Option Uint128) =>
    match o with | None => zero | Some s => s end

let empty_uint128_uint128_map = Emp Uint128 Uint128

contract SlotMachine(
    init_admin_pubkey: ByStr33,
    init_fee_addr: ByStr20,
    init_ticket_price: Uint128,
    init_fee_cut: Uint128
)

field players_spins: Map ByStr20 Uint128 = Emp ByStr20 Uint128
field players_claimed:  Map ByStr20 Uint128 = Emp ByStr20 Uint128
field admin: ByStr20 = builtin schnorr_get_address init_admin_pubkey
field admin_pubkey: ByStr33 = init_admin_pubkey 
field staging_admin_pubkey: Option ByStr33 = None {ByStr33}

(* ex 0 to 6 and corresponding reward amt *)
field win_tiers: Map Uint128 Uint128 = empty_uint128_uint128_map
field fee_addr: ByStr20 = init_fee_addr
field ticket_price: Uint128 = init_ticket_price
field fee_cut: Uint128 = init_fee_cut

field tmp_ticket_amt: Uint128 = zero
(* hashes of cheque hashes here are invalid *)
field void_cheques: Map ByStr32 Bool = Emp ByStr32 Bool
field tmp_target: ByStr20 = zeroByStr20

procedure ThrowError(err: Error)
    e = make_error err;
    throw e
end
procedure IsAdmin()
    tmp <- admin;
    is_admin = builtin eq tmp _sender;
    match is_admin with
    | False => e = NotAuthorized; ThrowError e
    | True =>
    end 
end
procedure SendZil(beneficiary: ByStr20, amt: Uint128)
    msg = let m = { 
        _tag: "AddFunds";
        _recipient: beneficiary;
        _amount: amt
    } in one_msg m;
    send msg
end
procedure DoVoidCheque(cheque_hash: ByStr)
    hash = builtin sha256hash cheque_hash;
    void_cheques[hash] := true
end
procedure AssertChequeHashValid(cheque_hash: ByStr)
    hash = builtin sha256hash cheque_hash;
    cheque_invalid <- exists void_cheques[hash];
    match cheque_invalid with 
        | False =>
        | True => e = InvalidCheque; ThrowError e
    end
end

transition SetStagedAdmin(staged: ByStr33)
    IsAdmin;
    opt_staged = Some {ByStr33} staged;
    staging_admin_pubkey := opt_staged
end
transition ClaimStagedAdmin()
    option_staged <- staging_admin_pubkey;
    match option_staged with
    | None => e = NoStagedAdmin; ThrowError e
    | Some staged_pubkey =>
        staged = builtin schnorr_get_address staged_pubkey;
        staged_is_sender = builtin eq _sender staged;
        match staged_is_sender with
        | False => e = NotAuthorized; ThrowError e
        | True => 
            admin := staged;
            admin_pubkey := staged_pubkey
        end
    end
end

procedure SetWinTier(tier: Uint128Pair)
    match tier with
    | Uint128Pair cur_tier amt =>
        win_tiers[cur_tier] := amt
    end
end


transition SetWinTiers(tiers: List Uint128Pair)
    IsAdmin;
    win_tiers := empty_uint128_uint128_map;
    forall tiers SetWinTier
end

(* to withdraw funds once the contract has too much state *)
transition Send(to: ByStr20, amt: Uint128)
    IsAdmin;
    SendZil to amt
end

transition UpdateFeeAddr(new: ByStr20)
    IsAdmin;
    fee_addr := new
end

transition UpdateTicketPrice(new: Uint128)
    IsAdmin;
    ticket_price := new
end

transition UpdateFeeCut(new: Uint128)
    IsAdmin;
    fee_cut := new
end

(* user transitions *)

procedure AcceptAsTickets()
    cur_balance <- _balance;
    accept;
    accepted_balance <- _balance;
    gain = builtin sub accepted_balance cur_balance;
    price <- ticket_price;
    to_send_back = builtin rem gain price;
    ticket_num = builtin div gain price;
    is_zero_tickets = builtin eq ticket_num zero;
    match is_zero_tickets with
    | True => e = NotEnoughZILSent; ThrowError e
    | False =>
        (* save tmp ticket number for _sender *)
        tmp_ticket_amt := ticket_num;
        is_zero_to_send_back = builtin eq to_send_back zero;
        match is_zero_to_send_back with
        | True => (* do nothing *)
        | False =>
            (* refund overpay *)
            SendZil _sender to_send_back
        end
    end
end

procedure GiveTickets(to: ByStr20, amt: Uint128)
    maybe_spins <- players_spins[to];
    spins = optional_uint128 maybe_spins;
    spins_added = builtin add spins amt;
    players_spins[to] := spins_added
end

procedure AssertChequeValidityAndVoidIt(cheque_hash: ByStr, pubkey: ByStr33, signature: ByStr64)
    AssertChequeHashValid cheque_hash;
    valid_sig = builtin schnorr_verify pubkey cheque_hash signature;
    match valid_sig with
        | True =>
            (* only here the message is valid! *)
            DoVoidCheque cheque_hash
        | False => e = InvalidSignature; ThrowError e
    end
end
procedure AssertIsAdminSignatureAndVoidIt(signable: Signable, signature: ByStr64)
    cheque_hash = signable_to_cheque_hash signable;
    admin_pub_temp <- admin_pubkey;
    AssertChequeValidityAndVoidIt cheque_hash admin_pub_temp signature
end
procedure IncrementClaim(target: ByStr20)
    maybe_ticket_max <- players_spins[target];
    ticket_max = optional_uint128 maybe_ticket_max;
    (* increment claim make sure that claim >= ticket *)
    maybe_claimed_index <- players_claimed[target];
    claimed_index = optional_uint128 maybe_claimed_index;
    claimed_incremented = builtin add claimed_index one;
    (* make sure claimed incremented is not bigger than ticket_max *)
    claim_is_bigger = uint128_gt claimed_incremented ticket_max;
    match claim_is_bigger with
    | True => e = CannotClaimMoreThanMax; ThrowError e
    | False =>
        players_claimed[target] := claimed_incremented
    end
end

procedure AssertDiscountNotBiggerThanMax(d: Uint128)
    is_bigger = uint128_gt d discount_denominator;
    match is_bigger with
    | True => e = DiscountTooBig; ThrowError e
    | False =>
    end
end


procedure SendWinnings(target: ByStr20, win_tier: Uint128, amt: Uint128, fee: Uint128)
    e = {_eventname : "Won"; target: target; amt: amt; win_tier: win_tier; fee_nominator: fee};
    event e;
    SendZil target amt
end


procedure PayFee(amt: Uint128)
    fund <- fee_addr;
    SendZil fund amt
end


procedure PayOutReward(target: ByStr20, win_tier: Uint128, discount: Uint128)
    maybe_win_amt <- win_tiers[win_tier];
    match maybe_win_amt with
    | None => e = UnknownRewardTier; ThrowError e
    | Some win_amt =>
        is_zero = builtin eq win_amt zero;
        match is_zero with
        | True => (* do nothing is fine *)
        | False =>
            (* do reward payout and reward fee *)
            AssertDiscountNotBiggerThanMax discount;
            discount_is_max = builtin eq discount discount_denominator;
            match discount_is_max with
            | True => SendWinnings target win_tier win_amt zero
            | False =>
                fee_cut_local <- fee_cut;
                res1 = sub_percentage_of_amt fee_cut_local discount;
                match res1 with
                | Uint128Pair fee_discounted asdf =>
                    result = sub_percentage_of_amt win_amt fee_discounted;
                    match result with
                    | Uint128Pair reward fee =>
                        SendWinnings target win_tier reward fee_discounted;
                        PayFee fee
                    end
                end
            end
        end
    end
end

transition AddFunds()
    AcceptAsTickets;
    (* get tickets to give and reasign *)
    ticket_amt <- tmp_ticket_amt;
    tmp_ticket_amt := zero;
    GiveTickets _sender ticket_amt;
    (* emit bought tickets *)
    e = {_eventname : "BoughtTickets"; sender: _sender; ticket_amt: ticket_amt};
    event e
end

procedure ClaimSpin(spin: SpinClaim)
    target <- tmp_target;
    match spin with
    | SpinClaim discount spin_num win_tier signature =>
        signable = Signable target discount spin_num win_tier _this_address;
        AssertIsAdminSignatureAndVoidIt signable signature;
        (* since we got here that means that the spin meta tx is valid *)
        (* now we need to incremet claim and pay out rewards *)
        IncrementClaim target;
        PayOutReward target win_tier discount
    end
end

(* 
    @dev: have to sign target discount spinNumber winTier _this_addr
    _sender can be anybody these are meta transactions
*)
transition ClaimSpins(target: ByStr20, spins: List SpinClaim)
    tmp_target := target;
    forall spins ClaimSpin
end
`