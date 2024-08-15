use anchor_lang::prelude::*;

#[account]
pub struct Pool {
    pub title: String,
    pub is_paused: bool,
    pub winning_option: Pubkey,
    pub value: u64,
}

#[account]
pub struct PoolOption {
    pub title: String,
    pub value: u64,
}

#[account]
pub struct Entry {
    pub value: u64,
    pub is_claimed: bool,
}
