import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Deploying TokenFactory to Sapphire Testnet...");

  const privateKey = "0x1e87053d653ff72d04d9a4707309cf32105de0b692b320ee40c7cd1f1c765ec3";

  const provider = new ethers.JsonRpcProvider("https://testnet.sapphire.oasis.io");
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deploying with account:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("Account balance:", ethers.formatEther(balance), "TEST");

  if (parseFloat(ethers.formatEther(balance)) < 0.01) {
    throw new Error("Insufficient balance to deploy contract");
  }

  // Read contract artifacts manually
  const artifactPath = path.join(__dirname, '../artifacts/contracts/TokenFactory.sol/TokenFactory.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  
  const TokenFactory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const tokenFactory = await TokenFactory.deploy();
  
  await tokenFactory.waitForDeployment();
  const factoryAddress = await tokenFactory.getAddress();
  
  console.log("✅ TokenFactory deployed to:", factoryAddress);
  
  console.log("\n📝 Update FACTORY_ADDRESS in frontend/abi/factoryAbi.ts:");
  console.log(`export const FACTORY_ADDRESS = "${factoryAddress}";`);
  
  console.log("\n🌐 View on Explorer:");
  console.log(`https://testnet.explorer.sapphire.oasis.io/address/${factoryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });