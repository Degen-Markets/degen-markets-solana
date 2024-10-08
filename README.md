# Degen Pools Program

## Prerequisites:

Install rust (rustc & cargo come with it), solana-cli & anchor

## Running for the first time:

If you are building the project for the first time, you will have errors deploying it on any network because the generated
keypair for the program will result in a different public key. Therefore, the public key should be replaced in lib.rs.
Here's how to do it:

1. Run `solana-keygen new` to create a local wallet for development
2. Run `anchor keys list`, this will output a new public key for your program
3. Use this new public key and replace it with the key in [lib.rs](https://github.com/Degen-Markets/degen-markets-solana/blob/master/programs/degen-pools/src/lib.rs#L15) and [Anchor.toml](https://github.com/Degen-Markets/degen-markets-solana/blob/master/Anchor.toml) for the network you are deploying to
4. Update the `AUTHORITY_PUBKEY` in [constants.rs](https://github.com/Degen-Markets/degen-markets-solana/blob/master/programs/degen-pools/src/constants.rs#L2) to match your local wallet (`solana address`)
5. Now you can continue with the steps in the [next section](#running-after-the-first-build)

**P.S. If you have generated a new public key, please ensure that this change is not pushed to GitHub**

## Running after the first build:

1. Run a local validator by `solana-test-validator -r` (`-r` flag resets the local network to block 0, otherwise it will continue from where you left)
2. After cloning the repo and running `yarn`, inside the repo run `anchor build`
3. Once done, run `anchor deploy`. Optional: to see logs, run `solana logs` after

## Testing:

1. Complete all the steps in [_Running for the first time_](#running-for-the-first-time).
2. Update the `test.genesis` address in [Anchor.toml](https://github.com/Degen-Markets/degen-markets-solana/blob/e703b02394cbada40d8eeb3c29666d75888720ea/Anchor.toml#L27) to match your program's address (`anchor keys list`).

Once you have done so, run the following command to test:

```bash
anchor test
```

## TODO:

- PDA to store pool creation price
- PoolCustody account to store SOL, creator
- burnPool function; transfer SOL to admin key
