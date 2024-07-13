import * as anchor from "@coral-xyz/anchor";
import {DegenPools} from "../target/types/degen_pools";
import { getLocalAccount } from "./utils/keypairs";
import * as dotenv from 'dotenv';
import {deriveOptionAccountKey, derivePoolAccountKey} from "./utils/programAccountDerivation";
import {getOptionTitleHash, getTitleHash} from "./utils/cryptography";
import {expect} from "chai";

dotenv.config();

describe("Option Creation", () => {

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.DegenPools as anchor.Program<DegenPools>;

    it('should succeed if hash is correct & fails with custom error if incorrect', async () => {
        const authorityKeypair = await getLocalAccount();
        const title = "Who will win the 2024 Euros?";
        const poolAccountKey = await derivePoolAccountKey(title);
        await program.methods.createPool(title, getTitleHash(title))
            .accounts([
                poolAccountKey,
                authorityKeypair.publicKey,
                anchor.web3.SystemProgram.programId,
            ])
            .signers([authorityKeypair])
            .rpc();
        const optionTitle = "England";
        const optionAccountKey = await deriveOptionAccountKey(optionTitle, poolAccountKey);
        await program.methods.createOption(optionTitle, getOptionTitleHash(poolAccountKey, optionTitle) as unknown as number[])
            .accounts({
                optionAccount: optionAccountKey,
                poolAccount: poolAccountKey,
                wallet: authorityKeypair.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([authorityKeypair])
            .rpc();
        const account = await program.account.poolOption.fetch(optionAccountKey);
        expect(account.title).to.eql(optionTitle);

        const optionTwo = "Spain";
        const optionTwoAccountKey = await deriveOptionAccountKey(optionTwo, poolAccountKey);
        try {
            await program.methods.createOption("randomText", getOptionTitleHash(poolAccountKey, optionTwo) as unknown as number[])
                .accounts({
                    optionAccount: optionTwoAccountKey,
                    poolAccount: poolAccountKey,
                    wallet: authorityKeypair.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([authorityKeypair])
                .rpc();
        } catch (e) {
            expect(e.message).to.include("PoolOptionDoesNotMatchHash");
        }
    });
});