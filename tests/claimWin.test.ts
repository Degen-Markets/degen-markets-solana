import {generateKeypair, getLocalAccount} from "./utils/keypairs";
import {concludePool, createPool} from "./utils/pools";
import {createOption} from "./utils/options";
import {claimWin, enterPool} from "./utils/entries";
import BN from "bn.js";
import {expect} from "chai";
import {program} from "./utils/constants";

describe('Wins claiming', () => {
   it('should not let a user claim twice', async () => {
       const title = "Will $PEPE market cap flip $DOGE at some point in 2025?";
       const optionTitle = "Yes";
       const adminWallet = await getLocalAccount();
       const user = await generateKeypair();
       const { poolAccountKey } = await createPool(title, adminWallet);
       const { optionAccountKey } = await createOption(optionTitle, adminWallet, poolAccountKey);
       const { entryAccountKey } = await enterPool(poolAccountKey, optionAccountKey, user, new BN(1));

       await concludePool(optionAccountKey, poolAccountKey, adminWallet);

       await claimWin(poolAccountKey, optionAccountKey, entryAccountKey, user);

       try {
           await claimWin(poolAccountKey, optionAccountKey, entryAccountKey, user);
       } catch (e) {
           // account deleted after a successful win claim
           expect(e.message).to.include('AccountNotInitialized');
       }
   });
   it("should not let a user claim using someone else's entry account", async () => {
       const title = "Which will be the biggest meme coin on Solana by the end of May 2025?";
       const optionTitle = "WIF";
       const adminWallet = await getLocalAccount();
       const user = await generateKeypair();
       const user1 = await generateKeypair();
       const { poolAccountKey } = await createPool(title, adminWallet);
       const { optionAccountKey } = await createOption(optionTitle, adminWallet, poolAccountKey);
       const { entryAccountKey } = await enterPool(poolAccountKey, optionAccountKey, user, new BN(1));

       await concludePool(optionAccountKey, poolAccountKey, adminWallet);

       try {
           await claimWin(poolAccountKey, optionAccountKey, entryAccountKey, user1);
       } catch (e) {
           expect(e.message).to.include('EntryNotDerivedFromOptionOrSigner');
       }

       // ensure account is not deleted after failed claim win (no exception is thrown)
       await program.account.entry.fetch(entryAccountKey);
   });
   it('should not let a user claim if they did not win', async () => {
       const title = "Will we get a SOL ETF by the end of 2024?";
       const optionTitle = "No";
       const wrongOptionTitle = "Yes";
       const adminWallet = await getLocalAccount();
       const user = await generateKeypair();
       const user1 = await generateKeypair();
       const user2 = await generateKeypair();
       const { poolAccountKey } = await createPool(title, adminWallet);
       const { optionAccountKey } = await createOption(optionTitle, adminWallet, poolAccountKey);
       const { optionAccountKey: wrongOptionAccountKey } = await createOption(wrongOptionTitle, adminWallet, poolAccountKey);
       const { entryAccountKey } = await enterPool(poolAccountKey, optionAccountKey, user, new BN(1_000));
       const { entryAccountKey: wrongOptionEntryKey} = await enterPool(poolAccountKey, wrongOptionAccountKey, user1, new BN(1_000));
       await enterPool(poolAccountKey, wrongOptionAccountKey, user2, new BN(10_000));

       await concludePool(optionAccountKey, poolAccountKey, adminWallet);

       try {
           await claimWin(poolAccountKey, wrongOptionAccountKey, entryAccountKey, user);
       } catch (e) {
           expect(e.message).to.include('LosingOption');
       }

       try {
           await claimWin(poolAccountKey, optionAccountKey, wrongOptionEntryKey, user);
       } catch (e) {
           expect(e.message).to.include('EntryNotDerivedFromOptionOrSigner');
       }
   });
   it('should not let a user claim a pool that has not concluded', () => {
       // test not needed: it is the same test as checking if the provided option is the pool_account.winning_option
   });
   it("should claim the user's share of the win", async () => {
      const title = "Will ETH market cap over take Bitcoin's market cap?";
      const optionTitle = "Yes";
      const wrongOptionTitle = "No";
      const adminWallet = await getLocalAccount();
      const user = await generateKeypair();
      const user1 = await generateKeypair();
      const user2 = await generateKeypair();
      const { poolAccountKey } = await createPool(title, adminWallet);
      const { optionAccountKey } = await createOption(optionTitle, adminWallet, poolAccountKey);
      const { optionAccountKey: wrongOptionAccountKey } = await createOption(wrongOptionTitle, adminWallet, poolAccountKey);
      const { entryAccountKey } = await enterPool(poolAccountKey, optionAccountKey, user, new BN(3_000));
      const { entryAccountKey: entry1AccountKey} = await enterPool(poolAccountKey, optionAccountKey, user1, new BN(1_000));
      await enterPool(poolAccountKey, wrongOptionAccountKey, user2, new BN(10_000));

      await concludePool(optionAccountKey, poolAccountKey, adminWallet);

      await claimWin(poolAccountKey, optionAccountKey, entryAccountKey, user);
      await claimWin(poolAccountKey, optionAccountKey, entry1AccountKey, user1);

      // claiming a win closes the entry account for the user to refund the lamports
      try {
        await program.account.entry.fetch(entryAccountKey);
      } catch (e) {
        expect(e.message).to.include(`Account does not exist or has no data ${entryAccountKey}`);
      }
   });
});