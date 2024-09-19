use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use crate::errors::CustomError;
use crate::constants::AUTHORITY_PUBKEY;

#[account]
pub struct Pool {
    pub title: String,
    pub is_paused: bool,
    pub winning_option: Pubkey,
    pub value: u64,
}

pub fn create_pool(
    ctx: Context<CreatePool>,
    title: String,
    title_hash: [u8; 32],
) -> Result<()> {
    if hash(&title.as_bytes()).to_bytes() != title_hash {
        return err!(CustomError::TitleDoesNotMatchHash);
    }
    let pool_account = &mut ctx.accounts.pool_account;
    pool_account.title = title;
    pool_account.is_paused = false;
    pool_account.winning_option = Pubkey::default();
    pool_account.value = 0;
    Ok(())
}

pub fn set_is_paused(ctx: Context<UpdatePool>, is_paused: bool) -> Result<()> {
    let pool_account = &mut ctx.accounts.pool_account;
    pool_account.is_paused = is_paused;
    Ok(())
}

pub fn set_winning_option(ctx: Context<UpdatePool>, winning_option: Pubkey) -> Result<()> {
    let pool_account = &mut ctx.accounts.pool_account;
    if !pool_account.is_paused {
        return err!(CustomError::PoolStateIncompatible);
    }
    pool_account.winning_option = winning_option;
    Ok(())
}

#[derive(Accounts)]
pub struct UpdatePool<'info> {
    #[account(mut)]
    pub pool_account: Account<'info, Pool>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(title: String, title_hash: [u8; 32])]
pub struct CreatePool<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 1 + 32 + (4 + title.len()) + 8, // 8 bytes for discriminator, 1 byte for bool has_concluded, 32 bytes for Pubkey winning_option, 4 bytes for string + title length bytes, 8 for value
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