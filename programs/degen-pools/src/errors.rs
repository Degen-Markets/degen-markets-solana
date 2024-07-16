use anchor_lang::prelude::error_code;

#[error_code]
pub enum CustomError {
    #[msg("Title hash does not match title!")]
    TitleDoesNotMatchHash,
    #[msg("Pool option does not match hash!")]
    PoolOptionDoesNotMatchHash,
    #[msg("Pool has concluded!")]
    PoolConcluded,
    #[msg("Entry does not match hash!")]
    EntryDoesNotMatchHash,
}