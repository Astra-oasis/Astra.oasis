# Astra.oasi

> A decentralized token creation and trading platform built on Oasis Sapphire Testnet with pump.fun-style mechanics

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Oasis Network](https://img.shields.io/badge/Oasis-Sapphire-blue)](https://oasisprotocol.org)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.24-black)](https://docs.soliditylang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
- [Smart Contracts](#smart-contracts)
- [Frontend Structure](#frontend-structure)
- [Development](#development)
  - [Available Scripts](#available-scripts)
  - [Deployment](#deployment)
- [Trading Mechanics](#trading-mechanics)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)
- [Links](#links)

---

## Overview

**Astra.oasis** is a decentralized application (DApp) that enables users to create custom ERC20 tokens and trade them instantly through a built-in automated market maker. Each token contract maintains its own liquidity pool, allowing for immediate buy/sell operations without external exchanges.

Built on the **Oasis Sapphire Testnet**, Astra.oasis leverages confidential computing capabilities to provide privacy-first token creation and trading.

---

## Features

- **One-Click Token Creation** - Deploy custom ERC20 tokens with configurable parameters
- **Instant Trading** - Buy and sell tokens directly through smart contracts
- **Built-in Liquidity** - Each token maintains its own liquidity pool
- **Privacy-First** - Leverages Oasis Sapphire's confidential computing capabilities
- **Zero Slippage** - Fixed-price trading model for predictable transactions
- **Gas Efficient** - Optimized smart contracts for minimal transaction costs

---

## Architecture

### Smart Contract Layer
- **TokenFactory.sol** - Factory pattern for deploying individual token contracts
- **TokenPolicyMint.sol** - ERC20 token with integrated trading functionality

### Frontend Layer
- **Next.js 14** - React-based frontend with App Router
- **TypeScript** - Type-safe development environment
- **Tailwind CSS** - Utility-first styling framework
- **Ethers.js v6** - Web3 integration library

---

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn** package manager
- **Git**
- **MetaMask** or compatible Web3 wallet
- Access to **Oasis Sapphire Testnet**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/astra.oasis.git
cd astra.oasis

# Install all dependencies (root + frontend)
npm install && cd frontend && npm install && cd ..
```

### Configuration

1. **Environment Setup**
   ```bash
   cp .env.example .env
   # Add your private key to .env file
   ```

2. **Network Configuration** - Add Oasis Sapphire Testnet to your wallet:

   | Parameter | Value |
   |-----------|-------|
   | Network Name | Oasis Sapphire Testnet |
   | RPC URL | `https://testnet.sapphire.oasis.io` |
   | Chain ID | 23295 |
   | Currency Symbol | TEST |
   | Block Explorer | `https://testnet.explorer.sapphire.oasis.io` |

### Running the Application

```bash
# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

---

## Smart Contracts

### TokenFactory
- **Address**: `0x69406A09aDCE3A662166Ad33c5e432204e438A77`
- **Purpose**: Deploys and manages individual token contracts
- **Functions**: Create tokens, retrieve token information

### TokenPolicyMint
- **Type**: ERC20 with trading capabilities
- **Features**: Buy/sell functions, liquidity management, creator controls
- **Security**: Input validation, overflow protection, access controls

### Contract Structure
```
contracts/
├── TokenFactory.sol        # Factory contract
└── TokenPolicyMint.sol     # Token template
```

---

## Frontend Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main page
├── components/
│   ├── CreateToken.tsx     # Token creation form
│   └── TokenMarketplace.tsx # Trading interface
└── abi/
    └── factoryAbi.ts       # Contract ABIs
```

---

## Development

### Available Scripts

```bash
# Quick start
npm run dev                      # Start development server (most used)

# Smart contract operations
npm run compile                  # Compile contracts
npm run clean                    # Clean build artifacts
npm run deploy-factory           # Deploy to testnet
npm run test-bonding             # Test bonding curve logic

# Frontend operations
npm run frontend:dev             # Start development server (alternative)
npm run frontend:build           # Build for production
npm run frontend:start           # Start production server
```

### Deployment

```bash
# 1. Compile contracts
npm run compile

# 2. Deploy to Oasis Sapphire Testnet
npm run deploy-factory

# 3. Update the contract address in frontend/abi/factoryAbi.ts
```

---

## Trading Mechanics

### Buy Process
1. User specifies token amount to purchase
2. Contract calculates required TEST payment
3. TEST is transferred to token contract
4. Tokens are minted/transferred to user
5. Contract maintains TEST for future sell orders

### Sell Process
1. User specifies token amount to sell
2. Contract validates user balance
3. Tokens are transferred back to contract
4. TEST is transferred to user at current price
5. Liquidity pool is updated

### Price Model
- Fixed price per token set by creator
- No dynamic pricing or AMM curves
- Predictable costs for users
- No impermanent loss risk

---

## Security

- **Access Controls** - Creator-only functions for token management
- **Input Validation** - Comprehensive parameter checking
- **Overflow Protection** - SafeMath operations throughout
- **Reentrancy Guards** - Protection against reentrancy attacks
- **Privacy** - Confidential transactions on Oasis Sapphire

### Technical Specifications

| Component | Specification |
|-----------|---------------|
| Network | Oasis Sapphire Testnet |
| Consensus | Proof of Stake |
| Privacy | Confidential smart contracts |
| Finality | ~6 seconds |
| Solidity | ^0.8.24 |
| Framework | Hardhat |
| Testing | Hardhat Test Suite |

---

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting a pull request.

### For New Contributors

**TL;DR - Just want to run the app?**
```bash
git clone <repo-url>
cd astra.oasis
npm install && cd frontend && npm install && cd ..
npm run dev
```

**Want to contribute?**
1. The app uses existing deployed contracts, so you can develop frontend features immediately
2. Smart contracts are in `/contracts` folder
3. Frontend code is in `/frontend` folder
4. Run `npm run dev` to start development
5. The app connects to Oasis Sapphire Testnet automatically

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/astra.oasis/issues)
- **Discord**: [Join our community](https://discord.gg/astra-oasis)
- **Twitter**: [@astra_oasis](https://twitter.com/astra_oasis)

---

## Links

- **Live Demo**: [https://astra-oasis.vercel.app](https://astra-oasis.vercel.app)
- **Documentation**: [https://docs.astra-oasis.com](https://docs.astra-oasis.com)
- **Explorer**: [https://testnet.explorer.sapphire.oasis.io](https://testnet.explorer.sapphire.oasis.io)
- **Oasis Network**: [https://oasisprotocol.org](https://oasisprotocol.org)

---

<p align="center"><b>Built with ❤️ for the Oasis Ecosystem</b></p>
