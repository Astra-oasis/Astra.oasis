import pkg from "hardhat";

const { ethers } = pkg;

async function main() {
  const tokenAddress = process.env.OLD_TOKEN_ADDRESS || process.argv[2] || "0x6C894D4bb43549602cd588a4c787C7bc2Dc05A28";
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY in environment");
  }

  const signer = new ethers.Wallet(privateKey, ethers.provider);
  const wallet = await signer.getAddress();

  const tokenAbi = ["function balanceOf(address) view returns (uint256)"];
  const token = new ethers.Contract(tokenAddress, tokenAbi, signer);

  const [nativeBal, tokenBal] = await Promise.all([
    ethers.provider.getBalance(wallet),
    token.balanceOf(wallet),
  ]);

  console.log("Wallet:", wallet);
  console.log("Token:", tokenAddress);
  console.log("TEST balance:", ethers.formatEther(nativeBal));
  console.log("Token balance:", ethers.formatUnits(tokenBal, 18));
}

main().catch((error) => {
  console.error("Check status failed:", error);
  process.exitCode = 1;
});
