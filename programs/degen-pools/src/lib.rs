use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

pub use entries::*;
pub use errors::CustomError;
pub use pool_options::*;
pub use pools::*;
pub use transfers::*;

mod constants;
mod entries;
mod errors;
mod pool_options;
mod pools;
mod transfers;

declare_id!("5MnKYzSNUZgxjBNMz4QQczAeZyrEGJsuneV31p3tCEM3");

#[program]
pub mod degen_pools {
    use super::*;

    pub fn create_pool(
        ctx: Context<CreatePool>,
        title: String,
        title_hash: [u8; 32],
        image_url: String,
        description: String,
    ) -> Result<()> {
        pools::create_pool(ctx, title, title_hash, image_url, description)
    }

    pub fn set_is_paused(ctx: Context<UpdatePool>, is_paused: bool) -> Result<()> {
        pools::set_is_paused(ctx, is_paused)
    }

    pub fn set_winning_option(ctx: Context<UpdatePool>, winning_option: Pubkey) -> Result<()> {
        pools::set_winning_option(ctx, winning_option)
    }

    pub fn create_option(
        ctx: Context<CreateOption>,
        option_title: String,
        option_hash: [u8; 32],
    ) -> Result<()> {
        pool_options::create_option(ctx, option_title, option_hash)
    }

    pub fn enter_pool(ctx: Context<EnterPool>, value: u64) -> Result<()> {
        entries::enter_pool(ctx, value)
    }

    pub fn claim_win(ctx: Context<ClaimWin>) -> Result<()> {
        entries::claim_win(ctx)
    }

    pub fn execute_transaction(ctx: Context<ExecuteTransaction>, amount: u64) -> Result<()> {
        transfers::handle_transaction(ctx, amount)
    }
}
