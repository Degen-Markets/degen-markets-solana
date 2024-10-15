import { generateKeypair, getLocalAccount } from "./utils/keypairs";
import { pausePool, createPool } from "./utils/pools";
import { createOption } from "./utils/options";
import { provider } from "./utils/constants";
import BN from "bn.js";
import { enterPool } from "./utils/entries";
import { EventListenerService } from "./utils/events";

describe("Pool Entry", () => {
  const listenerService = new EventListenerService();

  afterAll(async () => {
    await listenerService.reset();
  });

  it("should let a user enter on an active pool", async () => {
    const adminWallet = await getLocalAccount();
    const userWallet = await generateKeypair();
    const title = "Will DOGE hit $1 in 2025?";
    const imageUrl = "https://example.com/image.png";
    const description =
      "This is a pool to guess if DOGE will reach $1 by 2025.";
    const { poolAccountKey } = await createPool(
      title,
      adminWallet,
      imageUrl,
      description,
    );
    const optionTitle = "Yes";
    const { optionAccountKey } = await createOption(
      optionTitle,
      adminWallet,
      poolAccountKey,
    );
    const value = new BN(123);
    const listener = listenerService.listen("poolEntered");
    const { entryAccountData } = await enterPool(
      poolAccountKey,
      optionAccountKey,
      userWallet,
      value,
    );
    const event = await listener;
    expect(event.pool.toString()).toEqual(poolAccountKey.toString());
    expect(event.entrant.toString()).toEqual(userWallet.publicKey.toString());
    expect(entryAccountData.value.sub(value)).toEqual(new BN(0));
    expect(entryAccountData.isClaimed).toEqual(false);
  });

  it("should throw a custom error if user tries to enter a pool that is paused", async () => {
    const adminWallet = await getLocalAccount();
    const userWallet = await generateKeypair();
    const title = "Which of these cat memecoins reach $1 Billion first?";
    const optionTitle = "Popcat";
    const imageUrl = "https://example.com/image.png";
    const description =
      "This is a pool to guess which cat memecoin will reach a $1 Billion market cap first.";
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
    await pausePool(true, poolAccountKey, adminWallet);
    await expect(async () => {
      await enterPool(
        poolAccountKey,
        optionAccountKey,
        userWallet,
        new BN(100_000),
      );
    }).rejects.toThrow("PoolStateIncompatible");
  });

  it("should not create an Entry if a user does not have enough balance", async () => {
    const userWallet = await generateKeypair();
    const userBalance = await provider.connection.getBalance(
      userWallet.publicKey,
    );
    const adminWallet = await getLocalAccount();
    const title = "Will $BONK market cap surpass $SHIB in 2025?";
    const optionTitle = "Yes, but only for a few weeks";
    const imageUrl = "https://example.com/image.png";
    const description =
      "This is a pool to guess if $BONK's market cap will surpass $SHIB in 2025.";
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
    await expect(async () => {
      await enterPool(
        poolAccountKey,
        optionAccountKey,
        userWallet,
        new BN(userBalance + 1),
      );
    }).rejects.toThrow("Transfer: insufficient lamports");
  });
});
