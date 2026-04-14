import pkg from "hardhat";

const { ethers } = pkg;

const MIN_TOKEN_UNITS = 1_000n;
const ONE_TOKEN = 10n ** 18n;
const GAS_RESERVE = ethers.parseEther("0.03");

type TokenContract = {
  getBuyPrice(amount: bigint): Promise<bigint>;
  getSellPrice(amount: bigint): Promise<bigint>;
  getTradeFees(amount: bigint): Promise<[bigint, bigint, bigint]>;
  buyTokens(amount: bigint, overrides: { value: bigint; gasLimit: bigint }): Promise<{ hash: string; wait: () => Promise<any> }>;
  sellTokens(amount: bigint, overrides: { gasLimit: bigint }): Promise<{ hash: string; wait: () => Promise<any> }>;
  balanceOf(account: string): Promise<bigint>;
  soldSupply(): Promise<bigint>;
  getCurrentPrice(): Promise<bigint>;
};

function toAmount(units: bigint) {
  return units * ONE_TOKEN;
}

function fmt(value: bigint) {
  return ethers.formatEther(value);
}

function fmtToken(amount: bigint) {
  return ethers.formatUnits(amount, 18);
}

async function quoteTotalCost(token: TokenContract, amount: bigint) {
  const base = await token.getBuyPrice(amount);
  const [, , fee] = await token.getTradeFees(base);
  return { base, fee, total: base + fee };
}

async function findAffordableAmount(token: TokenContract, targetUnits: bigint, budgetWei: bigint) {
  let lo = MIN_TOKEN_UNITS;
  let hi = targetUnits;
  let best = 0n;

  const minAmount = toAmount(lo);
  const minQuote = await quoteTotalCost(token, minAmount);
  if (minQuote.total > budgetWei) return 0n;

  while (lo <= hi) {
    const mid = (lo + hi) / 2n;
    const amount = toAmount(mid);
    const quote = await quoteTotalCost(token, amount);

    if (quote.total <= budgetWei) {
      best = mid;
      lo = mid + 1n;
    } else {
      hi = mid - 1n;
    }
  }

  return best;
}

async function expectRevert(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    throw new Error(`${label} did not revert`);
  } catch (error: any) {
    const msg = String(error?.message || error);
    if (msg.includes("did not revert")) throw error;
    console.log(`  ✅ Revert check passed: ${label}`);
  }
}

async function executeBuy(token: TokenContract, trader: string, units: bigint, step: string) {
  if (units <= 0n) {
    throw new Error(`${step}: invalid buy units ${units.toString()}`);
  }

  const amount = toAmount(units);
  const quote = await quoteTotalCost(token, amount);
  const gasLimit = 250000n;
  const tx = await token.buyTokens(amount, { value: quote.total, gasLimit });
  const receipt = await tx.wait();
  const balance = await token.balanceOf(trader);
  const price = await token.getCurrentPrice();

  console.log(`  ${step} BUY ${units.toString()} tokens | base=${fmt(quote.base)} TEST | fee=${fmt(quote.fee)} TEST | total=${fmt(quote.total)} TEST | tx=${receipt.hash}`);
  console.log(`    Wallet token balance: ${fmtToken(balance)} | Current price: ${fmt(price)} TEST`);

  return quote.total;
}

async function executeSell(token: TokenContract, trader: string, amount: bigint, step: string) {
  if (amount <= 0n) {
    throw new Error(`${step}: invalid sell amount ${amount.toString()}`);
  }

  const gross = await token.getSellPrice(amount);
  const [, , fee] = await token.getTradeFees(gross);
  const net = gross - fee;

  const gasLimit = 180000n;
  const tx = await token.sellTokens(amount, { gasLimit });
  const receipt = await tx.wait();
  const balance = await token.balanceOf(trader);
  const price = await token.getCurrentPrice();

  console.log(`  ${step} SELL ${fmtToken(amount)} tokens | gross=${fmt(gross)} TEST | fee=${fmt(fee)} TEST | net=${fmt(net)} TEST | tx=${receipt.hash}`);
  console.log(`    Wallet token balance: ${fmtToken(balance)} | Current price: ${fmt(price)} TEST`);
}

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY in environment");
  }

  const signer = new ethers.Wallet(privateKey, ethers.provider);
  const wallet = await signer.getAddress();
  console.log("Trader:", wallet);

  const startBalance = await ethers.provider.getBalance(wallet);
  console.log("Wallet TEST balance:", fmt(startBalance));

  const Token = await ethers.getContractFactory("TokenPolicyMint", signer);
  const token = (await Token.deploy("RealStress", "RST", "ipfs://real-stress", wallet)) as unknown as TokenContract;
  await (token as any).waitForDeployment();
  const tokenAddress = await (token as any).getAddress();
  console.log("Deployed token:", tokenAddress);

  console.log("\n[Phase 1] Validate critical formula target");
  const targetUnits = 20_000n;
  const targetAmount = toAmount(targetUnits);
  const targetQuote = await quoteTotalCost(token, targetAmount);
  console.log(`  Quote BUY 20000 tokens => base=${fmt(targetQuote.base)} TEST, fee=${fmt(targetQuote.fee)} TEST, total=${fmt(targetQuote.total)} TEST`);

  const limit = ethers.parseEther("500");
  if (targetQuote.base > limit) {
    throw new Error(`Formula check failed: base buy price for 20,000 tokens is ${fmt(targetQuote.base)} TEST (> 500 TEST)`);
  }
  console.log("  ✅ Formula check passed: base cost for 20,000 tokens <= 500 TEST");

  console.log("\n[Phase 2] Revert and edge cases (real call validation)");
  await expectRevert("buyTokens with insufficient payment", async () => {
    await (token as any).buyTokens.staticCall(targetAmount, { value: targetQuote.total - 1n });
  });
  await expectRevert("sellTokens with zero amount", async () => {
    await (token as any).sellTokens.staticCall(0n);
  });
  await expectRevert("sellTokens more than balance", async () => {
    await (token as any).sellTokens.staticCall(toAmount(999_999_999n));
  });

  console.log("\n[Phase 3] Real stress sequence buy/sell");
  const plannedBuys = [20_000n, 30_000n, 45_000n, 65_000n, 90_000n];

  for (let i = 0; i < plannedBuys.length; i += 1) {
    const walletBalance = await ethers.provider.getBalance(wallet);
    const spendable = walletBalance > GAS_RESERVE ? walletBalance - GAS_RESERVE : 0n;
    const targetUnitsForStep = plannedBuys[i];
    const affordableUnits = await findAffordableAmount(token, targetUnitsForStep, spendable);

    if (affordableUnits < MIN_TOKEN_UNITS) {
      console.log(`  Step ${i + 1} skipped (insufficient spendable balance ${fmt(spendable)} TEST)`);
      continue;
    }

    await executeBuy(token, wallet, affordableUnits, `Step ${i + 1}`);
  }

  const afterBuys = await token.balanceOf(wallet);
  const sell1 = (afterBuys * 20n) / 100n;
  const sell2 = (afterBuys * 25n) / 100n;
  const sell3 = (afterBuys * 30n) / 100n;

  if (sell1 > 0n) await executeSell(token, wallet, sell1, "Step 6");
  if (sell2 > 0n) await executeSell(token, wallet, sell2, "Step 7");
  if (sell3 > 0n) await executeSell(token, wallet, sell3, "Step 8");

  const extraBuyTargets = [35_000n, 50_000n];
  for (let i = 0; i < extraBuyTargets.length; i += 1) {
    const walletBalance = await ethers.provider.getBalance(wallet);
    const spendable = walletBalance > GAS_RESERVE ? walletBalance - GAS_RESERVE : 0n;
    const affordableUnits = await findAffordableAmount(token, extraBuyTargets[i], spendable);

    if (affordableUnits < 5_000n) {
      console.log(`  Step ${9 + i} skipped (insufficient spendable balance ${fmt(spendable)} TEST)`);
      continue;
    }

    await executeBuy(token, wallet, affordableUnits, `Step ${9 + i}`);
  }

  const finalBalance = await token.balanceOf(wallet);
  if (finalBalance > 0n) {
    await executeSell(token, wallet, finalBalance, "Final Step");
  }

  const endBalance = await token.balanceOf(wallet);
  const endSoldSupply = await token.soldSupply();
  const endWalletBalance = await ethers.provider.getBalance(wallet);

  if (endBalance !== 0n) {
    throw new Error(`Final sell check failed. Remaining token balance: ${fmtToken(endBalance)}`);
  }

  console.log("\n✅ Real buy/sell test completed successfully.");
  console.log("Remaining soldSupply:", fmtToken(endSoldSupply));
  console.log("Wallet TEST balance after test:", fmt(endWalletBalance));
}

main().catch((error) => {
  console.error("❌ Real stress test failed:", error);
  process.exitCode = 1;
});
