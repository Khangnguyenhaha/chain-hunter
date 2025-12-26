
module game::treasury {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::transfer;

    struct Treasury has key {
        id: UID,
        balance: Balance<SUI>,
        fee_bps: u64, // 2000 = 20%
    }

    /// Create a new Treasury object (not shared yet)
    public fun create(
        ctx: &mut TxContext
    ): Treasury {
        Treasury {
            id: object::new(ctx),
            balance: balance::zero<SUI>(),
            fee_bps: 0,
        }
    }


    /// Share the Treasury object as a shared object (should only be called once)
    public fun share(treasury: Treasury) {
        transfer::share_object(treasury);
    }

    /// Collect fee and return seller's coin
    public fun collect_fee(
        treasury: &mut Treasury,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ): Coin<SUI> {
        let total = coin::value(&payment);
        let fee = total * treasury.fee_bps / 10_000;
        let seller_payment = payment;
        let fee_coin = coin::split(&mut seller_payment, fee, ctx);
        balance::join(
            &mut treasury.balance,
            coin::into_balance(fee_coin)
        );
        seller_payment
    }
}
