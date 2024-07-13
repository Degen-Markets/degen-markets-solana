# How to run/test:

1. Install rust (rustc & cargo come with it), solana-cli & anchor
2. Run a local validator by `solana-test-validator -r` (`-r` flag resets the local network to block 0, otherwise it will continue from where you left)
3. After cloning the repo and running `yarn`, inside the repo run `anchor build`
4. Once done, run `anchor deploy`. Optional: to see logs, run `solana logs` after
5. To test, run `anchor run test`
6. Running `anchor run test` again may result in some failing tests as the pools/options have already been created on the local network. So you will need to reset your local network (step 1).