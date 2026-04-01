import { ethers } from "ethers";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const provider = new ethers.JsonRpcProvider(
        "https://testnet.sapphire.oasis.io",
        { chainId: 23295, name: "sapphire-testnet" }
    );

    const privateKey = process.env.PRIVATE_KEY!;
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log("🚀 Creating Test Token via TokenFactory...");
    console.log("Wallet:", wallet.address);

    const balance = await provider.getBalance(wallet.address);
    console.log("Account balance:", ethers.formatEther(balance), "TEST\n");

    if (parseFloat(ethers.formatEther(balance)) < 0.1) {
        throw new Error("Insufficient balance to create token");
    }

    // Read TokenFactory artifact
    const artifactPath = path.join(
        __dirname,
        '../artifacts/contracts/TokenFactory.sol/TokenFactory.json'
    );
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    // TokenFactory address (cần triển khai nếu chưa có)
    // Tạm thời sử dụng một địa chỉ placeholder - bạn cần thay thế bằng TokenFactory address thực
    const tokenFactoryAddress = "0x..."; // TODO: Set TokenFactory address

    // Nếu không có TokenFactory, hãy deploy nó trước
    console.log("📋 Deploying TokenFactory contract...");
    const TokenFactory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const tokenFactoryContract = await TokenFactory.deploy();
    await tokenFactoryContract.waitForDeployment();
    const tokenFactoryAddr = await tokenFactoryContract.getAddress();
    console.log("✅ TokenFactory deployed to:", tokenFactoryAddr);

    // Cast to any to access createToken method
    const tokenFactory = tokenFactoryContract as any;

    // Tạo token Test ("TEST Token")
    console.log("\n📝 Creating Test Token...");
    const tx = await tokenFactory.createToken(
        "Test Token",           // name
        "TEST",                 // symbol
        ethers.parseUnits("1000000", 18),  // totalSupply: 1M tokens
        "https://example.com/test-metadata",  // metadataURI
        ethers.parseUnits("1", 18)  // pricePerToken: 1 wei per token
    );

    const receipt = await tx.wait();
    console.log("✅ Transaction hash:", receipt?.hash);

    // Lấy token address từ event
    const events = receipt?.logs || [];
    const tokenInterface = new ethers.Interface(artifact.abi);
    let testTokenAddress = null;

    for (const log of events) {
        try {
            const parsed = tokenInterface.parseLog(log);
            if (parsed && parsed.name === "TokenCreated") {
                testTokenAddress = parsed.args[0];
                break;
            }
        } catch (e) {
            // Skip if not a TokenCreated event
        }
    }

    if (!testTokenAddress) {
        // Fallback: get from getAllTokens
        const allTokens = await tokenFactory.getAllTokens();
        if (allTokens.length > 0) {
            testTokenAddress = allTokens[allTokens.length - 1].tokenAddress;
        }
    }

    console.log("\n🎉 Test Token created!");
    console.log("Test Token Address:", testTokenAddress);

    console.log("\n📝 Update BondingCurve deployment script with:");
    console.log(`const tokenTestAddress = "${testTokenAddress}";`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
