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

    const tokenXAddress = "0x614Cb533EB4691794790366eF5B84cAC6aDf9959";
    const tokenTestAddress = "0xe824Ed6ED596f4c415e93145a58c86a57984136A";

    console.log("Wallet:", wallet.address);
    console.log("\n🔍 Checking token status...\n");

    const erc20Abi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function balanceOf(address) view returns (uint256)",
        "function totalSupply() view returns (uint256)"
    ];

    try {
        const tokenX = new ethers.Contract(tokenXAddress, erc20Abi, provider);
        console.log("📍 Token X:", tokenXAddress);
        const nameX = await tokenX.name();
        const symbolX = await tokenX.symbol();
        const decimalsX = await tokenX.decimals();
        console.log("  Name:", nameX);
        console.log("  Symbol:", symbolX);
        console.log("  Decimals:", decimalsX);

        const balX = await tokenX.balanceOf(wallet.address);
        console.log("  Balance:", ethers.formatUnits(balX, decimalsX));
    } catch (e) {
        console.error("❌ Token X error:", (e as Error).message);
    }

    try {
        const tokenTest = new ethers.Contract(tokenTestAddress, erc20Abi, provider);
        console.log("\n📍 Token Test:", tokenTestAddress);
        const nameTest = await tokenTest.name();
        const symbolTest = await tokenTest.symbol();
        const decimalsTest = await tokenTest.decimals();
        console.log("  Name:", nameTest);
        console.log("  Symbol:", symbolTest);
        console.log("  Decimals:", decimalsTest);

        const balTest = await tokenTest.balanceOf(wallet.address);
        console.log("  Balance:", ethers.formatUnits(balTest, decimalsTest));
    } catch (e) {
        console.error("❌ Token Test error:", (e as Error).message);
    }

    // Check BondingCurve contract
    try {
        const bondingAddress = "0xB3Ad4eb3590Ef65b8D4816b1030b465404d1e7a1";
        const bondingAbi = [
            "function getReserves() view returns (uint256, uint256)",
            "function getPriceX() view returns (uint256)"
        ];

        const bonding = new ethers.Contract(bondingAddress, bondingAbi, provider);
        console.log("\n📊 BondingCurve Contract:");
        console.log("  Address:", bondingAddress);

        const reserves = await bonding.getReserves();
        console.log("  Reserve X:", ethers.formatUnits(reserves[0], 18));
        console.log("  Reserve Test:", ethers.formatUnits(reserves[1], 18));

        const priceX = await bonding.getPriceX();
        console.log("  Price X (in TEST):", ethers.formatUnits(priceX, 18));
    } catch (e) {
        console.error("❌ BondingCurve error:", (e as Error).message);
    }
}

main().catch(console.error);
