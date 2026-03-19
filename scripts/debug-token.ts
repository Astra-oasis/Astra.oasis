import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

async function main() {
    const provider = new ethers.JsonRpcProvider(
        "https://testnet.sapphire.oasis.io",
        { chainId: 23295, name: "sapphire-testnet" }
    );

    const privateKey = process.env.PRIVATE_KEY!;
    const wallet = new ethers.Wallet(privateKey, provider);

    // Token được tạo bởi TokenFactory
    const tokenABI = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
        "function pricePerToken() view returns (uint256)",
        "function isForSale() view returns (bool)",
        "function getAvailableTokens() view returns (uint256)",
        "function creator() view returns (address)"
    ];

    // Địa chỉ token được tạo (lấy từ TokenFactory events hoặc hardcode)
    // Ở đây tôi sẽ check KUTI token
    const tokenAddress = "0x614Cb533EB4691794790366eF5B84cAC6aDf9959";

    const token = new ethers.Contract(tokenAddress, tokenABI, provider);

    console.log("=== Token Status Debug ===\n");
    console.log("Token Address:", tokenAddress);
    console.log("Wallet:", wallet.address);

    try {
        const [name, symbol, decimals, totalSupply, available, isForSale, price, creator] = await Promise.all([
            token.name(),
            token.symbol(),
            token.decimals(),
            token.totalSupply(),
            token.getAvailableTokens(),
            token.isForSale(),
            token.pricePerToken(),
            token.creator()
        ]);

        console.log("\n📋 Token Info:");
        console.log("  Name:", name);
        console.log("  Symbol:", symbol);
        console.log("  Decimals:", decimals);
        console.log("  Total Supply:", ethers.formatUnits(totalSupply, decimals));
        console.log("  Available (in contract):", ethers.formatUnits(available, decimals));
        console.log("  Is For Sale:", isForSale);
        console.log("  Price Per Token:", ethers.formatUnits(price, decimals), "TEST");
        console.log("  Creator:", creator);

        // Check wallet balance
        const userBalance = await token.balanceOf(wallet.address);
        console.log("\n💰 Your Balance:", ethers.formatUnits(userBalance, decimals), symbol);

        // Check TEST balance
        const testTokenAddress = "0xe824Ed6ED596f4c415e93145a58c86a57984136A";
        const testToken = new ethers.Contract(testTokenAddress, ["function balanceOf(address) view returns (uint256)"], provider);
        const testBalance = await testToken.balanceOf(wallet.address);
        console.log("  TEST Balance:", ethers.formatUnits(testBalance, 18), "TEST");

        // Suggest action
        console.log("\n✅ Action Items:");
        if (!isForSale) {
            console.log("  ⚠️  Token is NOT for sale! Creator needs to enable sales.");
        }
        if (parseFloat(ethers.formatUnits(available, decimals)) === 0) {
            console.log("  ⚠️  No tokens available in contract! Creator needs to withdraw/add tokens.");
        }
        if (parseFloat(ethers.formatUnits(testBalance, 18)) === 0) {
            console.log("  ⚠️  You have no TEST tokens! Use faucet to get TEST.");
        }

        const priceValue = parseFloat(ethers.formatUnits(price, decimals));
        const testBal = parseFloat(ethers.formatUnits(testBalance, 18));
        const canBuy = Math.floor(testBal / priceValue);
        console.log(`  You can buy ${canBuy} tokens with current TEST balance`);

    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);
