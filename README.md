# Prerequisites:
Install rust (rustc & cargo come with it), solana-cli & anchor

# Running for the first time:
If you are building the project for the first time, you will have errors deploying it on any network because the generated
keypair for the program will result in a different public key. Therefore, the public key should be replaced in lib.rs.
Here's how to do it:

1. Run `solana-keygen new` to create a local wallet for development
2. Run `anchor keys list`, this will output a new public key for your program
2. Use this new public key and replace it with the key in [lib.rs](https://github.com/Degen-Markets/degen-markets-solana/blob/master/programs/degen-pools/src/lib.rs#L15)
3. Use this new public key and replace it in [Anchor.toml](https://github.com/Degen-Markets/degen-markets-solana/blob/master/Anchor.toml) for the network you are deploying to
4. Now you can continue with the steps in the [next section](#running-after-the-first-build)

**P.S. If you have generated a new public key, please ensure that this change is not pushed to GitHub**

# Running after the first build:

1. Run a local validator by `solana-test-validator -r` (`-r` flag resets the local network to block 0, otherwise it will continue from where you left)
2. After cloning the repo and running `yarn`, inside the repo run `anchor build`
3. Once done, run `anchor deploy`. Optional: to see logs, run `solana logs` after
4. To test, run `anchor run test`
5. Running `anchor run test` again may result in some failing tests as the pools/options have already been created on the local network. So you will need to reset your local network (step 1).

# TODO:
- PDA to store pool creation price
- PoolCreated event (description, title, image, options)
- OptionCreated event
- PoolCustody account to store SOL, creator
- burnPool function; transfer SOL to admin key