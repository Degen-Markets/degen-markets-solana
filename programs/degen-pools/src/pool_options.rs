use crate::{errors::CustomError, Pool};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use anchor_lang::Accounts;

#[account]
pub struct PoolOption {
    pub title: String,
    pub value: u64,
}

#[event]
pub struct OptionCreated {
    pub pool_account: Pubkey,
    pub option: Pubkey,
    pub title: String,
}
pub fn create_option(
    ctx: Context<CreateOption>,
    option_title: String,
    option_hash: [u8; 32],
) -> Result<()> {
    // check that pool account is held by admin/signer
    let title_hash = hash(ctx.accounts.pool_account.title.as_bytes().as_ref()).to_bytes();
    let (derived_pool_account_key, _) = Pubkey::find_program_address(
        &[&title_hash, ctx.accounts.admin.key().to_bytes().as_ref()],
        ctx.program_id,
    );
    if derived_pool_account_key != ctx.accounts.pool_account.key() {
        return err!(CustomError::PoolAccountDoesNotMatch);
    }

    let mut derived_option_input = ctx.accounts.pool_account.key().to_string().to_owned();
    // Concatenate bytes using the concat method
    derived_option_input.push_str(&option_title);

    let derived_option_hash = hash(derived_option_input.as_bytes());

    if derived_option_hash.to_bytes() != option_hash {
        return err!(CustomError::PoolOptionDoesNotMatchHash);
    }
    let option_account = &mut ctx.accounts.option_account;
    option_account.title = option_title.clone();
    option_account.value = 0;

    emit!(OptionCreated {
        pool_account: ctx.accounts.pool_account.key(),
        option: ctx.accounts.option_account.key(),
        title: option_title
    });

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
    #[account(mut, signer)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}
