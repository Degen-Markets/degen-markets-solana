use anchor_lang::prelude::error_code;

#[error_code]
pub enum CustomError {
    #[msg("Title hash does not match title!")]
    TitleDoesNotMatchHash,
    #[msg("Pool option does not match hash!")]
    PoolOptionDoesNotMatchHash,
    #[msg("Pool is in an incompatible state!")]
    PoolStateIncompatible,
    #[msg("Entry already claimed!")]
    EntryAlreadyClaimed,
    #[msg("Entry did not win")]
    LosingOption,
    #[msg("This entry was not derived from the winning option or the signer")]
    EntryNotDerivedFromOptionOrSigner,
    #[msg("The image URL is too long. Maximum length is 200 characters.")]
    ImageUrlTooLong,
    #[msg("The description is too long. Maximum length is 200 characters.")]
    DescriptionTooLong,
}