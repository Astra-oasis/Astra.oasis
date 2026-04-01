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

    const tokenAddress = "0x17a0C2600E5328428cb26394d7FA78C28D20a9B1";

    const tokenABI = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
        "function pricePerToken() view returns (uint256)",
        "function isForSale() view returns (bool)",
        "function getAvailableTokens() view returns (uint256)",
        "function getContractBalance() view returns (uint256)",
        "function creator() view returns (address)",
        "function buyTokens(uint256 amount) payable"
    ];

    const token = new ethers.Contract(tokenAddress, tokenABI, wallet);

    console.log("=== Detailed Token Analysis ===\n");
    console.log("Token Address:", tokenAddress);
    console.log("Your Wallet:", wallet.address);

    try {
        const [name, symbol, decimals, totalSupply, available, isForSale, price, contractBalance, creator] = await Promise.all([
            token.name(),
            token.symbol(),
            token.decimals(),
            token.totalSupply(),
            token.getAvailableTokens(),
            token.isForSale(),
            token.pricePerToken(),
            token.getContractBalance(),
            token.creator()
        ]);

        console.log("\n📋 Token Info:");
        console.log("  Name:", name);
        console.log("  Symbol:", symbol);
        console.log("  Creator:", creator);
        console.log("  Decimals:", decimals.toString());
        console.log("  Total Supply:", ethers.formatUnits(totalSupply, decimals));
        console.log("  Available in contract:", ethers.formatUnits(available, decimals));
        console.log("  Is For Sale:", isForSale);
        console.log("  Price Per Token:", ethers.formatUnits(price, decimals), "TEST");
        console.log("  Contract ETH Balance:", ethers.formatEther(contractBalance), "ETH");

        // Calculate buy price
        const buyAmount = ethers.parseUnits("1", decimals);
        const totalPrice = (buyAmount * price) / ethers.parseUnits("1", decimals);

        console.log("\n💰 Buy Calculation (for 1 token):");
        console.log("  Amount to buy:", ethers.formatUnits(buyAmount, decimals));
        console.log("  Price per token:", ethers.formatUnits(price, decimals));
        console.log("  Total price in wei:", totalPrice.toString());
        console.log("  Total price in ETH:", ethers.formatEther(totalPrice));

        // Test if we can buy
        console.log("\n🧪 Attempting Test Buy...");
        const testBuyAmount = ethers.parseUnits("0.000001", decimals);
        const testPrice = (testBuyAmount * price) / ethers.parseUnits("1", decimals);

        console.log("  Test amount: 0.000001 token");
        console.log("  Test price: " + ethers.formatEther(testPrice) + " ETH");

        // First, check if contract has enough balance
        if (parseFloat(ethers.formatUnits(available, decimals)) < 0.000001) {
            console.log("  ❌ ERROR: Not enough tokens available in contract!");
            console.log("     Available:", ethers.formatUnits(available, decimals));
            return;
        }

        // Check if sale is enabled
        if (!isForSale) {
            console.log("  ❌ ERROR: Token is not for sale!");
            return;
        }

        // Try to buy
        try {
            const buyTx = await token.buyTokens(testBuyAmount, {
                value: testPrice,
                gasLimit: 200000
            });

            const receipt = await buyTx.wait();
            console.log("  ✅ Buy transaction successful!");
            console.log("  TX Hash:", receipt?.hash);
        } catch (buyError: any) {
            console.log("  ❌ Buy transaction failed!");
            console.log("  Error:", buyError.message || buyError.reason || buyError);
        }

    } catch (error: any) {
        console.error("❌ Error:", error.message);
        console.log("\nCheck:");
        console.log("  - Token contract address is correct");
        console.log("  - Contract is deployed on this network");
        console.log("  - ABI matches contract");
    }
}

main().catch(console.error);
