import * as anchor from "@coral-xyz/anchor";
import { generateKeypair, getLocalAccount } from "./utils/keypairs";
import * as dotenv from "dotenv";
import { getTitleHash } from "./utils/cryptography";
import { program } from "./utils/constants";
import { createPool, derivePoolAccountKey } from "./utils/pools";
import { EventListenerService } from "./utils/events";

dotenv.config();

describe("Pool Creation", () => {
  const listenerService = new EventListenerService();

  afterAll(async () => {
    await listenerService.reset();
  });

  it("should succeed if wallet used is the authority account and events are emitted", async () => {
    const authorityKeypair = await getLocalAccount();
    const title = "Who will win the US Elections?";
    const imageUrl = "https://example.com/image.png";
    const description =
      "This is a pool to guess the winner of the US elections.";

    const listener = listenerService.listen("poolCreated");
    const { poolAccountData, poolAccountKey } = await createPool(
      title,
      authorityKeypair,
      imageUrl,
      description,
    );
    const poolCreatedEvent = await listener;

    expect(poolAccountData.title).toEqual(title);
    expect(poolAccountData.isPaused).toEqual(false);
    expect(poolAccountData.winningOption).toEqual(
      anchor.web3.SystemProgram.programId,
    );
    expect(Number(poolAccountData.value)).toEqual(0);

    expect(poolCreatedEvent.poolAccount).toEqual(poolAccountKey);
    expect(poolCreatedEvent.title).toEqual(title);
    expect(poolCreatedEvent.imageUrl).toEqual(imageUrl);
    expect(poolCreatedEvent.description).toEqual(description);
  });

  it("should fail if tried twice", async () => {
    const authorityKeypair = await getLocalAccount();
    const title = "Which memecoin will have a bigger market cap?";
    const imageUrl = "https://example.com/image.png";
    const description =
      "This is a pool to guess which memecoin will have a bigger market cap.";

    await createPool(title, authorityKeypair, imageUrl, description);

    await expect(async () => {
      await createPool(title, authorityKeypair, imageUrl, description);
    }).rejects.toThrow(/account Address .*? already in use/);
  });

  it("should fail if a random wallet is used to create a pool", async () => {
    const randomWallet = await generateKeypair();
    const title = "Will $MOG go to $2 B market cap?";
    const imageUrl = "https://example.com/image.png";
    const description =
      "This is a pool to guess if $MOG will reach a $2 B market cap.";

    await expect(async () => {
      await createPool(title, randomWallet, imageUrl, description);
    }).rejects.toThrow("An address constraint was violated");
  });

  it("should fail if title does not match the title hash", async () => {
    const authorityKeypair = await getLocalAccount();
    const title = "Tate vs Ansem";
    const imageUrl = "https://example.com/image.png";
    const description = "This is a pool to guess the outcome of Tate vs Ansem.";
    const poolAccountKey = await derivePoolAccountKey(title, authorityKeypair);

    await expect(async () => {
      await program.methods
        .createPool(title, getTitleHash("randomString"), imageUrl, description)
        .accounts([
          poolAccountKey,
          authorityKeypair.publicKey,
          anchor.web3.SystemProgram.programId,
        ])
        .signers([authorityKeypair])
        .rpc();
    }).rejects.toThrow("TitleDoesNotMatchHash");
  });
});
