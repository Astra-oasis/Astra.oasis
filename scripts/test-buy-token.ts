import pkg from "hardhat";
const { ethers } = pkg;
import dotenv from "dotenv";
dotenv.config();

async function main() {
    const provider = new ethers.JsonRpcProvider("https://testnet.sapphire.oasis.io", {
        chainId: 23295,
        name: "sapphire-testnet",
    });

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY is missing in .env");

    const wallet = new ethers.Wallet(privateKey, provider);
    const factoryAddress = process.env.FACTORY_ADDRESS || "0xcd5352dFdDad49224518F1F51aa63112243298F4";

    const factoryAbi = [
        "function getTokenCount() view returns (uint256)",
        "function getTokenInfo(uint256 index) view returns (tuple(address tokenAddress, string name, string symbol, uint256 totalSupply, string metadataURI, address creator, uint256 createdAt))",
    ];

    const tokenAbi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
        "function isForSale() view returns (bool)",
        "function getAvailableTokens() view returns (uint256)",
        "function getContractBalance() view returns (uint256)",
        "function creator() view returns (address)",
        "function PLATFORM_WALLET() view returns (address)",
        "function getBuyPrice(uint256 amount) view returns (uint256)",
        "function getSellPrice(uint256 amount) view returns (uint256)",
        "function getTradeFees(uint256 amount) view returns (uint256 creatorFee, uint256 protocolFee, uint256 totalFee)",
        "function buyTokens(uint256 amount) payable",
        "function sellTokens(uint256 amount)",
        "event TradeFeesPaid(address indexed trader, bool isBuy, uint256 creatorFee, uint256 protocolFee)",
    ];

    let tokenAddress = process.env.TOKEN_ADDRESS || process.argv[2];
    if (!tokenAddress) {
        const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);
        const tokenCount: bigint = await factory.getTokenCount();
        if (tokenCount === 0n) throw new Error("No token found in factory. Create token first.");

        const latest = await factory.getTokenInfo(tokenCount - 1n);
        tokenAddress = latest.tokenAddress;
        console.log(`ℹ️ No TOKEN_ADDRESS provided, using latest token from factory: ${tokenAddress}`);
    }

    const token = new ethers.Contract(tokenAddress, tokenAbi, wallet);

    console.log("=== Token Buy/Sell Smoke Test (Fee Enabled) ===\n");
    console.log("Wallet:", wallet.address);
    console.log("Factory:", factoryAddress);
    console.log("Token:", tokenAddress);

    const [name, symbol, decimals, totalSupply, available, isForSale, creator, platformWallet, beforeWalletBal, beforeReserve] = await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals(),
        token.totalSupply(),
        token.getAvailableTokens(),
        token.isForSale(),
        token.creator(),
        token.PLATFORM_WALLET(),
        token.balanceOf(wallet.address),
        token.getContractBalance(),
    ]);

    console.log("\n📋 Token Info:");
    console.log("  Name:", name);
    console.log("  Symbol:", symbol);
    console.log("  Creator:", creator);
    console.log("  Platform Wallet:", platformWallet);
    console.log("  Total Supply:", ethers.formatUnits(totalSupply, decimals));
    console.log("  Available:", ethers.formatUnits(available, decimals));
    console.log("  Is For Sale:", isForSale);
    console.log("  Your Balance Before:", ethers.formatUnits(beforeWalletBal, decimals));
    console.log("  Reserve Before:", ethers.formatEther(beforeReserve), "TEST");

    if (!isForSale) throw new Error("Token is not for sale");

    const buyAmountInput = process.env.TEST_BUY_AMOUNT || "1";
    const buyAmount = ethers.parseUnits(buyAmountInput, decimals);
    const baseBuyPrice: bigint = await token.getBuyPrice(buyAmount);
    const [creatorFee, protocolFee, totalFee] = await token.getTradeFees(baseBuyPrice);
    const totalCost = baseBuyPrice + totalFee;

    console.log("\n💰 Buy Quote:");
    console.log(`  Amount: ${buyAmountInput} ${symbol}`);
    console.log("  Base:", ethers.formatEther(baseBuyPrice), "TEST");
    console.log("  Creator Fee:", ethers.formatEther(creatorFee), "TEST");
    console.log("  Protocol Fee:", ethers.formatEther(protocolFee), "TEST");
    console.log("  Total Cost:", ethers.formatEther(totalCost), "TEST");

    console.log("\n🧪 Executing BUY...");
    const buyTx = await token.buyTokens(buyAmount, { value: totalCost, gasLimit: 500000 });
    const buyReceipt = await buyTx.wait();
    console.log("  ✅ BUY OK:", buyReceipt?.hash);

    const tokenIface = new ethers.Interface(tokenAbi);
    const buyFeeEvent = buyReceipt?.logs
        ?.map((log: any) => {
            try {
                return tokenIface.parseLog(log);
            } catch {
                return null;
            }
        })
        .find((parsed: any) => parsed && parsed.name === "TradeFeesPaid");

    if (buyFeeEvent) {
        console.log("  TradeFeesPaid (BUY) creatorFee:", ethers.formatEther(buyFeeEvent.args.creatorFee), "TEST");
        console.log("  TradeFeesPaid (BUY) protocolFee:", ethers.formatEther(buyFeeEvent.args.protocolFee), "TEST");
    } else {
        console.log("  ⚠️ TradeFeesPaid event not found in BUY receipt");
    }

    const [midWalletBal, midReserve] = await Promise.all([
        token.balanceOf(wallet.address),
        token.getContractBalance(),
    ]);
    const boughtDelta = midWalletBal - beforeWalletBal;
    console.log("  Wallet Balance After Buy:", ethers.formatUnits(midWalletBal, decimals));
    console.log("  Reserve Delta After Buy:", ethers.formatEther(midReserve - beforeReserve), "TEST (should be base only)");

    if (boughtDelta <= 0n) {
        throw new Error("Buy completed but wallet token balance did not increase");
    }

    const sellAmountInput = process.env.TEST_SELL_AMOUNT || buyAmountInput;
    let sellAmount = ethers.parseUnits(sellAmountInput, decimals);
    if (sellAmount > midWalletBal) sellAmount = midWalletBal;

    const grossSellReturn: bigint = await token.getSellPrice(sellAmount);
    const [sellCreatorFee, sellProtocolFee, sellTotalFee] = await token.getTradeFees(grossSellReturn);
    const netSellReturn = grossSellReturn - sellTotalFee;

    console.log("\n💰 Sell Quote:");
    console.log(`  Amount: ${ethers.formatUnits(sellAmount, decimals)} ${symbol}`);
    console.log("  Gross Return:", ethers.formatEther(grossSellReturn), "TEST");
    console.log("  Creator Fee:", ethers.formatEther(sellCreatorFee), "TEST");
    console.log("  Protocol Fee:", ethers.formatEther(sellProtocolFee), "TEST");
    console.log("  Net Return:", ethers.formatEther(netSellReturn), "TEST");

    console.log("\n🧪 Executing SELL...");
    const sellTx = await token.sellTokens(sellAmount, { gasLimit: 500000 });
    const sellReceipt = await sellTx.wait();
    console.log("  ✅ SELL OK:", sellReceipt?.hash);

    const sellFeeEvent = sellReceipt?.logs
        ?.map((log: any) => {
            try {
                return tokenIface.parseLog(log);
            } catch {
                return null;
            }
        })
        .find((parsed: any) => parsed && parsed.name === "TradeFeesPaid");

    if (sellFeeEvent) {
        console.log("  TradeFeesPaid (SELL) creatorFee:", ethers.formatEther(sellFeeEvent.args.creatorFee), "TEST");
        console.log("  TradeFeesPaid (SELL) protocolFee:", ethers.formatEther(sellFeeEvent.args.protocolFee), "TEST");
    } else {
        console.log("  ⚠️ TradeFeesPaid event not found in SELL receipt");
    }

    const [afterWalletBal, afterReserve] = await Promise.all([
        token.balanceOf(wallet.address),
        token.getContractBalance(),
    ]);

    console.log("\n📊 Final State:");
    console.log("  Wallet Balance After Sell:", ethers.formatUnits(afterWalletBal, decimals));
    console.log("  Reserve After Sell:", ethers.formatEther(afterReserve), "TEST");
    console.log("\n✅ Test completed: current wallet can BUY + SELL with fee-enabled logic.");
}

main().catch(console.error);
