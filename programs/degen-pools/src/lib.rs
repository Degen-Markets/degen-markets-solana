use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use anchor_lang::solana_program::pubkey::Pubkey;

pub use instructions::*;
pub use state::*;
pub use error::CustomError;
pub use events::*;

mod instructions;
mod state;
mod error;
mod events;

declare_id!("7LBg3mDNHNrRzowMdHTHbkso8BPie1xSm4EMLVPadMbu");

#[program]
pub mod degen_pools {
    use super::*;

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
        pool_account.has_concluded = false;
        pool_account.winning_option = Pubkey::default();
        pool_account.value = 0;
        Ok(())
    }

    pub fn create_option(
        ctx: Context<CreateOption>,
        option_title: String,
        option_hash: [u8; 32],
    ) -> Result<()> {
        let mut derived_option_input = ctx.accounts.pool_account.key().to_string().to_owned();
        // Concatenate bytes using the concat method
        derived_option_input.push_str(&option_title);

        let option_hash_hex = hex::encode(option_hash);
        let derived_option_hash = hash(derived_option_input.as_bytes());

        if derived_option_hash.to_bytes() != option_hash {
            return err!(CustomError::PoolOptionDoesNotMatchHash);
        }
        let option_account = &mut ctx.accounts.option_account;
        option_account.title = option_title;
        option_account.value = 0;
        Ok(())
    }

    pub fn enter_pool(
        ctx: Context<EnterPool>,
        value: u64,
    ) -> Result<()> {
        let pool_account = &mut ctx.accounts.pool_account;
        if pool_account.has_concluded {
            return err!(CustomError::PoolConcluded);
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
            value,
        });
        Ok(())
    }

    pub fn conclude_pool(ctx: Context<ConcludePool>, winning_option: Pubkey) -> Result<()> {
        let pool_account = &mut ctx.accounts.pool_account;
        pool_account.has_concluded = true;
        pool_account.winning_option = winning_option;
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
            &[&option_account.key().to_bytes(), &signer_account.key().to_bytes()],
            ctx.program_id
        );

        if derived_entry_account_key != entry_account.key() {
            return err!(CustomError::EntryNotDerivedFromOptionOrSigner)
        }

        entry_account.is_claimed = true;
        let win_share_value = (pool_account.value * 100)/option_account.value;
        let win_amount = (entry_account.value * win_share_value)/100;
        // Transfer SOL from pool to winner
        **ctx.accounts.pool_account.to_account_info().try_borrow_mut_lamports()? -= win_amount;
        **ctx.accounts.winner.to_account_info().try_borrow_mut_lamports()? += win_amount;
        Ok(())
    }

    pub fn close_entry_account(ctx: Context<CloseEntryAccount>) -> Result<()> {
        let signer_account = &ctx.accounts.entrant;
        let option_account = &ctx.accounts.option_account;
        let entry_account = &mut ctx.accounts.entry_account;
        let (derived_entry_account_key, _entry_account_bump) = Pubkey::find_program_address(
            &[&option_account.key().to_bytes(), &signer_account.key().to_bytes()],
            ctx.program_id
        );

        if derived_entry_account_key != entry_account.key() {
            return err!(CustomError::EntryNotDerivedFromOptionOrSigner)
        }

        Ok(())
    }

    pub fn close_option_account(_ctx: Context<CloseOptionAccount>) -> Result<()> {
        Ok(())
    }

    pub fn close_pool_account(_ctx: Context<ClosePoolAccount>) -> Result<()> {
        Ok(())
    }
}
