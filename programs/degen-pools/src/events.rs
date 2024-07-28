use anchor_lang::prelude::*;

#[event]
pub struct PoolEntered {
    pub pool: Pubkey,
    pub option: Pubkey,
    pub entry: Pubkey,
    pub value: u64,
}