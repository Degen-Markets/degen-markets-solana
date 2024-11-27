use anchor_lang::prelude::*;
use crate::CustomError;

#[derive(Accounts)]
pub struct ExecuteTransaction<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    /// CHECK: Only used for SOL transfer
    #[account(mut)]
    pub receiver: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_transaction(ctx: Context<ExecuteTransaction>, amount: u64) -> Result<()> {
    require!(
        ctx.accounts.sender.lamports() >= amount,
        CustomError::InsufficientFunds
    );

    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.sender.to_account_info(),
            to: ctx.accounts.receiver.to_account_info(),
        },
    );

    anchor_lang::system_program::transfer(
        cpi_context,
        amount,
    )?;

    emit!(SOLTransferred {
        sender: ctx.accounts.sender.key(),
        receiver: ctx.accounts.receiver.key(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct SOLTransferred {
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
