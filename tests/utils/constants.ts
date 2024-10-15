import * as anchor from "@coral-xyz/anchor";
import { DegenPools } from "../../target/types/degen_pools";

export const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
export const program = anchor.workspace
  .DegenPools as anchor.Program<DegenPools>;

export type DegenPoolsEvents = anchor.IdlEvents<DegenPools>;
