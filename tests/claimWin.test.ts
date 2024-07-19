import {generateKeypair, getLocalAccount} from "./utils/keypairs";
import {createPool} from "./utils/pools";
import {createOption} from "./utils/options";
import {enterPool} from "./utils/entries";
import BN from "bn.js";
import {program, provider} from "./utils/constants";
import {expect} from "chai";

describe('Wins claiming', () => {
   it('should not let a user claim a pool that has not concluded', () => {});
   it("should not let a user claim using someone else's entry account", () => {});
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

      await program.methods
          .concludePool(optionAccountKey)
          .accounts({
             poolAccount: poolAccountKey,
             admin: adminWallet.publicKey,
          })
          .signers([adminWallet])
          .rpc();

      await program.methods
          .claimWin()
          .accounts({
             poolAccount: poolAccountKey,
             optionAccount: optionAccountKey,
             entryAccount: entryAccountKey,
             winner: user.publicKey,
          })
          .signers([user])
          .rpc();
       await program.methods
           .claimWin()
           .accounts({
               poolAccount: poolAccountKey,
               optionAccount: optionAccountKey,
               entryAccount: entry1AccountKey,
               winner: user1.publicKey,
           })
           .signers([user1])
           .rpc();
   });
});