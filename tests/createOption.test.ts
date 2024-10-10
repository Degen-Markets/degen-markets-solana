import * as anchor from "@coral-xyz/anchor";
import { DegenPools } from "../target/types/degen_pools";
import { generateKeypair, getLocalAccount } from "./utils/keypairs";
import * as dotenv from "dotenv";
import { getOptionTitleHash } from "./utils/cryptography";
import { expect } from "chai";
import { createPool } from "./utils/pools";
import { createOption, deriveOptionAccountKey } from "./utils/options";
import { IdlEvents } from "@coral-xyz/anchor";

dotenv.config();

describe("Option Creation", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.DegenPools as anchor.Program<DegenPools>;

  it("should succeed if hash is correct and events are emitted & fails with custom error if incorrect", async () => {
    const authorityKeypair = await getLocalAccount();
    const title = "Who will win the 2024 Euros?";
    const imageUrl = "https://example.com/image.png";
    const description =
      "This is a pool to guess the winner of the 2024 UEFA European Football Championship (Euro 2024).";
    const { poolAccountKey } = await createPool(
      title,
      authorityKeypair,
      imageUrl,
      description,
    );
    const optionTitle = "England";

    let listener: ReturnType<(typeof program)["addEventListener"]>;

    const optionCreatedListenerPromise = new Promise<
      IdlEvents<typeof program.idl>["optionCreated"]
    >((res) => {
      listener = program.addEventListener("optionCreated", (event) => {
        res(event);
      });
    });

    const { optionAccountData } = await createOption(
      optionTitle,
      authorityKeypair,
      poolAccountKey,
    );

    const optionCreatedEvent = await optionCreatedListenerPromise;
    await program.removeEventListener(listener);

    expect(optionAccountData.title).to.eql(optionTitle);

    const optionTwo = "Spain";
    const optionTwoAccountKey = await deriveOptionAccountKey(
      optionTwo,
      poolAccountKey,
    );
    try {
      await program.methods
        .createOption(
          "randomText",
          getOptionTitleHash(poolAccountKey, optionTwo) as unknown as number[],
        )
        .accountsPartial({
          optionAccount: optionTwoAccountKey,
          poolAccount: poolAccountKey,
          admin: authorityKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([authorityKeypair])
        .rpc();

      expect(optionCreatedEvent.poolAccount).to.eql(poolAccountKey);
      expect(optionCreatedEvent.option).to.eql(optionTwoAccountKey);
      expect(optionCreatedEvent.title).to.eql(optionTitle);
    } catch (e) {
      expect(e.message).to.include("PoolOptionDoesNotMatchHash");
    }
  });

  it("does not allow a random wallet to create an option", async () => {
    const randomKeypair = await generateKeypair();
    const authorityKeypair = await getLocalAccount();
    const title = "What was the nature of the Trump assassination?";
    const optionTitle = "Lone Wolf";
    const imageUrl = "https://example.com/image.png";
    const description =
      "This is a pool to guess the winner of the 2024 UEFA European Football Championship (Euro 2024).";
    const { poolAccountKey } = await createPool(
      title,
      authorityKeypair,
      imageUrl,
      description,
    );
    try {
      await createOption(optionTitle, randomKeypair, poolAccountKey);
    } catch (e) {
      expect(e.message).to.include("An address constraint was violated");
    }
  });

  it("allows only the pool creator to create options", async () => {
    const kp1 = await generateKeypair();
    const kp2 = await generateKeypair();
    const randomSuffix = Math.random().toString(36).substring(7);
    const { poolAccountKey } = await createPool(
      `pool1_${randomSuffix}`,
      kp1,
      "",
      "",
    );
    const optionTitle = `option1_${randomSuffix}`;

    // failure case
    try {
      await createOption(optionTitle, kp2, poolAccountKey);
      throw new Error("This try block should have errored above");
    } catch (e) {
      expect(e.message).to.include("Pool account does not match derived key");
    }

    // success case
    const { optionAccountKey } = await createOption(
      optionTitle,
      kp1,
      poolAccountKey,
    );
    const expectedOptionAccountKey = await deriveOptionAccountKey(
      optionTitle,
      poolAccountKey,
    );
    expect(optionAccountKey.equals(expectedOptionAccountKey)).to.be.true;
  });
});
