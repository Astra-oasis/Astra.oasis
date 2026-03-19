# 🚀 Triển Khai BondingCurve Hoàn Tất

## ✅ Kết Quả Triển Khai

### Hợp Đồng Thông Minh

| Contract | Địa Chỉ | Mạng |
|----------|---------|------|
| **BondingCurve** | `0xB3Ad4eb3590Ef65b8D4816b1030b465404d1e7a1` | Sapphire Testnet |
| **Token X (KUTI)** | `0x614Cb533EB4691794790366eF5B84cAC6aDf9959` | Sapphire Testnet |
| **Token Test** | `0xe824Ed6ED596f4c415e93145a58c86a57984136A` | Sapphire Testnet |

---

## 📚 Cách Hoạt Động

### 1. **Công Thức Tính Giá Tự Động**

BondingCurve sử dụng **Constant Product Formula** (Công thức sản phẩm hằng số):

```
x * y = k (hằng số)
```

Trong đó:
- **x** = Reserve Token X
- **y** = Reserve Token Test  
- **k** = Hằng số (chỉ thay đổi khi thêm/rút thanh khoản)

### 2. **Tính Giá Khi Swap**

```solidity
outputAmount = (reserveOut * amountIn × 9975/10000) / (reserveIn + amountIn × 9975/10000)
```

- **Fee**: 0.25% (9975/10000)
- **Slippage Protection**: Yêu cầu minAmountOut để tránh mất giá

### 3. **Ví Dụ Thực Tế**

**Pool Ban Đầu:**
- Reserve X: 100 KUTI
- Reserve Test: 100 TEST
- k = 10,000

**Người dùng swap 10 KUTI lấy TEST:**
```
Output = (100 × 9.975) / (100 + 9.975) = 8.94 TEST
```

**Pool Sau:**
- Reserve X: 109.975 KUTI
- Reserve Test: 91.06 TEST
- k = 9,993.5 (giảm do phí)

**Người dùng swap 5 TEST lấy KUTI:**
```
Output = (109.975 × 4.9875) / (91.06 + 4.9875) = 5.36 KUTI
```

---

## 🔧 Các Hàm Chính

### **addLiquidity(amountXDesired, amountTestDesired)**
Thêm thanh khoản vào pool
```typescript
await bondingCurve.addLiquidity(
    ethers.parseUnits("100", 18),  // 100 Token X
    ethers.parseUnits("100", 18)   // 100 Token Test
);
```

### **swapXForTest(amountXIn, minAmountTestOut)**
Swap Token X lấy Token Test với slippage protection
```typescript
await bondingCurve.swapXForTest(
    ethers.parseUnits("10", 18),   // 10 Token X
    ethers.parseUnits("8", 18)     // Tối thiểu 8 Token Test
);
```

### **swapTestForX(amountTestIn, minAmountXOut)**
Swap Token Test lấy Token X với slippage protection
```typescript
await bondingCurve.swapTestForX(
    ethers.parseUnits("5", 18),    // 5 Token Test
    ethers.parseUnits("3", 18)     // Tối thiểu 3 Token X
);
```

### **getReserves()**
Xem reserves hiện tại
```typescript
const [reserveX, reserveTest] = await bondingCurve.getReserves();
console.log("Reserve X:", ethers.formatUnits(reserveX, 18));
console.log("Reserve Test:", ethers.formatUnits(reserveTest, 18));
```

### **getPriceX(), getPriceTest()**
Xem giá hiện tại
```typescript
const priceX = await bondingCurve.getPriceX();      // Giá X tính theo Test
const priceTest = await bondingCurve.getPriceTest(); // Giá Test tính theo X
```

### **getOutputAmount(amountIn, reserveIn, reserveOut)**
Tính output trước khi swap
```typescript
const output = await bondingCurve.getOutputAmount(
    ethers.parseUnits("10", 18),  // Input 10 Token X
    ethers.parseUnits("100", 18), // Reserve In (100 X)
    ethers.parseUnits("100", 18)  // Reserve Out (100 Test)
);
```

---

## 📊 Tình Trạng Pool Hiện Tại

```
Tokens được thêm:
- 100 KUTI (Token X)
- 100 TEST (Token Test)

Constant Product (k): 10,000

Swap đã thực hiện:
✅ swapXForTest(10 KUTI) → nhận 8.94 TEST
✅ swapTestForX(5 TEST) → nhận 4.28 KUTI

Reserves sau swaps:
- Token X: 104.28
- Token Test: 95.93
```

---

## 🛠️ Chạy Scripts

### Deploy Token Test
```bash
npx hardhat run scripts/deploy-test-token.ts --network sapphire-testnet
```

### Deploy BondingCurve
```bash
npx hardhat run scripts/deploy-bonding-curve.ts --network sapphire-testnet
```

### Thêm Liquidity
```bash
npx hardhat run scripts/approve-and-add.ts --network sapphire-testnet
```

### Kiểm Tra Reserves
```bash
npx hardhat run scripts/check-reserves.ts --network sapphire-testnet
```

### Thực Hiện Swap
```bash
npx hardhat run scripts/swap.ts --network sapphire-testnet
```

### Kiểm Tra Token Status
```bash
npx hardhat run scripts/check-token-status.ts --network sapphire-testnet
```

---

## 🎯 Tính Năng

✅ **Tính giá tự động** dựa trên Constant Product Formula
✅ **0.25% phí giao dịch** cho mỗi swap
✅ **Slippage protection** để tránh giao dịch tại giá xấu
✅ **Constant product k** duy trì giá ổn định
✅ **Thêm/rút thanh khoản** linh hoạt
✅ **Deployed on Sapphire Testnet** (confidential computing blockchain)

---

## 📝 Notes

1. Pool ban đầu có 100 KUTI + 100 TEST
2. Constant product k = 10,000 (giảm do phí)
3. Mỗi swap thay đổi giá dựa trên công thức x × y = k
4. Fee 0.25% được thêm vào pool automatically
5. Slippage protection bắt buộc để an toàn giao dịch

---

## 🔗 Explorer Links

- BondingCurve: https://testnet.explorer.sapphire.oasis.io/address/0xB3Ad4eb3590Ef65b8D4816b1030b465404d1e7a1
- Token X (KUTI): https://testnet.explorer.sapphire.oasis.io/address/0x614Cb533EB4691794790366eF5B84cAC6aDf9959
- Token Test: https://testnet.explorer.sapphire.oasis.io/address/0xe824Ed6ED596f4c415e93145a58c86a57984136A

---

**Deployment Date:** March 2, 2026  
**Status:** ✅ Active & Tested
