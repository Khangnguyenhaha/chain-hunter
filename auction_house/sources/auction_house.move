
    module game::auction_house {
        use sui::object::{Self, UID};
        use sui::tx_context::{Self, TxContext};
        use sui::coin::{Self, Coin};
        use sui::transfer;
        use sui::clock::{Self, Clock};
        use sui::sui::SUI;
        use sui::event;
        use std::option;
        use game::item::Item;
        use game::treasury;

        const E_ENDED: u64 = 0;
        const E_PRICE: u64 = 1;
        const E_CLAIMED: u64 = 2;
        const E_NO_PAYMENT: u64 = 3;

        /// One-time witness for initialization
        struct AUCTION_HOUSE has drop {}

        /// Emitted when an item is listed for auction
        struct ListItemEvent has copy, drop, store {
            auction_id: object::ID,
            seller: address,
            item_id: object::ID,
            end_time: u64,
        }

        /// Emitted when an item is bought (bid placed)
        struct BuyItemEvent has copy, drop, store {
            auction_id: object::ID,
            buyer: address,
            amount: u64,
        }

        /// Emitted when a listing is cancelled
        #[allow(unused_field)]
        struct CancelListingEvent has copy, drop, store {
            auction_id: object::ID,
            seller: address,
        }

        struct Auction has key {
            id: UID,
            seller: address,
            item: option::Option<Item>,
            highest_bid: u64,
            highest_bidder: address,
            payment: option::Option<Coin<SUI>>,
            end_time: u64,
            ended: bool,
            claimed_item: bool,
            claimed_coin: bool,
        }

        public fun create(
            item: Item,
            duration_ms: u64,
            clock: &Clock,
            ctx: &mut TxContext
        ): Auction {
            let item_id = object::id(&item);
            let auction = Auction {
                id: object::new(ctx),
                seller: tx_context::sender(ctx),
                item: option::some(item),
                highest_bid: 0,
                highest_bidder: @0x0,
                payment: option::none(),
                end_time: clock::timestamp_ms(clock) + duration_ms,
                ended: false,
                claimed_item: false,
                claimed_coin: false,
            };
            event::emit(ListItemEvent {
                auction_id: object::id(&auction),
                seller: auction.seller,
                item_id: item_id,
                end_time: auction.end_time,
            });
            auction
        }

        public fun bid(
            auction: &mut Auction,
            payment: Coin<SUI>,
            clock: &Clock,
            ctx: &mut TxContext
        ) {
            assert!(!auction.ended, E_ENDED);
            assert!(clock::timestamp_ms(clock) < auction.end_time, E_ENDED);

            let amount = coin::value(&payment);
            assert!(amount > auction.highest_bid, E_PRICE);

            // Refund previous bidder
            if (option::is_some(&auction.payment)) {
                let old_payment = option::extract(&mut auction.payment);
                transfer::public_transfer(old_payment, auction.highest_bidder);
            };

            auction.highest_bid = amount;
            auction.highest_bidder = tx_context::sender(ctx);

            event::emit(BuyItemEvent {
                auction_id: object::id(auction),
                buyer: auction.highest_bidder,
                amount,
            });

            option::fill(&mut auction.payment, payment);
        }

        public fun claim_item(
            auction: &mut Auction,
            ctx: &mut TxContext
        ) {
            assert!(auction.ended, E_ENDED);
            assert!(!auction.claimed_item, E_CLAIMED);
            assert!(auction.highest_bidder == tx_context::sender(ctx), E_CLAIMED);

            let item = option::extract(&mut auction.item);
            transfer::public_transfer(item, auction.highest_bidder);

            auction.claimed_item = true;
        }

        public fun claim_seller(
            auction: &mut Auction,
            treasury: &mut treasury::Treasury,
            ctx: &mut TxContext
        ) {
            assert!(auction.ended, E_ENDED);
            assert!(!auction.claimed_coin, E_CLAIMED);
            assert!(option::is_some(&auction.payment), E_NO_PAYMENT);

            let payment = option::extract(&mut auction.payment);
            let seller_coin = treasury::collect_fee(treasury, payment, ctx);

            transfer::public_transfer(seller_coin, auction.seller);
            auction.claimed_coin = true;
        }

        struct AuctionHouse has key {
            id: UID,
            treasury: object::ID,
            fee_bps: u64,
        }

        /// Internal one-time initialization. Only callable with AUCTION_HOUSE witness.
        fun init(_witness: AUCTION_HOUSE, ctx: &mut TxContext) {
            let treasury = treasury::create(ctx);
            let treasury_id = object::id(&treasury);
            let auction_house = AuctionHouse {
                id: object::new(ctx),
                treasury: treasury_id,
                fee_bps: 0,
            };
            transfer::share_object(auction_house);
            treasury::share(treasury);
        }
    }
