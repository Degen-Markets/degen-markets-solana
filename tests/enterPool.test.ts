import { generateKeypair, getLocalAccount } from "./utils/keypairs";
import {createPool} from "./utils/pools";
import {createOption} from "./utils/options";
import {program} from "./utils/constants";
import * as anchor from "@coral-xyz/anchor";
import BN from 'bn.js';
import {deriveEntryAccountKey} from "./utils/entries";
import {expect} from "chai";

describe('Pool Entry', () => {
    it('should let a user enter on an active pool', async () => {
        const adminWallet = await getLocalAccount();
        const userWallet = await generateKeypair();
        const title = "Will DOGE hit $1 in 2025?";
        const { poolAccountKey } = await createPool(title, adminWallet);
        const optionTitle = "Yes";
        const { optionAccountKey } = await createOption(optionTitle, adminWallet, poolAccountKey);
        const entryAccountKey = await deriveEntryAccountKey(optionAccountKey, userWallet);
        const value = new BN(123);
        await program.methods
            .enterPool(value)
            .accountsPartial({
                entryAccount: entryAccountKey,
                optionAccount: optionAccountKey,
                poolAccount: poolAccountKey,
                entrant: userWallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([userWallet])
            .rpc();
        const entryAccountData = await program.account.entry.fetch(entryAccountKey);
        expect(entryAccountData.entrant).to.eql(userWallet.publicKey);
        expect(entryAccountData.value.sub(value)).to.eql(new BN(0));
        expect(entryAccountData.isClaimed).to.eql(false);
    });
});