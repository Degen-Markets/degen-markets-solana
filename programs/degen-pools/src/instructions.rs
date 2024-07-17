use anchor_lang::prelude::*;
use crate::state::{Pool, PoolOption, Entry}; // Import structs from state.rs
const AUTHORITY_PUBKEY: Pubkey = pubkey!("rv9MdKVp2r13ZrFAwaES1WAQELtsSG4KEMdxur8ghXd");


#[derive(Accounts)]
#[instruction(title: String, title_hash: [u8; 32])]
pub struct CreatePool<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 1 + 32 + (4 + title.len()), // 8 bytes for discriminator, 1 byte for bool has_concluded, 32 bytes for Pubkey winning_option, 4 bytes for string + title length bytes
        seeds = [&title_hash],
        bump
    )]
    pub pool_account: Account<'info, Pool>,
    #[account(
        mut,
        signer,
        address = AUTHORITY_PUBKEY
    )]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(option_title: String, option_hash: [u8; 32])]
pub struct CreateOption<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + (4 + option_title.len()) + 8, // 8 bytes for discriminator, title length bytes, 8 bytes for value
        seeds = [&option_hash],
        bump
    )]
    pub option_account: Account<'info, PoolOption>,
    #[account(mut)]
    pub pool_account: Account<'info, Pool>,
    #[account(
        mut,
        signer,
        address = AUTHORITY_PUBKEY
    )]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EnterPool<'info> {
    #[account(
        init_if_needed,
        payer = entrant,
        space = 8 + 32 + 8 + 1, // 8 bytes for discriminator, 32 bytes for entrant pubkey, 8 bytes for value, 1 byte for bool is_claimed
        seeds = [
            option_account.key().as_ref(),
            entrant.key().as_ref(),
        ],
        bump
    )]
    pub entry_account: Account<'info, Entry>,
    #[account(mut)]
    pub option_account: Account<'info, PoolOption>,
    #[account(mut)]
    pub pool_account: Account<'info, Pool>,
    #[account(mut, signer)]
    pub entrant: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ConcludePool<'info> {
    #[account(mut)]
    pub pool_account: Account<'info, Pool>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWin<'info> {
    #[account(mut)]
    pub pool_account: Account<'info, Pool>,
    #[account(mut, signer)]
    pub winner: Signer<'info>,
    #[account(mut)]
    pub entry_account: Account<'info, Entry>,
    #[account(mut)]
    pub option_account: Account<'info, PoolOption>,
}