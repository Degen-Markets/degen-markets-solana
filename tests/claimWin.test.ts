import {generateKeypair, getLocalAccount} from "./utils/keypairs";
import {concludePool, createPool} from "./utils/pools";
import {createOption} from "./utils/options";
import {claimWin, enterPool} from "./utils/entries";
import BN from "bn.js";
import { program } from "./utils/constants";
import {expect} from "chai";

describe('Wins claiming', () => {
   it('should not let a user claim a pool that has not concluded', async () => {
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
           expect(e.message).to.include('EntryAlreadyClaimed');
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
           expect(e.message).to.include('EntryNotOwnedBySigner');
       }
   });
   it('should not let a user claim if they did not win', () => {});
   it('should not let a user claim twice', () => {});
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
   });
});