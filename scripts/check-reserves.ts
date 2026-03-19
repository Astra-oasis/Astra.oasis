import pkg from "hardhat";
const { ethers } = pkg;

const BONDING_CURVE_ADDRESS =
    "0xB3Ad4eb3590Ef65b8D4816b1030b465404d1e7a1";

async function main() {
    const bonding = await ethers.getContractAt(
        "BondingCurve",
        BONDING_CURVE_ADDRESS
    );

    const [xReserve, testReserve] = await bonding.getReserves();

    console.log("Reserve X:", xReserve.toString());
    console.log("Reserve Test:", testReserve.toString());
}

main().catch(console.error);