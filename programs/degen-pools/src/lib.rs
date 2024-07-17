use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

pub use instructions::*;
pub use state::*;
pub use errors::CustomError;

mod instructions;
mod state;
mod errors;

declare_id!("Dxu2ai95cXLi4xUK5hdyz2zC7xvGpThiQo9822MBX4iA");

#[program]
pub mod degen_pools {
    use super::*;

    pub fn create_pool(
        ctx: Context<CreatePool>,
        title: String,
        title_hash: [u8; 32],
    ) -> Result<()> {
        msg!("Creating pool for {}", title);
        if hash(&title.as_bytes()).to_bytes() != title_hash {
            return err!(CustomError::TitleDoesNotMatchHash);
        }
        let pool_account = &mut ctx.accounts.pool_account;
        msg!("Received key {} for pool account", pool_account.key());
        pool_account.title = title;
        pool_account.has_concluded = false;
        pool_account.winning_option = Pubkey::default();
        Ok(())
    }

    pub fn create_option(
        ctx: Context<CreateOption>,
        option_title: String,
        option_hash: [u8; 32],
    ) -> Result<()> {
        msg!("Creating option for {}", option_title);
        let mut derived_option_input = ctx.accounts.pool_account.key().to_string().to_owned();
        // Concatenate bytes using the concat method
        derived_option_input.push_str(&option_title);

        let option_hash_hex = hex::encode(option_hash);
        let derived_option_hash = hash(derived_option_input.as_bytes());

        msg!("Comparing derived hash {} with option_hash input: {}", derived_option_hash, option_hash_hex);
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
        let pool_account = &ctx.accounts.pool_account;
        if pool_account.has_concluded {
            return err!(CustomError::PoolConcluded);
        }
        let entry_account = &mut ctx.accounts.entry_account;
        entry_account.entrant = *ctx.accounts.entrant.key;
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

        Ok(())
    }

    pub fn conclude_pool(ctx: Context<ConcludePool>, winning_option: Pubkey) -> Result<()> {
        let pool_account = &mut ctx.accounts.pool_account;
        pool_account.has_concluded = true;
        pool_account.winning_option = winning_option;
        Ok(())
    }

    pub fn claim_win(ctx: Context<ClaimWin>) -> Result<()> {

    }
}
