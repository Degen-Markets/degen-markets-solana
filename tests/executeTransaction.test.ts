import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DegenPools } from "../target/types/degen_pools";
import { executeTransaction } from "./utils/transfers";

describe("SOL Transfers", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.DegenPools as Program<DegenPools>;

  let sender: anchor.web3.Keypair;
  let receiver: anchor.web3.Keypair;

  beforeAll(async () => {
    sender = anchor.web3.Keypair.generate();
    receiver = anchor.web3.Keypair.generate();

    const signature = await provider.connection.requestAirdrop(
      sender.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(signature);
  });

  it("should transfer SOL between accounts", async () => {
    const initialSenderBalance = await provider.connection.getBalance(
      sender.publicKey,
    );
    const initialReceiverBalance = await provider.connection.getBalance(
      receiver.publicKey,
    );

    const transferAmount = 0.5;

    await executeTransaction(program, {
      sender,
      receiver: receiver.publicKey,
      amount: new anchor.BN(transferAmount * anchor.web3.LAMPORTS_PER_SOL),
    });

    const finalSenderBalance = await provider.connection.getBalance(
      sender.publicKey,
    );
    const finalReceiverBalance = await provider.connection.getBalance(
      receiver.publicKey,
    );

    expect(finalReceiverBalance - initialReceiverBalance).toBe(
      transferAmount * anchor.web3.LAMPORTS_PER_SOL,
    );
    expect(initialSenderBalance - finalSenderBalance).toBe(
      transferAmount * anchor.web3.LAMPORTS_PER_SOL,
    );
  });

  it("should fail when sender has insufficient funds", async () => {
    const poorSender = anchor.web3.Keypair.generate();

    await expect(
      executeTransaction(program, {
        sender: poorSender,
        receiver: receiver.publicKey,
        amount: new anchor.BN(2 * anchor.web3.LAMPORTS_PER_SOL),
      }),
    ).rejects.toThrow(/Insufficient funds/);
  });

  it("should fail when sender is not the signer", async () => {
    const transaction = anchor.web3.Keypair.generate();

    await expect(
      program.methods
        .executeTransaction(new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL))
        .accounts({
          sender: sender.publicKey,
          receiver: receiver.publicKey,
        })
        .signers([transaction])
        .rpc(),
    ).rejects.toThrow(/unknown signer/);
  });

  it("should emit SOLTransferred event", async () => {
    const transferAmount = 0.1;

    const eventPromise = new Promise<{
      sender: anchor.web3.PublicKey;
      receiver: anchor.web3.PublicKey;
      amount: anchor.BN;
      timestamp: anchor.BN;
    }>((resolve) => {
      const listener = program.addEventListener("solTransferred", (event) => {
        program.removeEventListener(listener);
        resolve(event);
      });
    });

    await executeTransaction(program, {
      sender,
      receiver: receiver.publicKey,
      amount: new anchor.BN(transferAmount * anchor.web3.LAMPORTS_PER_SOL),
    });

    const event = await eventPromise;
    expect(event).toMatchObject({
      sender: expect.any(Object),
      receiver: expect.any(Object),
      amount: expect.any(Object),
      timestamp: expect.any(Object),
    });
    expect(event.sender.toString()).toBe(sender.publicKey.toString());
    expect(event.receiver.toString()).toBe(receiver.publicKey.toString());
    expect(event.amount.toNumber()).toBe(
      transferAmount * anchor.web3.LAMPORTS_PER_SOL,
    );
  });
});
