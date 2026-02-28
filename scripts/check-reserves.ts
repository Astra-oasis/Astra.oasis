import pkg from "hardhat";
const { ethers } = pkg;

const BONDING_CURVE_ADDRESS =
    "0x883fBeD6f058A679a46A5483883210197A6FA1B1";

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