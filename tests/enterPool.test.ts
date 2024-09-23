import {generateKeypair, getLocalAccount} from "./utils/keypairs";
import {pausePool, createPool} from "./utils/pools";
import {createOption} from "./utils/options";
import {program, provider} from "./utils/constants";
import BN from 'bn.js';
import {deriveEntryAccountKey, enterPool} from "./utils/entries";
import {expect} from "chai";
import { IdlEvents } from "@coral-xyz/anchor";

describe('Pool Entry', () => {
    it('should let a user enter on an active pool', async () => {
        const adminWallet = await getLocalAccount();
        const userWallet = await generateKeypair();
        const title = "Will DOGE hit $1 in 2025?";
        const imageUrl = "https://example.com/image.png";
        const description = "This is a pool to guess the winner of the US elections.";
        const { poolAccountKey } = await createPool(title, adminWallet, imageUrl, description);
        const optionTitle = "Yes";
        const { optionAccountKey } = await createOption(optionTitle, adminWallet, poolAccountKey);
        const value = new BN(123);
        let listener: ReturnType<typeof program['addEventListener']>;
        const poolEnteredListenerPromise 
          = new Promise<IdlEvents<typeof program.idl>['poolEntered']>(res => {
            listener = program.addEventListener('poolEntered', (event) => {
              res(event);
            });
          });
        const { entryAccountData } = await enterPool(poolAccountKey, optionAccountKey, userWallet, value);
        const event = await poolEnteredListenerPromise;
        await program.removeEventListener(listener);
        
        expect(event.pool.toString()).to.eq(poolAccountKey.toString())
        expect(event.entrant.toString()).to.eq(userWallet.publicKey.toString());
        expect(entryAccountData.value.sub(value)).to.eql(new BN(0));
        expect(entryAccountData.isClaimed).to.eql(false);
    });

    it('should throw a custom error if user tries to enter a pool that is paused', async () => {
        const adminWallet = await getLocalAccount();
        const userWallet = await generateKeypair();
        const title = "Which of these cat memecoins reach $1 Billion first?";
        const optionTitle = "Popcat";
        const imageUrl = "https://example.com/image.png";
        const description = "This is a pool to guess the winner of the US elections.";
        const { poolAccountKey } = await createPool(title, adminWallet, imageUrl, description);
        const { optionAccountKey } = await createOption(optionTitle, adminWallet, poolAccountKey);
        await pausePool(true, poolAccountKey, adminWallet);
        try {
            await enterPool(poolAccountKey, optionAccountKey, userWallet, new BN(100_000));
        } catch (e) {
            expect(e.message).to.include('PoolStateIncompatible');
        }
    });

    it('should not create an Entry if a user does not have enough balance', async () => {
        const userWallet = await generateKeypair();
        const userBalance = await provider.connection.getBalance(userWallet.publicKey);
        const adminWallet = await getLocalAccount();
        const title = "Will $BONK market cap surpass $SHIB in 2025?";
        const optionTitle = "Yes, but only for a few weeks";
        const imageUrl = "https://example.com/image.png";
        const description = "This is a pool to guess the winner of the US elections.";
        const { poolAccountKey } = await createPool(title, adminWallet, imageUrl, description);
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
