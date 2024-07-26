import {createPool} from "./utils/pools";
import {generateKeypair, getLocalAccount} from "./utils/keypairs";
import {createOption} from "./utils/options";
import {closeEntry, enterPool} from "./utils/entries";
import BN from "bn.js";
import {program} from "./utils/constants";
import {expect} from "chai";

describe('Close entry', () => {
    it("should only let a user close their own entry", async () => {
        const admin = await getLocalAccount();
        const title = "Who will be the Treasury Secretary in the Trump administration?";
        const optionTitle = "Larry Fink";
        const user = await generateKeypair();
        const user1 = await generateKeypair();
        const { poolAccountKey } = await createPool(title, admin);
        const { optionAccountKey } = await createOption(optionTitle, admin, poolAccountKey);
        const { entryAccountKey } = await enterPool(poolAccountKey, optionAccountKey, user, new BN(1_000));
        const { entryAccountKey: wrongEntryAccountKey } = await enterPool(poolAccountKey, optionAccountKey, user1, new BN(1_000));
        try {
            await closeEntry(wrongEntryAccountKey, optionAccountKey, user)
        } catch (e) {
            expect(e.message).to.include('EntryNotDerivedFromOptionOrSigner');
        }

        await closeEntry(entryAccountKey, optionAccountKey, user);

        try {
            await program.account.entry.fetch(entryAccountKey);
        } catch (e) {
            expect(e.message).to.include(`Account does not exist or has no data ${entryAccountKey}`);
        }
    });
});