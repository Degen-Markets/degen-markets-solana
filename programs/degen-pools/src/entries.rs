use crate::errors::*;
use crate::{Pool, PoolOption};
use anchor_lang::prelude::*;
use anchor_lang::{account, Accounts};

#[account]
pub struct Entry {
    pub value: u64,
    pub is_claimed: bool,
}

#[event]
pub struct PoolEntered {
    pub pool: Pubkey,
    pub option: Pubkey,
    pub entry: Pubkey,
    pub value: u64,
    pub entrant: Pubkey,
}
#[event]
pub struct WinClaimed {
    pub entry: Pubkey,
    pub winner: Pubkey,
    pub pool: Pubkey,
}
pub fn enter_pool(ctx: Context<EnterPool>, value: u64) -> Result<()> {
    let pool_account = &mut ctx.accounts.pool_account;
    if pool_account.is_paused {
        return err!(CustomError::PoolStateIncompatible);
    }
    pool_account.value += value;

    let entry_account = &mut ctx.accounts.entry_account;
    entry_account.value += value;
    entry_account.is_claimed = false;

    let option_account = &mut ctx.accounts.option_account;
    option_account.value += value;

    // Transfer SOL from entrant to treasury
    let ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.entrant.key(),
        &ctx.accounts.pool_account.key(),
        value,
    );
    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            ctx.accounts.entrant.to_account_info(),
            ctx.accounts.pool_account.to_account_info(),
        ],
    )?;

    emit!(PoolEntered {
        pool: ctx.accounts.pool_account.key(),
        option: ctx.accounts.option_account.key(),
        entry: ctx.accounts.entry_account.key(),
        entrant: ctx.accounts.entrant.key(),
        value,
    });
    Ok(())
}

pub fn claim_win(ctx: Context<ClaimWin>) -> Result<()> {
    let entry_account = &mut ctx.accounts.entry_account;
    if entry_account.is_claimed {
        return err!(CustomError::EntryAlreadyClaimed);
    }
    let signer_account = &ctx.accounts.winner;
    let pool_account = &ctx.accounts.pool_account;
    let option_account = &ctx.accounts.option_account;

    if pool_account.winning_option != option_account.key() {
        return err!(CustomError::LosingOption);
    }

    let (derived_entry_account_key, _entry_account_bump) = Pubkey::find_program_address(
        &[
            &option_account.key().to_bytes(),
            &signer_account.key().to_bytes(),
        ],
        ctx.program_id,
    );

    if derived_entry_account_key != entry_account.key() {
        return err!(CustomError::EntryNotDerivedFromOptionOrSigner);
    }

    entry_account.is_claimed = true;
    let win_share_value = (pool_account.value * 100) / option_account.value;
    let win_amount = (entry_account.value * win_share_value) / 100;
    // Transfer SOL from pool to winner
    **ctx
        .accounts
        .pool_account
        .to_account_info()
        .try_borrow_mut_lamports()? -= win_amount;
    **ctx
        .accounts
        .winner
        .to_account_info()
        .try_borrow_mut_lamports()? += win_amount;

    emit!(WinClaimed {
        entry: entry_account.key(),
        winner: ctx.accounts.winner.key(),
        pool: ctx.accounts.pool_account.key(),
    });

    Ok(())
}

#[derive(Accounts)]
pub struct EnterPool<'info> {
    #[account(
        init_if_needed,
        payer = entrant,
        space = 8 + 8 + 1, // 8 bytes for discriminator, 8 bytes for value, 1 byte for bool is_claimed
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
