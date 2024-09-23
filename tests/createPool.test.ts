import * as anchor from "@coral-xyz/anchor";
import { generateKeypair, getLocalAccount } from "./utils/keypairs";
import * as dotenv from 'dotenv';
import { expect } from "chai";
import { getTitleHash } from "./utils/cryptography";
import { program } from "./utils/constants";
import { createPool, derivePoolAccountKey } from "./utils/pools";

dotenv.config();

describe("Pool Creation", () => {
    it('should succeed if wallet used is the authority account and events are emitted', async () => {
        const authorityKeypair = await getLocalAccount();
        const title = "Who will win the US Elections?";
        const imageUrl = "https://example.com/image.png";
        const description = "This is a pool to guess the winner of the US elections.";

        const { poolAccountData, poolCreatedEvent, poolAccountKey } = await createPool(
            title, authorityKeypair, imageUrl, description
        );

        expect(poolAccountData.title).to.eql(title);
        expect(poolAccountData.isPaused).to.eql(false);
        expect(poolAccountData.winningOption).to.eql(anchor.web3.SystemProgram.programId);
        expect(Number(poolAccountData.value)).to.eql(0);

        expect(poolCreatedEvent.poolAccount).to.eql(poolAccountKey);
        expect(poolCreatedEvent.title).to.eql(title);
        expect(poolCreatedEvent.imageUrl).to.eql(imageUrl);
        expect(poolCreatedEvent.description).to.eql(description);
    });

    it('should fail if tried twice', async () => {
        const authorityKeypair = await getLocalAccount();
        const title = "Which memecoin will have a bigger market cap?";
        const imageUrl = "https://example.com/image.png";
        const description = "This is a pool to guess the winner of the US elections.";

        await createPool(title, authorityKeypair, imageUrl, description);

        try {
            await createPool(title, authorityKeypair, imageUrl, description);
        } catch (e) {
            expect(e.message).to.include('custom program error: 0x0');
        }
    });

    it('should fail if a random wallet is used to create a pool', async () => {
        const randomWallet = await generateKeypair();
        const title = "Will $MOG go to $2 B market cap?";
        const imageUrl = "https://example.com/image.png";
        const description = "This is a pool to guess the winner of the US elections.";

        try {
            await createPool(title, randomWallet, imageUrl, description);
        } catch (e) {
            expect(e.message).to.include('An address constraint was violated');
        }
    });

    it('should fail if title does not match the title hash', async () => {
        const authorityKeypair = await getLocalAccount();
        const title = "Tate vs Ansem";
        const imageUrl = "https://example.com/image.png";
        const description = "This is a pool to guess the winner of the US elections.";
        const poolAccountKey = await derivePoolAccountKey(title);

        try {
            await program.methods.createPool(title, getTitleHash("randomString"), imageUrl, description)
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
