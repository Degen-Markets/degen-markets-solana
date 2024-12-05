use crate::constants::AUTHORITY_PUBKEY;
use crate::CustomError;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ExecuteTransfer<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    /// CHECK: This is a safe account as it is the system
    pub system_program: AccountInfo<'info>,
    #[account(mut, address = AUTHORITY_PUBKEY)]
    /// CHECK: The receiver's address is validated against a known authority.
    pub receiver: AccountInfo<'info>,
}

pub fn handle_transfer(ctx: Context<ExecuteTransfer>, amount: u64) -> Result<()> {

    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.sender.to_account_info(),
            to: ctx.accounts.receiver.to_account_info(),
        },
    );

    anchor_lang::system_program::transfer(cpi_context, amount)?;

    emit!(SOLTransferred {
        sender: ctx.accounts.sender.key(),
        amount,
    });

    Ok(())
}

#[event]
pub struct SOLTransferred {
    pub sender: Pubkey,
    pub amount: u64,
}
