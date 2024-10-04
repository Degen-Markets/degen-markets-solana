import { getLocalAccount } from "./utils/keypairs";
import { pausePool, createPool } from "./utils/pools";
import { expect } from "chai";
import { program } from "./utils/constants";
import { IdlEvents } from "@coral-xyz/anchor";

describe("Pool Paused", () => {
  let adminWallet;
  let poolAccountKey;
  const randomChar = Math.random().toString(36).charAt(2);
  before(async () => {
    adminWallet = await getLocalAccount();
    const title = `Will DOGE hit $1.5 in 2025 (${randomChar})?`;
    const imageUrl = "https://example.com/image.png";
    const description =
      "This is a pool to guess if DOGE will reach $1 by 2025.";

    const { poolAccountKey: createdPoolAccountKey } = await createPool(
      title,
      adminWallet,
      imageUrl,
      description
    );

    poolAccountKey = createdPoolAccountKey;
  });

  it("should emit a poolStatusUpdated event when the pool is paused", async () => {
    let listener;

    const poolPausedListenerPromise = new Promise<
      IdlEvents<typeof program.idl>["poolStatusUpdated"]
    >((resolve) => {
      listener = program.addEventListener("poolStatusUpdated", (event) => {
        resolve(event);
      });
    });

    await pausePool(true, poolAccountKey, adminWallet);

    const event = await poolPausedListenerPromise;
    await program.removeEventListener(listener);

    expect(event.pool.toString()).to.eq(poolAccountKey.toString());
    expect(event.isPaused).to.eq(true);
  });

  it("should emit a poolStatusUpdated event when the pool is unpaused", async () => {
    let listener;

    const unpausePoolListenerPromise = new Promise<
      IdlEvents<typeof program.idl>["poolStatusUpdated"]
    >((resolve) => {
      listener = program.addEventListener("poolStatusUpdated", (event) => {
        resolve(event);
      });
    });

    await pausePool(false, poolAccountKey, adminWallet);

    const unpausedEvent = await unpausePoolListenerPromise;
    await program.removeEventListener(listener);

    expect(unpausedEvent.pool.toString()).to.eq(poolAccountKey.toString());
    expect(unpausedEvent.isPaused).to.eq(false);
  });
});
