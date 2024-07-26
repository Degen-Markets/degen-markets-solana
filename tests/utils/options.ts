import * as anchor from "@coral-xyz/anchor";
import {getBytesFromHashedStr, getOptionTitleHash} from "./cryptography";
import {program} from "./constants";

export const deriveOptionAccountKey = async (title: string, poolAccountKey: anchor.web3.PublicKey) => {
    const [pda, _] = anchor.web3.PublicKey.findProgramAddressSync(
        [
            getBytesFromHashedStr(poolAccountKey.toString().concat(title)),
        ],
        program.programId
    );
    return pda;
};

export const createOption = async (optionTitle: string, keypair: anchor.web3.Keypair, poolAccountKey: anchor.web3.PublicKey) => {
    const optionAccountKey = await deriveOptionAccountKey(optionTitle, poolAccountKey);
    await program.methods.createOption(optionTitle, getOptionTitleHash(poolAccountKey, optionTitle) as unknown as number[])
        .accountsPartial({
            optionAccount: optionAccountKey,
            poolAccount: poolAccountKey,
            admin: keypair.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId
        })
        .signers([keypair])
        .rpc();
    const optionAccountData = await program.account.poolOption.fetch(optionAccountKey);
    return {
        optionAccountKey,
        optionAccountData
    }
};