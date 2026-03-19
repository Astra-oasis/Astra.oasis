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
    if (!privateKey) throw new Error("Thiếu PRIVATE_KEY trong .env");
    const wallet = new ethers.Wallet(privateKey, provider);

    const tokenXAddress = "0x614Cb533EB4691794790366eF5B84cAC6aDf9959";
    const tokenTestAddress = "0xe824Ed6ED596f4c415e93145a58c86a57984136A";
    const bondingAddress = "0xB3Ad4eb3590Ef65b8D4816b1030b465404d1e7a1";

    console.log("🔄 Swapping tokens…");
    console.log("Wallet:", wallet.address);

    // ABI của BondingCurve
    const bondingAbi = [
        "function swapXForTest(uint256 amountXIn, uint256 minAmountTestOut) public returns (uint256)",
        "function swapTestForX(uint256 amountTestIn, uint256 minAmountXOut) public returns (uint256)",
        "function getReserves() view returns (uint256 xReserve, uint256 testReserve)",
        "function getOutputAmount(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) view returns (uint256)",
        "function getPriceX() view returns (uint256)"
    ];

    const bonding = new ethers.Contract(bondingAddress, bondingAbi, wallet);

    // ==== Approve tokens trước khi swap ====
    const erc20Abi = [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function balanceOf(address) view returns (uint256)"
    ];

    const tokenX = new ethers.Contract(tokenXAddress, erc20Abi, wallet);
    const tokenTest = new ethers.Contract(tokenTestAddress, erc20Abi, wallet);

    console.log("\n✅ Approving tokens for swaps...");
    const xIn = ethers.parseUnits("10.0", 18);
    const testIn = ethers.parseUnits("5.0", 18);

    await (await tokenX.approve(bondingAddress, xIn)).wait();
    console.log("  Token X approved");

    await (await tokenTest.approve(bondingAddress, testIn)).wait();
    console.log("  Token Test approved\n");

    // ===== OPTION 1: Swap X lấy TEST =====
    const minTestOut = ethers.parseUnits("5.0", 18); // tối thiểu 5 TEST (slippage ~50%)

    console.log("📤 swapXForTest:");
    console.log("  Input X:", ethers.formatUnits(xIn, 18));
    console.log("  Min TEST:", ethers.formatUnits(minTestOut, 18));

    try {
        const tx1 = await bonding.swapXForTest(xIn, minTestOut);
        const receipt1 = await tx1.wait();
        console.log("  ✅ TX hash:", receipt1?.hash);
        console.log("  ✅ Gas used:", receipt1?.gasUsed.toString());
    } catch (e) {
        console.error("  ❌ Swap X→Test failed:", (e as Error).message);
    }

    // ===== OPTION 2: Swap TEST lấy X =====
    const minXOut = ethers.parseUnits("2.0", 18);   // tối thiểu 2 X (slippage ~60%)

    console.log("\n📥 swapTestForX:");
    console.log("  Input TEST:", ethers.formatUnits(testIn, 18));
    console.log("  Min X:", ethers.formatUnits(minXOut, 18));

    try {
        const tx2 = await bonding.swapTestForX(testIn, minXOut);
        const receipt2 = await tx2.wait();
        console.log("  ✅ TX hash:", receipt2?.hash);
        console.log("  ✅ Gas used:", receipt2?.gasUsed.toString());
    } catch (e) {
        console.error("  ❌ Swap Test→X failed:", (e as Error).message);
    }

    // Kiểm tra reserves sau swap
    try {
        const [xReserve, testReserve] = await bonding.getReserves();
        console.log("\n💰 Pool reserves sau swap:");
        console.log("  X reserve:", ethers.formatUnits(xReserve, 18));
        console.log("  TEST reserve:", ethers.formatUnits(testReserve, 18));
    } catch (e) {
        console.log("  (getReserves không khả dụng)");
    }

    await provider.destroy();
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });