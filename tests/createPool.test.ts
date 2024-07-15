import * as anchor from "@coral-xyz/anchor";
import {DegenPools} from "../target/types/degen_pools";
import {generateKeypair, getLocalAccount} from "./utils/keypairs";
import * as dotenv from 'dotenv';
import {expect} from "chai";
import {derivePoolAccountKey} from "./utils/programAccountDerivation";
import {getTitleHash} from "./utils/cryptography";

dotenv.config();

describe("Pool Creation", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.DegenPools as anchor.Program<DegenPools>;

    it('should succeed if wallet used is the authority account', async () => {
        const authorityKeypair = await getLocalAccount();
        const title = "Who will win the US Elections?";
        const poolAccountKey = await derivePoolAccountKey(title);
        await program.methods
            .createPool(title, getTitleHash(title))
            .accounts([
                 poolAccountKey,
                 authorityKeypair.publicKey,
                 anchor.web3.SystemProgram.programId,
            ])
            .signers([authorityKeypair])
            .rpc();
        const account = await program.account.pool.fetch(
            poolAccountKey
        );
        expect(account).to.eql({
            title: 'Who will win the US Elections?',
            hasConcluded: false,
            winningOption: anchor.web3.SystemProgram.programId,
        });
    });

    it('should fail if tried twice', async () => {
        const authorityKeypair = await getLocalAccount();
        const title = "Which memecoin will have a bigger market cap?";
        const poolAccountKey = await derivePoolAccountKey(title);
        await program.methods.createPool(title, getTitleHash(title))
            .accounts([
                poolAccountKey,
                authorityKeypair.publicKey,
                anchor.web3.SystemProgram.programId,
            ])
            .signers([authorityKeypair])
            .rpc();

        try {
            await program.methods.createPool(title, getTitleHash(title))
                .accounts([
                    poolAccountKey,
                    authorityKeypair.publicKey,
                    anchor.web3.SystemProgram.programId,
                ])
                .signers([authorityKeypair])
                .rpc();
        } catch (e) {
            expect(e.message).to.include('custom program error: 0x0');
        }
    });

    it('should fail if a random wallet is used to create a pool', async () => {
        const randomWallet = await generateKeypair();
        const title = "Will $MOG go to $2 B market cap?";
        const poolAccountKey = await derivePoolAccountKey(title);
        try {
            await program.methods.createPool(title, getTitleHash(title))
                .accounts({
                    poolAccount: poolAccountKey,
                    wallet: randomWallet.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([randomWallet])
                .rpc();
        } catch (e) {
            expect(e.message).to.include('An address constraint was violated');
        }
    });

    it('should fail if title does not match the title hash', async () => {
        const authorityKeypair = await getLocalAccount();
        const title = "Tate vs Ansem";
        const poolAccountKey = await derivePoolAccountKey(title);

        try {
            await program.methods.createPool(title, getTitleHash("randomString"))
                .accounts([
                    poolAccountKey,
                    authorityKeypair.publicKey,
                    anchor.web3.SystemProgram.programId,
                ])
                .signers([authorityKeypair])
                .rpc();
        } catch (e) {
            expect(e.message).to.include('TitleDoesNotMatchHash');
        }
    });
});