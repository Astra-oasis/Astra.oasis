import pkg from "hardhat";

const { ethers } = pkg;

type TokenContract = {
  balanceOf(account: string): Promise<bigint>;
  getSellPrice(amount: bigint): Promise<bigint>;
  getTradeFees(amount: bigint): Promise<[bigint, bigint, bigint]>;
  sellTokens(amount: bigint, overrides?: { gasLimit?: number }): Promise<{ hash: string; wait: () => Promise<any> }>;
};

function fmt(value: bigint) {
  return ethers.formatEther(value);
}

async function main() {
  const tokenAddress = process.env.OLD_TOKEN_ADDRESS || process.argv[2] || "0x6C894D4bb43549602cd588a4c787C7bc2Dc05A28";
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY in environment");
  }

  const signer = new ethers.Wallet(privateKey, ethers.provider);
  const wallet = await signer.getAddress();

  const tokenAbi = [
    "function balanceOf(address) view returns (uint256)",
    "function getSellPrice(uint256 amount) view returns (uint256)",
    "function getTradeFees(uint256 amount) view returns (uint256 creatorFee, uint256 protocolFee, uint256 totalFee)",
    "function sellTokens(uint256 amount)",
  ];

  const token = new ethers.Contract(tokenAddress, tokenAbi, signer) as unknown as TokenContract;

  const balanceBefore = await ethers.provider.getBalance(wallet);
  const tokenBalance = await token.balanceOf(wallet);

  console.log("Wallet:", wallet);
  console.log("Token:", tokenAddress);
  console.log("TEST before:", fmt(balanceBefore));
  console.log("Token balance:", ethers.formatUnits(tokenBalance, 18));

  if (tokenBalance === 0n) {
    console.log("No token balance to sell.");
    return;
  }

  const gross = await token.getSellPrice(tokenBalance);
  const [, , fee] = await token.getTradeFees(gross);
  const net = gross - fee;

  console.log("Sell quote gross:", fmt(gross), "TEST");
  console.log("Sell fee total:", fmt(fee), "TEST");
  console.log("Expected net:", fmt(net), "TEST");

  const oneToken = 10n ** 18n;
  let remaining = tokenBalance;
  let lastReceiptHash = "";

  while (remaining > 0n) {
    let candidate = remaining;
    let sold = false;

    while (candidate >= oneToken) {
      try {
        const tx = await token.sellTokens(candidate, { gasLimit: 700000 });
        const receipt = await tx.wait();
        lastReceiptHash = receipt.hash;

        const candidateUnits = ethers.formatUnits(candidate, 18);
        console.log("Sold batch:", candidateUnits, "tokens | tx:", receipt.hash);

        sold = true;
        break;
      } catch (error: any) {
        const message = String(error?.message || error);
        if (!message.includes("Insufficient token balance")) {
          throw error;
        }

        candidate = candidate / 2n;
      }
    }

    if (!sold) {
      throw new Error("Could not find a sellable batch size");
    }

    remaining = await token.balanceOf(wallet);
    console.log("Remaining token:", ethers.formatUnits(remaining, 18));
  }

  const tokenAfter = await token.balanceOf(wallet);
  const balanceAfter = await ethers.provider.getBalance(wallet);

  if (lastReceiptHash) {
    console.log("Last sell tx:", lastReceiptHash);
  }
  console.log("Token after:", ethers.formatUnits(tokenAfter, 18));
  console.log("TEST after:", fmt(balanceAfter));
}

main().catch((error) => {
  console.error("Sell-all failed:", error);
  process.exitCode = 1;
});
