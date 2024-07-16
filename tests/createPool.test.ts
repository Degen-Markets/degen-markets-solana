import * as anchor from "@coral-xyz/anchor";
import {generateKeypair, getLocalAccount} from "./utils/keypairs";
import * as dotenv from 'dotenv';
import {expect} from "chai";
import {getTitleHash} from "./utils/cryptography";
import {program} from "./utils/constants";
import {createPool, derivePoolAccountKey} from "./utils/pools";

dotenv.config();

describe("Pool Creation", () => {
    it('should succeed if wallet used is the authority account', async () => {
        const authorityKeypair = await getLocalAccount();
        const title = "Who will win the US Elections?";
        const { poolAccountData } = await createPool(title, authorityKeypair);
        expect(poolAccountData).to.eql({
            title: 'Who will win the US Elections?',
            hasConcluded: false,
            winningOption: anchor.web3.SystemProgram.programId, // default option
        });
    });

    it('should fail if tried twice', async () => {
        const authorityKeypair = await getLocalAccount();
        const title = "Which memecoin will have a bigger market cap?";
        await createPool(title, authorityKeypair);

        try {
            await createPool(title, authorityKeypair);
        } catch (e) {
            expect(e.message).to.include('custom program error: 0x0');
        }
    });

    it('should fail if a random wallet is used to create a pool', async () => {
        const randomWallet = await generateKeypair();
        const title = "Will $MOG go to $2 B market cap?";
        try {
            await createPool(title, randomWallet);
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