use anchor_lang::Accounts;
use anchor_lang::prelude::*;
use crate::{Pool, errors::CustomError, constants::*};
use anchor_lang::solana_program::hash::hash;

#[account]
pub struct PoolOption {
    pub title: String,
    pub value: u64,
}
pub fn create_option(
    ctx: Context<CreateOption>,
    option_title: String,
    option_hash: [u8; 32],
) -> Result<()> {
    let mut derived_option_input = ctx.accounts.pool_account.key().to_string().to_owned();
    // Concatenate bytes using the concat method
    derived_option_input.push_str(&option_title);

    let derived_option_hash = hash(derived_option_input.as_bytes());

    if derived_option_hash.to_bytes() != option_hash {
        return err!(CustomError::PoolOptionDoesNotMatchHash);
    }
    let option_account = &mut ctx.accounts.option_account;
    option_account.title = option_title;
    option_account.value = 0;
    Ok(())
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