import * as anchor from "@coral-xyz/anchor";
import { program } from "./constants";
import BN from "bn.js";

export const deriveEntryAccountKey = async (optionAccountKey: anchor.web3.PublicKey, entrant: anchor.web3.Keypair) => {
  const [pda]  = anchor.web3.PublicKey.findProgramAddressSync(
      [
          optionAccountKey.toBuffer(),
          entrant.publicKey.toBuffer()
      ],
      program.programId
  );
    return pda;
};

export const enterPool = async (poolAccountKey: anchor.web3.PublicKey, optionAccountKey: anchor.web3.PublicKey, entrant: anchor.web3.Keypair, value: BN)=> {
  const entryAccountKey = await deriveEntryAccountKey(optionAccountKey, entrant);
  await program.methods
      .enterPool(value)
      .accountsPartial({
          entryAccount: entryAccountKey,
          optionAccount: optionAccountKey,
          poolAccount: poolAccountKey,
          entrant: entrant.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([entrant])
      .rpc();
    const entryAccountData = await program.account.entry.fetch(entryAccountKey);
    return {
        entryAccountKey,
        entryAccountData,
    }
};

export const claimWin = async (
    poolAccountKey: anchor.web3.PublicKey,
    optionAccountKey: anchor.web3.PublicKey,
    entryAccountKey: anchor.web3.PublicKey,
    winnerKeypair: anchor.web3.Keypair
) => {
    await program.methods
        .claimWin()
        .accountsPartial({
            poolAccount: poolAccountKey,
            optionAccount: optionAccountKey,
            entryAccount: entryAccountKey,
            winner: winnerKeypair.publicKey,
        })
        .signers([winnerKeypair])
        .rpc();
};

export const closeEntry = async(
    entryAccountKey: anchor.web3.PublicKey,
    optionAccountKey: anchor.web3.PublicKey,
    entrantKeypair: anchor.web3.Keypair
) => {
    await program
        .methods
        .closeEntryAccount()
        .accounts({
            entryAccount: entryAccountKey,
            entrant: entrantKeypair.publicKey,
            optionAccount: optionAccountKey,
        })
        .signers([entrantKeypair])
        .rpc();
};