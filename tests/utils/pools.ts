import {program} from "./constants";
import {getBytesFromHashedStr, getTitleHash} from "./cryptography";
import * as anchor from "@coral-xyz/anchor";

export const derivePoolAccountKey = async (title: string) => {
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
            getBytesFromHashedStr(title),
        ],
        program.programId
    );
    return pda;
};
export const createPool = async (title: string, keypair: anchor.web3.Keypair) => {
    const poolAccountKey = await derivePoolAccountKey(title);
    await program.methods
        .createPool(title, getTitleHash(title))
        .accounts({
            poolAccount: poolAccountKey,
            admin: keypair.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([keypair])
        .rpc();
    const poolAccountData = await program.account.pool.fetch(
        poolAccountKey
    );
    return {
        poolAccountKey,
        poolAccountData,
    };
};

export const pausePool = async (
    isPaused: boolean,
    poolAccountKey: anchor.web3.PublicKey,
    adminWallet: anchor.web3.Keypair
) => program.methods
        .setIsPaused(isPaused)
        .accounts({
            poolAccount: poolAccountKey,
            admin: adminWallet.publicKey,
        })
        .signers([adminWallet])
        .rpc();

export const setWinningOption = async (
    poolAccountKey: anchor.web3.PublicKey,
    optionAccountKey: anchor.web3.PublicKey,
    adminWallet: anchor.web3.Keypair
)=>
    program.methods
        .setWinningOption(optionAccountKey)
        .accounts({
            poolAccount: poolAccountKey,
            admin: adminWallet.publicKey,
        })
        .signers([adminWallet])
        .rpc();