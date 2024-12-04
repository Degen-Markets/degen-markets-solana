import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DegenPools } from "../target/types/degen_pools";
import { executeTransfer } from "./utils/transfers";
import { getLocalAccount } from "./utils/keypairs";

describe("executeTransfer", () => {
  let program: Program<DegenPools>;
  let sender: anchor.web3.Keypair;
  let receiver: anchor.web3.Keypair;
  const transferAmount = 1000;

  const checkBalances = async (
    params: { sender: anchor.web3.Keypair; receiver: anchor.web3.Keypair },
    amount: number,
  ) => {
    const initialSenderBalance = await program.provider.connection.getBalance(
      params.sender.publicKey,
    );
    const initialReceiverBalance = await program.provider.connection.getBalance(
      params.receiver.publicKey,
    );

    const txSignature = await executeTransfer(program, {
      sender: params.sender,
      receiver: params.receiver,
      amount,
    });

    const finalSenderBalance = await program.provider.connection.getBalance(
      params.sender.publicKey,
    );
    const finalReceiverBalance = await program.provider.connection.getBalance(
      params.receiver.publicKey,
    );

    expect(txSignature).toBeDefined();
    expect(finalSenderBalance).toBeCloseTo(initialSenderBalance - amount, -6);
    expect(finalReceiverBalance).toBeCloseTo(
      initialReceiverBalance + amount,
      -6,
    );
  };

  beforeAll(async () => {
    const provider = anchor.AnchorProvider.local();
    anchor.setProvider(provider);
    program = anchor.workspace.DegenPools as Program<DegenPools>;

    sender = anchor.web3.Keypair.generate();
    receiver = await getLocalAccount();

    const airdropSignature = await provider.connection.requestAirdrop(
      sender.publicKey,
      anchor.web3.LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(airdropSignature);
  });

  it("should execute a transfer successfully", async () => {
    const params = { sender, receiver, amount: transferAmount };
    await checkBalances(params, transferAmount);
  });

  it("should throw an error for zero transfer amount", async () => {
    const params = { sender, receiver, amount: 0 };
    await expect(executeTransfer(program, params)).rejects.toThrow();
  });

  it("should throw an error for insufficient funds", async () => {
    const params = {
      sender,
      receiver,
      amount: anchor.web3.LAMPORTS_PER_SOL * 2,
    };
    await expect(executeTransfer(program, params)).rejects.toThrow();
  });

  it("should fail gracefully on incorrect signer", async () => {
    const incorrectSigner = anchor.web3.Keypair.generate(); // Unauthorized signer
    const params = {
      sender: incorrectSigner,
      receiver,
      amount: transferAmount,
    };
    await expect(executeTransfer(program, params)).rejects.toThrow();
  });
});
