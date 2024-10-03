import { generateKeypair, getLocalAccount } from "./utils/keypairs";
import { pausePool, createPool } from "./utils/pools";
import { expect } from "chai";
import { program } from "./utils/constants";
import { IdlEvents } from "@coral-xyz/anchor";

describe("Pool Paused", () => {
  it("should emit a PoolPaused event when the pool is paused or unpaused", async () => {
    const adminWallet = await getLocalAccount();
    const userWallet = generateKeypair();

    const title = "Will DOGE hit $1 in 2025?";
    const imageUrl = "https://example.com/image.png";
    const description =
      "This is a pool to guess if DOGE will reach $1 by 2025.";

    const { poolAccountKey } = await createPool(
      title,
      adminWallet,
      imageUrl,
      description
    );

    let listener;

    const poolPausedListenerPromise = new Promise<
      IdlEvents<typeof program.idl>["poolPaused"]
    >((resolve) => {
      listener = program.addEventListener("poolPaused", (event) => {
        resolve(event);
      });
    });

    await pausePool(true, poolAccountKey, adminWallet);

    const event = await poolPausedListenerPromise;

    await program.removeEventListener(listener);

    expect(event.pool.toString()).to.eq(poolAccountKey.toString());
    expect(event.isPaused).to.eq(true);

    const unpausePoolListenerPromise = new Promise<
      IdlEvents<typeof program.idl>["poolPaused"]
    >((resolve) => {
      listener = program.addEventListener("PoolPaused", (event) => {
        resolve(event);
      });
    });

    await pausePool(false, poolAccountKey, adminWallet);

    const unpausedEvent = await unpausePoolListenerPromise;

    await program.removeEventListener(listener);

    expect(unpausedEvent.isPaused).to.eq(false);
    expect(unpausedEvent.pool.toString()).to.eq(poolAccountKey.toString());
  });
});
