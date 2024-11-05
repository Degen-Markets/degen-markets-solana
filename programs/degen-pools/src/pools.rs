use crate::constants::{AUTHORITY_PUBKEY, PROGRAM_ID};
use crate::errors::CustomError;
use crate::PoolOption;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use anchor_lang::system_program::{Transfer, transfer};

#[account]
pub struct Pool {
    pub title: String,
    pub is_paused: bool,
    pub winning_option: Pubkey,
    pub value: u64,
}

#[event]
pub struct PoolCreated {
    pub pool_account: Pubkey,
    pub title: String,
    pub image_url: String,
    pub description: String,
}

#[event]
pub struct WinnerSet {
    pub pool: Pubkey,
    pub option: Pubkey,
}

#[event]
pub struct PoolStatusUpdated {
    pub is_paused: bool,
    pub pool: Pubkey,
}

pub fn create_pool(
    ctx: Context<CreatePool>,
    title: String,
    title_hash: [u8; 32],
    image_url: String,
    description: String,
) -> Result<()> {
    if image_url.len() > 200 {
        return err!(CustomError::ImageUrlTooLong);
    }
    if description.len() > 200 {
        return err!(CustomError::DescriptionTooLong);
    }

    if hash(&title.as_bytes()).to_bytes() != title_hash {
        return err!(CustomError::TitleDoesNotMatchHash);
    }
    let pool_account = &mut ctx.accounts.pool_account;
    pool_account.title = title.clone();
    pool_account.is_paused = false;
    pool_account.winning_option = Pubkey::default();
    pool_account.value = 0;

    emit!(PoolCreated {
        pool_account: pool_account.key(),
        title,
        image_url,
        description,
    });
    Ok(())
}

pub fn set_is_paused(ctx: Context<UpdatePool>, is_paused: bool) -> Result<()> {
    let pool_account = &mut ctx.accounts.pool_account;
    pool_account.is_paused = is_paused;

    emit!(PoolStatusUpdated {
        is_paused: is_paused,
        pool: pool_account.key(),
    });
    Ok(())
}

pub fn set_winning_option(ctx: Context<UpdatePool>, winning_option: Pubkey) -> Result<()> {
    let pool_account = &mut ctx.accounts.pool_account;
    if !pool_account.is_paused {
        return err!(CustomError::PoolStateIncompatible);
    }
    pool_account.winning_option = winning_option;
    emit!(WinnerSet {
        pool: pool_account.key(),
        option: winning_option,
    });
    Ok(())
}

pub fn fund_pool<'c: 'info, 'info>(
    ctx: Context<'_, '_, 'c, 'info, FundPool<'info>>,
    value: u64,
) -> Result<()> {
    let pool_account = &mut ctx.accounts.pool_account;
    if pool_account.is_paused {
        return err!(CustomError::PoolStateIncompatible);
    }

    if ctx.remaining_accounts.len() == 0 {
        return err!(CustomError::NoPoolOptionAccounts);
    }

    let remaining_accounts = ctx.remaining_accounts;
    let value_per_option = value / remaining_accounts.len() as u64;
    for account in remaining_accounts {
        let mut pool_option = match Account::<PoolOption>::try_from(account) {
            Ok(pool_option) => pool_option,
            Err(_) => return err!(CustomError::InvalidPoolOptionAccount),
        };
        pool_option.value += value_per_option;
        pool_option.exit(&PROGRAM_ID)?;
    }

    // Transfer SOL from caller to pool account
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.sender.to_account_info(),
            to: pool_account.to_account_info(),
        },
    );
    transfer(cpi_context, value)?;

    pool_account.value += value;

    Ok(())
}

#[derive(Accounts)]
pub struct UpdatePool<'info> {
    #[account(mut)]
    pub pool_account: Account<'info, Pool>,
    #[account(mut, address = AUTHORITY_PUBKEY)]
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(title: String, title_hash: [u8; 32])]
pub struct CreatePool<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 1 + 32 + (4 + title.len()) + 8, // 8 bytes for discriminator, 1 byte for bool has_concluded, 32 bytes for Pubkey winning_option, 4 bytes for string + title length bytes, 8 for value
        seeds = [&title_hash, admin.key().as_ref()],
        bump
    )]
    pub pool_account: Account<'info, Pool>,
    #[account(mut, signer)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundPool<'info> {
    #[account(mut)]
    pub pool_account: Account<'info, Pool>,

    pub system_program: Program<'info, System>,

    #[account(mut, signer)]
    pub sender: Signer<'info>,
}
