import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("🚀 Deploying BondingCurve to Sapphire Testnet...");

    const privateKey = process.env.PRIVATE_KEY!;

    // TODO: Ghi địa chỉ token X và token Test của bạn ở đây
    const tokenXAddress = ethers.getAddress(
        "0x614Cb533EB4691794790366eF5B84cAC6aDf9959"
    );
    const tokenTestAddress = ethers.getAddress(
        "0x69406A09aDCE3A662166Ad33c5e432204e438A77"
    );

    // thêm metadata mạng vào provider để tránh ethers gọi ENS
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

    // Read contract artifacts
    const artifactPath = path.join(__dirname, '../artifacts/contracts/BondingCurve.sol/BondingCurve.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    console.log("\n📋 Contract details:");
    console.log("Token X:", tokenXAddress);
    console.log("Token Test:", tokenTestAddress);

    const BondingCurve = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const bondingCurve = await BondingCurve.deploy(tokenXAddress, tokenTestAddress);

    await bondingCurve.waitForDeployment();
    const bondingCurveAddress = await bondingCurve.getAddress();

    console.log("\n✅ BondingCurve deployed to:", bondingCurveAddress);

    console.log("\n📝 Cập nhật địa chỉ contract trong ứng dụng của bạn:");
    console.log(`export const BONDING_CURVE_ADDRESS = "${bondingCurveAddress}";`);

    console.log("\n🌐 Xem trên Explorer:");
    console.log(`https://testnet.explorer.sapphire.oasis.io/address/${bondingCurveAddress}`);

    console.log("\n⚠️  TIẾP THEO:");
    console.log("1. Approve token X và Test cho BondingCurve contract");
    console.log("2. Gọi addLiquidity() để thêm token vào pool");
    console.log("3. Sau đó có thể gọi swapXForTest() hoặc swapTestForX()");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
