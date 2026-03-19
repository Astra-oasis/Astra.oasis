# BondingCurve Contract - Hướng Dẫn

## 📚 Tổng Quan

**BondingCurve** là smart contract tự động tính giá token dựa trên **Constant Product Formula** (công thức sản phẩm hằng số) - giống như Uniswap AMM.

## 🎯 Công Thức Tính Giá

### Constant Product Formula
```
x * y = k
```

Trong đó:
- **x** = số lượng Token X trong pool
- **y** = số lượng Token Test trong pool  
- **k** = hằng số không đổi (trừ khi thêm/rút thanh khoản)

### Khi Swap (mua/bán token):

1. **Người dùng gửi amountIn của token A**
2. **Contract tính:**
   ```
   outputAmount = (reserveB * amountIn_afterFee) / (reserveA + amountIn_afterFee)
   ```
3. **Cập nhật reserves:**
   - reserveA += amountIn
   - reserveB -= outputAmount

### Ví Dụ Cụ Thể:
```
Pool ban đầu:
- Token X: 1000
- Token Test: 5000
- k = 1000 * 5000 = 5,000,000

Người dùng swap: 100 Token X → ? Token Test
Output = (5000 * 99.75) / (1000 + 99.75) = 497.51 Token Test

Pool sau:
- Token X: 1099.75
- Token Test: 4502.49
- k = 1099.75 * 4502.49 = 4,950,000 (giảm do phí 0.25%)
```

## 📋 Các Hàm Chính

### 1. **addLiquidity(amountXDesired, amountTestDesired)**
Thêm thanh khoản vào pool
```solidity
// Provider gửi token X và Test, duy trì tỷ lệ pool
await bondingCurve.addLiquidity(ethers.parseEther("100"), ethers.parseEther("500"));
```

### 2. **swapXForTest(amountXIn)**  
Swap Token X lấy Token Test
```solidity
// Gửi 10 Token X, nhận bao nhiêu Token Test tùy giá
uint256 amountOut = await bondingCurve.swapXForTest(ethers.parseEther("10"));
```

### 3. **swapTestForX(amountTestIn)**
Swap Token Test lấy Token X
```solidity
// Gửi 50 Token Test, nhận bao nhiêu Token X tùy giá
uint256 amountOut = await bondingCurve.swapTestForX(ethers.parseEther("50"));
```

### 4. **getPriceX()** / **getPriceTest()**
Xem giá hiện tại
```solidity
// Giá của Token X = reserveTest / reserveX
uint256 priceX = await bondingCurve.getPriceX();
// Kết quả: 1 Token X = 5 Token Test (với ví dụ trên)
```

### 5. **getReserves()**
Xem số lượng token hiện tại trong pool
```solidity
const [resX, resTest] = await bondingCurve.getReserves();
console.log("Token X:", resX);
console.log("Token Test:", resTest);
```

### 6. **getConstantProduct()**
Xem k (hằng số)
```solidity
const k = await bondingCurve.getConstantProduct();
```

## 🚀 Hướng Dẫn Deploy

### Bước 1: Chuẩn bị
```bash
# Cập nhật lại script deploy
# Thay tokenXAddress và tokenTestAddress bằng địa chỉ token thực tế của bạn
nano scripts/deploy-bonding-curve.ts
```

### Bước 2: Deploy Contract
```bash
npx hardhat run scripts/deploy-bonding-curve.ts --network sapphire-testnet
```

### Bước 3: Approve Token (QUAN TRỌNG!)
```javascript
// Cho phép BondingCurve có thể sử dụng token của bạn
const tokenXContract = new ethers.Contract(TOKEN_X_ADDRESS, ERC20_ABI, signer);
const tokenTestContract = new ethers.Contract(TOKEN_TEST_ADDRESS, ERC20_ABI, signer);

const approveAmount = ethers.parseEther("100000"); // Approve 100000 token

await tokenXContract.approve(BONDING_CURVE_ADDRESS, approveAmount);
await tokenTestContract.approve(BONDING_CURVE_ADDRESS, approveAmount);
```

### Bước 4: Thêm Liquidity
```javascript
// Thêm 100 Token X và 500 Token Test vào pool
await bondingCurve.addLiquidity(
    ethers.parseEther("100"),
    ethers.parseEther("500")
);
```

### Bước 5: Swap Token
```javascript
// Swap 10 Token X lấy Token Test
const amountOut = await bondingCurve.swapXForTest(ethers.parseEther("10"));
console.log("Nhận được:", ethers.formatEther(amountOut), "Token Test");
```

## 📊 Các Tính Chất Của Bonding Curve

| Tính chất | Mô tả |
|-----------|-------|
| **Tự động tính giá** | Giá thay đổi dựa theo tỷ lệ token trong pool |
| **Slippage** | Giao dịch lớn sẽ tốn giá hơn |
| **Pool bằng** | Không cần bên nào "làm thị trường" |
| **Phí giao dịch** | 0.25% mỗi swap |
| **Thanh khoản** | Cần init pool trước khi có thể trade |

## ✏️ Thay Đổi Công Thức (Optional)

Nếu muốn dùng công thức khác:

### Linear Bonding Curve
```solidity
// price = k * supply
outputAmount = (reserveOut * amountIn) / (k * reserveIn);
```

### Exponential Bonding Curve  
```solidity
// price = k * e^(supply)
// Phức tạp hơn, cần dùng logarithm
```

Hiện tại contract dùng **Constant Product Formula** vì đơn giản, hiệu quả, và được chứng minh.

## 🔧 Config Có Thể Thay Đổi

```solidity
feePercentage = 25;  // 0.25% fee
// Thay đổi bằng setFeePercentage(newFee)

DECIMALS = 18;  // Theo ERC20 standard
```

## 🐛 Common Issues

### ❌ "TokenX transfer failed"
→ Chưa approve token cho BondingCurve contract

### ❌ "Pool has no liquidity"  
→ Chưa gọi addLiquidity()

### ❌ "Insufficient liquidity"
→ Pool không đủ token để swap

### ✅ Giải pháp
1. Kiểm tra approve trước khi call
2. Luôn addLiquidity trước khi swap
3. Kiểm tra reserves bằng getReserves()

---

**📞 Hỗ trợ:** Tham khảo events và logs để debug giao dịch
