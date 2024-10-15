import * as anchor from "@coral-xyz/anchor";
import { DegenPools } from "../target/types/degen_pools";
import { generateKeypair, getLocalAccount } from "./utils/keypairs";
import * as dotenv from "dotenv";
import { getOptionTitleHash } from "./utils/cryptography";
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
    const { poolAccountKey, poolAccountData } = await createPool(
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

    const { optionAccountData, optionAccountKey } = await createOption(
      optionTitle,
      authorityKeypair,
      poolAccountKey,
    );

    const optionCreatedEvent = await optionCreatedListenerPromise;
    await program.removeEventListener(listener);
    expect(optionCreatedEvent.poolAccount).toEqual(poolAccountKey);
    expect(optionCreatedEvent.title).toEqual(optionTitle);
    expect(optionCreatedEvent.option).toEqual(optionAccountKey);

    expect(optionAccountData.title).toEqual(optionTitle);

    const optionTwo = "Spain";
    const optionTwoAccountKey = await deriveOptionAccountKey(
      optionTwo,
      poolAccountKey,
    );

    await expect(async () => {
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
    }).rejects.toThrow("PoolOptionDoesNotMatchHash");
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
    await expect(async () => {
      await createOption(optionTitle, kp2, poolAccountKey);
    }).rejects.toThrow("PoolAccountDoesNotMatch");

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
    expect(optionAccountKey.equals(expectedOptionAccountKey)).toBe(true);
  });
});
