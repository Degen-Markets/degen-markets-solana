import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DegenPools } from "../../target/types/degen_pools";
import { PublicKey } from "@solana/web3.js";

export const executeTransaction = async (
  program: Program<DegenPools>,
  params: {
    sender: anchor.web3.Keypair;
    receiver: PublicKey;
    amount: anchor.BN;
  },
): Promise<string> => {
  const { sender, receiver, amount } = params;

  const txSignature = await program.methods
    .executeTransaction(amount)
    .accounts({
      sender: sender.publicKey,
      receiver: receiver,
    })
    .signers([sender])
    .rpc();

  return txSignature;
};
