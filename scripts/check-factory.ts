import pkg from "hardhat";
const { ethers } = pkg;
import dotenv from "dotenv";
dotenv.config();

async function main() {
    const provider = new ethers.JsonRpcProvider(
        "https://testnet.sapphire.oasis.io",
        { chainId: 23295, name: "sapphire-testnet" }
    );

    const privateKey = process.env.PRIVATE_KEY!;
    const wallet = new ethers.Wallet(privateKey, provider);

    // TokenFactory address - need to find or deploy
    // For now, let's use the address from factoryAbi.ts
    const factoryAddress = "0x69406A09aDCE3A662166Ad33c5e432204e438A77";

    const factoryAbi = [
        "function getTokenCount() view returns (uint256)",
        "function getAllTokens() view returns (tuple(address tokenAddress, string name, string symbol, uint256 totalSupply, string metadataURI, address creator, uint256 createdAt)[])",
        "function getTokensByCreator(address creator) view returns (address[])",
    ];

    try {
        const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);

        const count = await factory.getTokenCount();
        console.log("Total tokens in factory:", count.toString());

        const allTokens = await factory.getAllTokens();
        console.log("\n📋 All Tokens:");

        for (let i = 0; i < allTokens.length; i++) {
            const t = allTokens[i];
            console.log(`\n  ${i + 1}. ${t.name} (${t.symbol})`);
            console.log(`     Address: ${t.tokenAddress}`);
            console.log(`     Creator: ${t.creator}`);
            console.log(`     Total Supply: ${ethers.formatUnits(t.totalSupply, 18)}`);
        }

        // Check user's tokens
        const userTokens = await factory.getTokensByCreator(wallet.address);
        console.log("\n\n👤 Your Tokens in Factory:", userTokens.length);
        for (const addr of userTokens) {
            console.log("  -", addr);
        }

    } catch (error: any) {
        console.error("Error:", error.message);
        console.log("\nNote: TokenFactory might not be deployed at this address");
        console.log("Or this address is not a TokenFactory");
    }
}

main().catch(console.error);
