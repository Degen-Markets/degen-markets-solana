import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { DegenPools } from "../../target/types/degen_pools";

export const executeTransfer = async (
  program: Program<DegenPools>,
  params: {
    sender: anchor.web3.Keypair;
    receiver: anchor.web3.Keypair;
    amount: number;
  },
): Promise<string> => {
  const { sender, receiver, amount } = params;

  return await program.methods
    .executeTransfer(new BN(amount))
    .accountsStrict({
      sender: sender.publicKey,
      receiver: receiver.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([sender])
    .rpc();
};
