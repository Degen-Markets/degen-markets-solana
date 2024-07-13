import * as anchor from "@coral-xyz/anchor";
import {program} from "./constants";
import * as crypto from 'crypto';
import {getBytesFromHashedStr} from "./cryptography";


export const derivePoolAccountKey = async (title: string) => {
    const [pda, _] = anchor.web3.PublicKey.findProgramAddressSync(
        [
            getBytesFromHashedStr(title),
        ],
        program.programId
    );
    console.log(`Derived pool account is ${pda}`);
    return pda;
};

export const deriveOptionAccountKey = async (title: string, poolAccountKey: anchor.web3.PublicKey) => {
    const [pda, _] = anchor.web3.PublicKey.findProgramAddressSync(
        [
            getBytesFromHashedStr(poolAccountKey.toString().concat(title)),
        ],
        program.programId
    );
    console.log(`Derived option account is ${pda}`);
    return pda;
};