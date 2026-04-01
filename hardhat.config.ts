import { HardhatUserConfig } from "hardhat/config";
import "@oasisprotocol/sapphire-hardhat";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris",
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    "sapphire-testnet": {
      url: "https://testnet.sapphire.oasis.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 0x5aff, // 23295
    },
    "sapphire-mainnet": {
      url: "https://sapphire.oasis.io",
      chainId: 0x5afe, // 23294
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;