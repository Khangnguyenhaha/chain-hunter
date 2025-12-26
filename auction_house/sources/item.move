module game::item {

    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;

    struct Item has key, store {
        id: UID,
        name: vector<u8>,
    }

  
    public fun mint(
        name: vector<u8>,
        ctx: &mut TxContext
    ): Item {
        Item {
            id: object::new(ctx),
            name,
        }
    }
}
