import * as anchor from "@coral-xyz/anchor";
import { generateKeypair, getLocalAccount } from "./utils/keypairs";
import * as dotenv from "dotenv";
import { getTitleHash } from "./utils/cryptography";
import { program } from "./utils/constants";
import { createPool, derivePoolAccountKey } from "./utils/pools";
import { IdlEvents } from "@coral-xyz/anchor";

dotenv.config();

describe("Pool Creation", () => {
  it("should succeed if wallet used is the authority account and events are emitted", async () => {
    const authorityKeypair = await getLocalAccount();
    const title = "Who will win the US Elections?";
    const imageUrl = "https://example.com/image.png";
    const description =
      "This is a pool to guess the winner of the US elections.";

    let listener: ReturnType<(typeof program)["addEventListener"]>;

    const poolCreatedListenerPromise = new Promise<
      IdlEvents<typeof program.idl>["poolCreated"]
    >((res) => {
      listener = program.addEventListener("poolCreated", (event) => {
        res(event);
      });
    });

    const { poolAccountData, poolAccountKey } = await createPool(
      title,
      authorityKeypair,
      imageUrl,
      description,
    );
    const poolCreatedEvent = await poolCreatedListenerPromise;
    await program.removeEventListener(listener);

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

    try {
      await createPool(title, authorityKeypair, imageUrl, description);
    } catch (e) {
      expect(e.message).toContain("custom program error: 0x0");
    }
  });

  it("should fail if a random wallet is used to create a pool", async () => {
    const randomWallet = await generateKeypair();
    const title = "Will $MOG go to $2 B market cap?";
    const imageUrl = "https://example.com/image.png";
    const description =
      "This is a pool to guess if $MOG will reach a $2 B market cap.";

    try {
      await createPool(title, randomWallet, imageUrl, description);
    } catch (e) {
      expect(e.message).toContain("An address constraint was violated");
    }
  });

  it("should fail if title does not match the title hash", async () => {
    const authorityKeypair = await getLocalAccount();
    const title = "Tate vs Ansem";
    const imageUrl = "https://example.com/image.png";
    const description = "This is a pool to guess the outcome of Tate vs Ansem.";
    const poolAccountKey = await derivePoolAccountKey(title, authorityKeypair);

    try {
      await program.methods
        .createPool(title, getTitleHash("randomString"), imageUrl, description)
        .accounts([
          poolAccountKey,
          authorityKeypair.publicKey,
          anchor.web3.SystemProgram.programId,
        ])
        .signers([authorityKeypair])
        .rpc();
    } catch (e) {
      expect(e.message).toContain("TitleDoesNotMatchHash");
    }
  });
});
