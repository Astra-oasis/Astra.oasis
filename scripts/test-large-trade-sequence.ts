import pkg from "hardhat";

const { ethers } = pkg;

type ScenarioContract = {
  getBuyPrice(amount: bigint): Promise<bigint>;
  getSellPrice(amount: bigint): Promise<bigint>;
  getTradeFees(amount: bigint): Promise<[bigint, bigint, bigint]>;
  buyTokens(amount: bigint, overrides: { value: bigint }): Promise<{ wait: () => Promise<any> }>;
  sellTokens(amount: bigint): Promise<{ wait: () => Promise<any> }>;
  balanceOf(account: string): Promise<bigint>;
  soldSupply(): Promise<bigint>;
  getCurrentPrice(): Promise<bigint>;
};

function fmt(value: bigint) {
  return ethers.formatEther(value);
}

async function executeBuy(token: ScenarioContract, trader: string, amount: bigint, stepLabel: string) {
  const basePrice = await token.getBuyPrice(amount);
  const [, , totalFee] = await token.getTradeFees(basePrice);
  const totalCost = basePrice + totalFee;

  const tx = await token.buyTokens(amount, { value: totalCost });
  await tx.wait();

  const balance = await token.balanceOf(trader);
  const currentPrice = await token.getCurrentPrice();

  console.log(`  ${stepLabel} BUY ${fmt(amount)} tokens | base=${fmt(basePrice)} TEST | fee=${fmt(totalFee)} TEST | total=${fmt(totalCost)} TEST`);
  console.log(`    Wallet token balance: ${fmt(balance)} | Current price: ${fmt(currentPrice)} TEST`);
}

async function executeSell(token: ScenarioContract, trader: string, amount: bigint, stepLabel: string) {
  const gross = await token.getSellPrice(amount);
  const [, , totalFee] = await token.getTradeFees(gross);
  const net = gross - totalFee;

  const tx = await token.sellTokens(amount);
  await tx.wait();

  const balance = await token.balanceOf(trader);
  const currentPrice = await token.getCurrentPrice();

  console.log(`  ${stepLabel} SELL ${fmt(amount)} tokens | gross=${fmt(gross)} TEST | fee=${fmt(totalFee)} TEST | net=${fmt(net)} TEST`);
  console.log(`    Wallet token balance: ${fmt(balance)} | Current price: ${fmt(currentPrice)} TEST`);
}

type SequenceConfig = {
  buySequence: bigint[];
  sellSequence: bigint[];
  extraBuys: bigint[];
};

async function runScenario(label: string, token: ScenarioContract, trader: string, config: SequenceConfig) {
  console.log(`\n=== Scenario: ${label} ===`);

  const { buySequence, sellSequence, extraBuys } = config;

  for (let i = 0; i < buySequence.length; i += 1) {
    await executeBuy(token, trader, buySequence[i], `Step ${i + 1}`);
  }

  for (let i = 0; i < sellSequence.length; i += 1) {
    await executeSell(token, trader, sellSequence[i], `Step ${i + 1 + buySequence.length}`);
  }

  for (let i = 0; i < extraBuys.length; i += 1) {
    await executeBuy(token, trader, extraBuys[i], `Step ${i + 1 + buySequence.length + sellSequence.length}`);
  }

  const finalBalance = await token.balanceOf(trader);
  if (finalBalance > 0n) {
    await executeSell(token, trader, finalBalance, "Final Step");
  }

  const endBalance = await token.balanceOf(trader);
  const soldSupply = await token.soldSupply();

  if (endBalance !== 0n) {
    throw new Error(`${label}: expected trader balance to be 0 after final sell, got ${endBalance.toString()}`);
  }

  console.log(`  ✅ ${label} scenario passed. soldSupply remaining: ${fmt(soldSupply)} tokens`);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Trader:", deployer.address);

  const TokenCurrent = await ethers.getContractFactory("TokenPolicyMint");
  const current = (await TokenCurrent.deploy("CurrentCurve", "CURR", "ipfs://test", deployer.address)) as unknown as ScenarioContract;
  await (current as any).waitForDeployment();

  const TokenSlow = await ethers.getContractFactory("TokenPolicyMintSlowForTest");
  const slow = (await TokenSlow.deploy("SlowCurve", "SLOW", "ipfs://test", deployer.address)) as unknown as ScenarioContract;
  await (slow as any).waitForDeployment();

  const slowConfig: SequenceConfig = {
    buySequence: ["5000", "12000", "25000", "50000", "90000"].map((v) => ethers.parseUnits(v, 18)),
    sellSequence: ["15000", "30000", "45000"].map((v) => ethers.parseUnits(v, 18)),
    extraBuys: ["20000", "35000"].map((v) => ethers.parseUnits(v, 18)),
  };

  const currentConfig: SequenceConfig = {
    buySequence: ["1000", "2000", "4000", "8000", "12000"].map((v) => ethers.parseUnits(v, 18)),
    sellSequence: ["2000", "5000", "7000"].map((v) => ethers.parseUnits(v, 18)),
    extraBuys: ["3000", "7000"].map((v) => ethers.parseUnits(v, 18)),
  };

  await runScenario("Slow slope (test mode)", slow, deployer.address, slowConfig);
  await runScenario("Current slope (production mode)", current, deployer.address, currentConfig);

  console.log("\n✅ All large-quantity buy/sell stress scenarios passed.");
}

main().catch((error) => {
  console.error("❌ Stress test failed:", error);
  process.exitCode = 1;
});
