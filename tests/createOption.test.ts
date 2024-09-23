import * as anchor from "@coral-xyz/anchor";
import { DegenPools } from "../target/types/degen_pools";
import { generateKeypair, getLocalAccount } from "./utils/keypairs";
import * as dotenv from 'dotenv';
import { getOptionTitleHash } from "./utils/cryptography";
import { expect} from "chai";
import { createPool} from "./utils/pools";
import {createOption, deriveOptionAccountKey} from "./utils/options";

dotenv.config();

describe("Option Creation", () => {

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.DegenPools as anchor.Program<DegenPools>;

    it('should succeed if hash is correct & fails with custom error if incorrect', async () => {
        const authorityKeypair = await getLocalAccount();
        const title = "Who will win the 2024 Euros?";
        const imageUrl = "https://example.com/image.png";
        const description = "This is a pool to guess the winner of the US elections.";
        const { poolAccountKey } = await createPool(title, authorityKeypair, imageUrl, description);
        const optionTitle = "England";
        const { optionAccountData } = await createOption(optionTitle, authorityKeypair, poolAccountKey);
        expect(optionAccountData.title).to.eql(optionTitle);

        const optionTwo = "Spain";
        const optionTwoAccountKey = await deriveOptionAccountKey(optionTwo, poolAccountKey);
        try {
            await program.methods.createOption("randomText", getOptionTitleHash(poolAccountKey, optionTwo) as unknown as number[])
                .accountsPartial({
                    optionAccount: optionTwoAccountKey,
                    poolAccount: poolAccountKey,
                    admin: authorityKeypair.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([authorityKeypair])
                .rpc();
        } catch (e) {
            expect(e.message).to.include("PoolOptionDoesNotMatchHash");
        }
    });

    it('does not allow a random wallet to create an option', async() => {
        const randomKeypair = await generateKeypair();
        const authorityKeypair = await getLocalAccount();
        const title = "What was the nature of the Trump assassination?";
        const optionTitle = "Lone Wolf";
        const imageUrl = "https://example.com/image.png";
        const description = "This is a pool to guess the winner of the US elections.";
        const { poolAccountKey } = await createPool(title, authorityKeypair, imageUrl, description)
        try {
            await createOption(optionTitle, randomKeypair, poolAccountKey);
        } catch (e) {
            expect(e.message).to.include('An address constraint was violated');
        }
    });
});