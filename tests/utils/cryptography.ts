import crypto from "crypto";
import * as anchor from "@coral-xyz/anchor";
import bs58 from "bs58";

export const getBytesFromHashedStr = (str: string) => {
  const hashedStr = crypto.createHash("sha256").update(str, "utf-8");
  const buffer = hashedStr.digest();
  return Uint8Array.from(buffer);
};

export const getTitleHash = (title: string) =>
  getBytesFromHashedStr(title) as unknown as number[];

export const getOptionTitleHash = (
  poolAccountKey: anchor.web3.PublicKey,
  title: string,
) => getBytesFromHashedStr(poolAccountKey + title);
