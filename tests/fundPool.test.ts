import { createPool, fundPool } from "./utils/pools";
import { getLocalAccount } from "./utils/keypairs";
import { pausePool } from "./utils/pools";
import { BN } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { createOption } from "./utils/options";
import { program } from "./utils/constants";

describe("fundPool", () => {
  let adminWallet: anchor.web3.Keypair;
  let poolAccountKey: anchor.web3.PublicKey;

  beforeAll(async () => {
    adminWallet = await getLocalAccount();
  });

  beforeEach(async () => {
    const poolName = crypto.randomUUID();
    const createdPoolResult = await createPool(
      poolName,
      adminWallet,
      "https://example.com/image.png",
      "This is a pool to guess if DOGE will reach $1 by 2025.",
    );
    poolAccountKey = createdPoolResult.poolAccountKey;
  });
  it("throws an error if the pool is paused", async () => {
    await pausePool(true, poolAccountKey, adminWallet);
    await expect(fundPool(new BN(100), poolAccountKey, [])).rejects.toThrow(
      "PoolStateIncompatible",
    );
  });

  it("throws an error if no pool option accounts are provided", async () => {
    await expect(fundPool(new BN(100), poolAccountKey, [])).rejects.toThrow(
      "NoPoolOptionAccounts",
    );
  });

  it("throws an error if the remaining accounts are not pool options", async () => {
    const optionTitle = crypto.randomUUID();
    const { optionAccountKey } = await createOption(
      optionTitle,
      adminWallet,
      poolAccountKey,
    );
    const randomAccount1 = anchor.web3.Keypair.generate();
    await expect(
      fundPool(new BN(100), poolAccountKey, [
        { pubkey: optionAccountKey, isSigner: false, isWritable: true },
        { pubkey: randomAccount1.publicKey, isSigner: false, isWritable: true },
      ]),
    ).rejects.toThrow("InvalidPoolOptionAccount");
  });

  it("funds the pool with the correct value per option", async () => {
    const { optionAccountKey: option1AccountKey } = await createOption(
      crypto.randomUUID(),
      adminWallet,
      poolAccountKey,
    );
    const option1InitBal = (
      await program.account.poolOption.fetch(option1AccountKey)
    ).value;
    expect(option1InitBal.eqn(0)).toBe(true);

    const { optionAccountKey: option2AccountKey } = await createOption(
      crypto.randomUUID(),
      adminWallet,
      poolAccountKey,
    );
    const option2InitBal = (
      await program.account.poolOption.fetch(option2AccountKey)
    ).value;
    expect(option2InitBal.eqn(0)).toBe(true);

    const { optionAccountKey: option3AccountKey } = await createOption(
      crypto.randomUUID(),
      adminWallet,
      poolAccountKey,
    );
    const option3InitBal = (
      await program.account.poolOption.fetch(option3AccountKey)
    ).value;
    expect(option3InitBal.eqn(0)).toBe(true);

    const preFundPoolValue = (await program.account.pool.fetch(poolAccountKey))
      .value;
    expect(preFundPoolValue.eqn(0)).toBe(true);

    const fundAmt = new BN(100);
    const optionsToFund = [option1AccountKey, option2AccountKey];
    await fundPool(
      fundAmt,
      poolAccountKey,
      optionsToFund.map((optionKey) => ({
        pubkey: optionKey,
        isSigner: false,
        isWritable: true,
      })),
    );

    const postFundPoolValue = (await program.account.pool.fetch(poolAccountKey))
      .value;
    expect(postFundPoolValue.eq(fundAmt)).toBe(true);

    const perOptionFundAmt = fundAmt.divn(optionsToFund.length);
    const option1PostFundBal = (
      await program.account.poolOption.fetch(option1AccountKey)
    ).value;
    expect(option1PostFundBal.eq(perOptionFundAmt)).toBe(true);

    const option2PostFundBal = (
      await program.account.poolOption.fetch(option2AccountKey)
    ).value;
    expect(option2PostFundBal.eq(perOptionFundAmt)).toBe(true);

    // option 3 was not funded
    const option3PostFundBal = (
      await program.account.poolOption.fetch(option3AccountKey)
    ).value;
    expect(option3PostFundBal.eq(option3InitBal)).toBe(true);
  });

  it("transfers the correct amount of lamports to the pool account", async () => {
    const { optionAccountKey } = await createOption(
      crypto.randomUUID(),
      adminWallet,
      poolAccountKey,
    );
    const preFundPoolLamports =
      await program.provider.connection.getBalance(poolAccountKey);

    const preFundSenderLamports = await program.provider.connection.getBalance(
      adminWallet.publicKey,
    );
    const fundAmt = new BN(100);
    await fundPool(fundAmt, poolAccountKey, [
      { pubkey: optionAccountKey, isSigner: false, isWritable: true },
    ]);

    const postFundPoolLamports =
      await program.provider.connection.getBalance(poolAccountKey);
    expect(postFundPoolLamports).toEqual(
      fundAmt.addn(preFundPoolLamports).toNumber(),
    );
    const postFundSenderLamports = await program.provider.connection.getBalance(
      adminWallet.publicKey,
    );
    expect(preFundSenderLamports - postFundSenderLamports).toBeGreaterThan(
      fundAmt.toNumber(),
    );
  });
});
