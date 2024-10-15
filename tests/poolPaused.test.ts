import { getLocalAccount } from "./utils/keypairs";
import { pausePool, createPool } from "./utils/pools";
import { EventListenerService } from "./utils/events";
import { program } from "./utils/constants";

describe("Pool Paused", () => {
  let adminWallet;
  let poolAccountKey;
  const randomChar = Math.random().toString(36).charAt(2);
  const listenerService = new EventListenerService();

  beforeAll(async () => {
    adminWallet = await getLocalAccount();
    const title = `Will DOGE hit $1.5 in 2025 (${randomChar})?`;
    const imageUrl = "https://example.com/image.png";
    const description =
      "This is a pool to guess if DOGE will reach $1 by 2025.";

    const { poolAccountKey: createdPoolAccountKey } = await createPool(
      title,
      adminWallet,
      imageUrl,
      description,
    );

    poolAccountKey = createdPoolAccountKey;
  });

  afterAll(async () => {
    await listenerService.reset();
  });

  it("should emit a poolStatusUpdated event when the pool is paused", async () => {
    const listener = listenerService.listen("poolStatusUpdated");
    await pausePool(true, poolAccountKey, adminWallet);
    const event = await listener;
    expect(event.pool.toString()).toEqual(poolAccountKey.toString());
    expect(event.isPaused).toEqual(true);
  });

  it("should emit a poolStatusUpdated event when the pool is unpaused", async () => {
    const listener = listenerService.listen("poolStatusUpdated");
    await pausePool(false, poolAccountKey, adminWallet);
    const unpausedEvent = await listener;
    expect(unpausedEvent.pool.toString()).toEqual(poolAccountKey.toString());
    expect(unpausedEvent.isPaused).toEqual(false);
  });
});
