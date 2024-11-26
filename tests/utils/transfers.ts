import { BN } from "bn.js";
import { program } from "./constants";
import * as anchor from "@coral-xyz/anchor";

export const executeTransaction = async (
  senderWallet: anchor.web3.Keypair,
  receiver: anchor.web3.PublicKey,
  amount: number,
) => {
  const transaction = anchor.web3.Keypair.generate();

  return program.methods
    .executeTransaction(new BN(amount * anchor.web3.LAMPORTS_PER_SOL))
    .accounts({
      transaction: transaction.publicKey,
      sender: senderWallet.publicKey,
      receiver: receiver,
      system_program: anchor.web3.SystemProgram.programId,
    })
    .signers([senderWallet, transaction])
    .rpc();
};
