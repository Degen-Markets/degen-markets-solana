import { generateKeypair, getLocalAccount } from "./utils/keypairs";
import { pausePool, createPool, setWinningOption } from "./utils/pools";
import { createOption } from "./utils/options";
import { claimWin, enterPool } from "./utils/entries";
import BN from "bn.js";
import { program } from "./utils/constants";
import { IdlEvents } from "@coral-xyz/anchor";

describe("Wins claiming and WinClaimed Event", () => {
  it("should not let a user claim twice", async () => {
    const title = "Will $PEPE market cap flip $DOGE at some point in 2025?";
    const imageUrl = "https://example.com/image.png";
    const description =
      "Will $PEPE market cap flip $DOGE at some point in 2025?";
    const optionTitle = "Yes";
    const adminWallet = await getLocalAccount();
    const user = await generateKeypair();
    const { poolAccountKey } = await createPool(
      title,
      adminWallet,
      imageUrl,
      description,
    );
    const { optionAccountKey } = await createOption(
      optionTitle,
      adminWallet,
      poolAccountKey,
    );
    const { entryAccountKey } = await enterPool(
      poolAccountKey,
      optionAccountKey,
      user,
      new BN(1),
    );

    await pausePool(true, poolAccountKey, adminWallet);
    await setWinningOption(poolAccountKey, optionAccountKey, adminWallet);

    await claimWin(poolAccountKey, optionAccountKey, entryAccountKey, user);

    // account deleted after a successful win claim
    await expect(async () => {
      await claimWin(poolAccountKey, optionAccountKey, entryAccountKey, user);
    }).rejects.toThrow("EntryAlreadyClaimed");
  });

  it("should not let a user claim using someone else's entry account", async () => {
    const title =
      "Which will be the biggest meme coin on Solana by the end of May 2025?";
    const imageUrl = "https://example.com/image.png";
    const description =
      "Which will be the biggest meme coin on Solana by the end of May 2025?";
    const optionTitle = "WIF";
    const adminWallet = await getLocalAccount();
    const user = await generateKeypair();
    const user1 = await generateKeypair();

    const { poolAccountKey } = await createPool(
      title,
      adminWallet,
      imageUrl,
      description,
    );
    const { optionAccountKey } = await createOption(
      optionTitle,
      adminWallet,
      poolAccountKey,
    );
    const { entryAccountKey } = await enterPool(
      poolAccountKey,
      optionAccountKey,
      user,
      new BN(1),
    );

    await pausePool(true, poolAccountKey, adminWallet);
    await setWinningOption(poolAccountKey, optionAccountKey, adminWallet);

    await expect(async () => {
      await claimWin(poolAccountKey, optionAccountKey, entryAccountKey, user1);
    }).rejects.toThrow("EntryNotDerivedFromOptionOrSigner");

    // ensure account is not deleted after failed claim win (no exception is thrown)
    await program.account.entry.fetch(entryAccountKey);
  });

  it("should not let a user claim if they did not win", async () => {
    const title = "Will we get a SOL ETF by the end of 2024?";
    const imageUrl = "https://example.com/image.png";
    const description = "Will we get a SOL ETF by the end of 2024?";
    const optionTitle = "No";
    const wrongOptionTitle = "Yes";
    const adminWallet = await getLocalAccount();
    const user = await generateKeypair();
    const user1 = await generateKeypair();
    const user2 = await generateKeypair();
    const { poolAccountKey } = await createPool(
      title,
      adminWallet,
      imageUrl,
      description,
    );
    const { optionAccountKey } = await createOption(
      optionTitle,
      adminWallet,
      poolAccountKey,
    );
    const { optionAccountKey: wrongOptionAccountKey } = await createOption(
      wrongOptionTitle,
      adminWallet,
      poolAccountKey,
    );
    const { entryAccountKey } = await enterPool(
      poolAccountKey,
      optionAccountKey,
      user,
      new BN(1_000),
    );
    const { entryAccountKey: wrongOptionEntryKey } = await enterPool(
      poolAccountKey,
      wrongOptionAccountKey,
      user1,
      new BN(1_000),
    );
    await enterPool(
      poolAccountKey,
      wrongOptionAccountKey,
      user2,
      new BN(10_000),
    );

    await pausePool(true, poolAccountKey, adminWallet);
    await setWinningOption(poolAccountKey, optionAccountKey, adminWallet);

    await expect(async () => {
      await claimWin(
        poolAccountKey,
        wrongOptionAccountKey,
        entryAccountKey,
        user,
      );
    }).rejects.toThrow("LosingOption");

    await expect(async () => {
      await claimWin(
        poolAccountKey,
        optionAccountKey,
        wrongOptionEntryKey,
        user,
      );
    }).rejects.toThrow("EntryNotDerivedFromOptionOrSigner");
  });

  it("should claim the user's share of the win", async () => {
    const title = "Will ETH market cap over take Bitcoin's market cap?";
    const optionTitle = "Yes";
    const wrongOptionTitle = "No";
    const adminWallet = await getLocalAccount();
    const user = await generateKeypair();
    const user1 = await generateKeypair();
    const user2 = await generateKeypair();
    const imageUrl = "https://example.com/image.png";
    const description = "Will ETH market cap over take Bitcoin's market cap?";

    const { poolAccountKey } = await createPool(
      title,
      adminWallet,
      imageUrl,
      description,
    );
    const { optionAccountKey } = await createOption(
      optionTitle,
      adminWallet,
      poolAccountKey,
    );
    const { optionAccountKey: wrongOptionAccountKey } = await createOption(
      wrongOptionTitle,
      adminWallet,
      poolAccountKey,
    );
    const { entryAccountKey } = await enterPool(
      poolAccountKey,
      optionAccountKey,
      user,
      new BN(3_000),
    );
    const { entryAccountKey: entry1AccountKey } = await enterPool(
      poolAccountKey,
      optionAccountKey,
      user1,
      new BN(1_000),
    );
    await enterPool(
      poolAccountKey,
      wrongOptionAccountKey,
      user2,
      new BN(10_000),
    );

    await pausePool(true, poolAccountKey, adminWallet);

    let listener: ReturnType<(typeof program)["addEventListener"]>;

    const winClaimedListenerPromise = new Promise<
      IdlEvents<typeof program.idl>["winClaimed"]
    >((resolve) => {
      listener = program.addEventListener("winClaimed", (event) => {
        resolve(event);
      });
    });

    const winnerSetListenerPromise = new Promise<
      IdlEvents<typeof program.idl>["winnerSet"]
    >((res) => {
      listener = program.addEventListener("winnerSet", (event) => {
        res(event);
      });
    });

    await setWinningOption(poolAccountKey, optionAccountKey, adminWallet);
    const winnerSetEvent = await winnerSetListenerPromise;
    await program.removeEventListener(listener);
    expect(winnerSetEvent.pool.equals(poolAccountKey)).toBe(true);
    expect(winnerSetEvent.option.equals(optionAccountKey)).toBe(true);

    await claimWin(poolAccountKey, optionAccountKey, entryAccountKey, user);
    const winClaimedEvent = await winClaimedListenerPromise;
    expect(winClaimedEvent.entry.toString()).toEqual(
      entryAccountKey.toString(),
    );
    expect(winClaimedEvent.winner.toString()).toEqual(
      user.publicKey.toString(),
    );
    expect(winClaimedEvent.pool.toString()).toEqual(poolAccountKey.toString());

    await claimWin(poolAccountKey, optionAccountKey, entry1AccountKey, user1);

    // claiming a win closes the entry account for the user to refund the lamports
    await expect(async () => {
      await program.account.entry.fetch(entryAccountKey);
    }).rejects.toThrow(
      `Account does not exist or has no data ${entryAccountKey}`,
    );
  });
});
