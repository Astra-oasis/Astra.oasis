import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("🚀 Deploying Simple ERC20 Test Token to Sapphire Testnet...");

    const privateKey = process.env.PRIVATE_KEY!;

    const provider = new ethers.JsonRpcProvider(
        "https://testnet.sapphire.oasis.io",
        { chainId: 23295, name: "sapphire-testnet" }
    );
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log("Deploying with account:", wallet.address);

    const balance = await provider.getBalance(wallet.address);
    console.log("Account balance:", ethers.formatEther(balance), "TEST");

    if (parseFloat(ethers.formatEther(balance)) < 0.01) {
        throw new Error("Insufficient balance to deploy contract");
    }

    const artifactPath = path.join(__dirname, '../artifacts/contracts/SimpleERC20.sol/SimpleERC20.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    const SimpleERC20 = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const testToken = await SimpleERC20.deploy(
        ethers.parseUnits("1000000", 18)  // 1 million tokens with 18 decimals
    );

    await testToken.waitForDeployment();
    const testTokenAddress = await testToken.getAddress();

    console.log("\n✅ Test Token deployed to:", testTokenAddress);
    console.log("Name:", await (testToken as any).name());
    console.log("Symbol:", await (testToken as any).symbol());
    console.log("Total Supply:", ethers.formatUnits(await (testToken as any).totalSupply(), 18));

    console.log("\n📝 Update your scripts with:");
    console.log(`const tokenTestAddress = "${testTokenAddress}";`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
