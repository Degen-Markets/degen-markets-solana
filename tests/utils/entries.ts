import * as anchor from "@coral-xyz/anchor";
import {getBytesFromHashedStr} from "./cryptography";
import {program} from "./constants";

export const deriveEntryAccountKey = async (optionAccountKey: anchor.web3.PublicKey, entrant: anchor.web3.Keypair) => {
  const [pda]  = anchor.web3.PublicKey.findProgramAddressSync(
      [
          optionAccountKey.toBuffer(),
          entrant.publicKey.toBuffer()
      ],
      program.programId
  );
    console.log(`Derived pool account is ${pda}`);
    return pda;
};