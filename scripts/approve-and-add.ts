import { ethers } from "ethers";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();                   // nếu dùng .env để chứa khoá

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const provider = new ethers.JsonRpcProvider(
        "https://testnet.sapphire.oasis.io",
        { chainId: 23295, name: "sapphire-testnet" }
    );

    const privateKey = process.env.PRIVATE_KEY!;
    const wallet = new ethers.Wallet(privateKey, provider);

    const tokenXAddress = "0x614Cb533EB4691794790366eF5B84cAC6aDf9959";
    const tokenTestAddress = "0xe824Ed6ED596f4c415e93145a58c86a57984136A";
    const bondingAddress = "0xB3Ad4eb3590Ef65b8D4816b1030b465404d1e7a1";

    const erc20Abi = [
        "function approve(address,uint256) returns (bool)",
        "function balanceOf(address) view returns (uint256)"
    ];

    const tokenX = new ethers.Contract(tokenXAddress, erc20Abi, wallet);
    const tokenT = new ethers.Contract(tokenTestAddress, erc20Abi, wallet);

    // 🔍 Check balances
    const balX = await tokenX.balanceOf(wallet.address);
    const balT = await tokenT.balanceOf(wallet.address);
    console.log("Balance X:", ethers.formatUnits(balX, 18));
    console.log("Balance Test:", ethers.formatUnits(balT, 18));
    const amtX = ethers.parseUnits("100", 18);
    const amtTest = ethers.parseUnits("100", 18);

    console.log("approve token…");

    await (await tokenX.approve(bondingAddress, amtX)).wait();
    await (await tokenT.approve(bondingAddress, amtTest)).wait();

    const bondingAbi = [
        "function addLiquidity(uint256,uint256) public",
        "function getReserves() view returns (uint256,uint256)"
    ];

    const bonding = new ethers.Contract(bondingAddress, bondingAbi, wallet);

    console.log("add liquidity…");

    await (await bonding.addLiquidity(amtX, amtTest)).wait();

    const reserves = await bonding.getReserves();
    console.log("Reserve X:", reserves[0].toString());
    console.log("Reserve Test:", reserves[1].toString());

    console.log("DONE SUCCESSFULLY");
}

main().catch(console.error);