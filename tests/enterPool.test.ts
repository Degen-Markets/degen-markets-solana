import {generateKeypair, getLocalAccount} from "./utils/keypairs";
import {createPool} from "./utils/pools";
import {createOption} from "./utils/options";
import {program} from "./utils/constants";
import BN from 'bn.js';
import {enterPool} from "./utils/entries";
import {expect} from "chai";

describe('Pool Entry', () => {
    it('should let a user enter on an active pool', async () => {
        const adminWallet = await getLocalAccount();
        const userWallet = await generateKeypair();
        const title = "Will DOGE hit $1 in 2025?";
        const { poolAccountKey } = await createPool(title, adminWallet);
        const optionTitle = "Yes";
        const { optionAccountKey } = await createOption(optionTitle, adminWallet, poolAccountKey);
        const value = new BN(123);
        const { entryAccountKey, entryAccountData } = await enterPool(poolAccountKey, optionAccountKey, userWallet, value);
        expect(entryAccountData.entrant).to.eql(userWallet.publicKey);
        expect(entryAccountData.value.sub(value)).to.eql(new BN(0));
        expect(entryAccountData.isClaimed).to.eql(false);
    });

    it('should throw a custom error if user tries to enter a pool that is concluded', async () => {
        const adminWallet = await getLocalAccount();
        const userWallet = await generateKeypair();
        const title = "Which of these cat memecoins reach $1 Billion first?";
        const optionTitle = "Popcat";
        const { poolAccountKey } = await createPool(title, adminWallet);
        const { optionAccountKey } = await createOption(optionTitle, adminWallet, poolAccountKey);
        await program.methods
            .concludePool(optionAccountKey)
            .accounts({
                poolAccount: poolAccountKey,
                admin: adminWallet.publicKey,
            })
            .signers([adminWallet])
            .rpc();
        try {
            await enterPool(poolAccountKey, optionAccountKey, userWallet, new BN(100_000));
        } catch (e) {
            expect(e.message).to.include('PoolConcluded');
        }
    });
});