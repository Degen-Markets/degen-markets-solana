import { program } from "./constants";
import { getBytesFromHashedStr, getTitleHash } from "./cryptography";
import * as anchor from "@coral-xyz/anchor";
import {IdlEvents} from "@coral-xyz/anchor";

export const derivePoolAccountKey = async (title: string) => {
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [getBytesFromHashedStr(title)],
        program.programId
    );
    return pda;
};

export const createPool = async (
    title: string,
    keypair: anchor.web3.Keypair,
    imageUrl: string,
    description: string
) => {
    if (imageUrl.length > 100) {
        throw new Error("Image URL exceeds the maximum length of 100 characters");
    }

    if (description.length > 200) {
        throw new Error("Description exceeds the maximum length of 200 characters");
    }

    const poolAccountKey = await derivePoolAccountKey(title);

    let listener: ReturnType<typeof program['addEventListener']>;

    const poolCreatedListenerPromise
        = new Promise<IdlEvents<typeof program.idl>['poolCreated']>(res => {
        listener = program.addEventListener('poolCreated', (event) => {
            console.log(event.poolAccount);
            console.log(poolAccountKey);
            if (event.poolAccount === poolAccountKey) {
                res(event);
            }
        });
    });

    await program.methods
        .createPool(title, getTitleHash(title), imageUrl, description)
        .accounts({
            poolAccount: poolAccountKey,
            admin: keypair.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([keypair])
        .rpc();

    const poolAccountData = await program.account.pool.fetch(poolAccountKey);
    const poolCreatedEvent = await poolCreatedListenerPromise;
    await program.removeEventListener(listener);

    return {
        poolAccountKey,
        poolAccountData,
        poolCreatedEvent,
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
) =>
    program.methods
        .setWinningOption(optionAccountKey)
        .accounts({
            poolAccount: poolAccountKey,
            admin: adminWallet.publicKey,
        })
        .signers([adminWallet])
        .rpc();