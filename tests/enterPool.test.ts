import {generateKeypair, getLocalAccount} from "./utils/keypairs";
import {concludePool, createPool} from "./utils/pools";
import {createOption} from "./utils/options";
import {program, provider} from "./utils/constants";
import BN from 'bn.js';
import {deriveEntryAccountKey, enterPool} from "./utils/entries";
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
        await concludePool(optionAccountKey, poolAccountKey, adminWallet);
        try {
            await enterPool(poolAccountKey, optionAccountKey, userWallet, new BN(100_000));
        } catch (e) {
            expect(e.message).to.include('PoolConcluded');
        }
    });

    it('should not create an Entry if a user does not have enough balance', async () => {
        const userWallet = await generateKeypair();
        const userBalance = await provider.connection.getBalance(userWallet.publicKey);
        const adminWallet = await getLocalAccount();
        const title = "Will $BONK market cap surpass $SHIB in 2025?";
        const optionTitle = "Yes, but only for a few weeks";
        const { poolAccountKey } = await createPool(title, adminWallet);
        const { optionAccountKey } = await createOption(optionTitle, adminWallet, poolAccountKey);
        try {
            await enterPool(poolAccountKey, optionAccountKey, userWallet, new BN(userBalance + 1));
        } catch (e) {
            const entryAccountKey = await deriveEntryAccountKey(optionAccountKey, userWallet);
            try {
                await program.account.entry.fetch(entryAccountKey);
            } catch (e) {
                expect(e.message).to.include('Account does not exist or has no data');
            }
        }
    });
});