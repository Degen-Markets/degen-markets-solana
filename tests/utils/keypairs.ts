import * as anchor from '@coral-xyz/anchor';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'yaml';
import {provider} from "./constants";

const CONFIG_FILE_PATH = path.resolve(
    os.homedir(),
    '.config',
    'solana',
    'cli',
    'config.yml',
);

export const createKeypairFromFile = (
    filePath: string,
) => {
    const secretKeyString = fs.readFileSync(filePath, {encoding: 'utf8'});
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    return anchor.web3.Keypair.fromSecretKey(secretKey);
}

export const getLocalAccount = async () => {
    const configYml = fs.readFileSync(CONFIG_FILE_PATH, {encoding: 'utf8'});
    const keypairPath = await yaml.parse(configYml).keypair_path;
    const localKeypair = createKeypairFromFile(keypairPath);

    return localKeypair;
};

export const generateKeypair = async () => {
    let keypair = anchor.web3.Keypair.generate();
    await provider.connection.requestAirdrop(
        keypair.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await new Promise( resolve => setTimeout(resolve, 1000) ); // Sleep 1s
    return keypair;
}