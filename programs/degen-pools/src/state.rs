use anchor_lang::prelude::*;

#[account]
pub struct Pool {
    pub title: String,
    pub has_concluded: bool,
    pub winning_option: Pubkey,
}

#[account]
pub struct PoolOption {
    pub title: String,
    pub value: u64,
}

#[account]
pub struct Entry {
    pub entrant: Pubkey,
    pub value: u64,
    pub is_claimed: bool,
}
