# 🎯 Triển Khai Giá Token Tự Động - Hướng Dẫn Sử Dụng

## ✅ Các Tính Năng Đã Hoàn Thành

### 1. **BondingCurve Contract**
- ✅ Deploy tại: `0xB3Ad4eb3590Ef65b8D4816b1030b465404d1e7a1`
- ✅ Tính giá tự động theo **Constant Product Formula**
- ✅ Support slippage protection
- ✅ 0.25% phí giao dịch

### 2. **Frontend Integration**
- ✅ TokenMarketplace hiển thị danh sách token
- ✅ Click vào token → mở Trading Modal
- ✅ TokenTrader component với Buy/Sell UI
- ✅ Hiển thị giá và thông tin token

### 3. **Smart Contract Cập Nhật**
- ✅ `swapXForTest(amountIn, minAmountOut)` - Slippage protection
- ✅ `swapTestForX(amountIn, minAmountOut)` - Slippage protection
- ✅ `getReserves()` - Xem reserves
- ✅ `getPriceX()` - Xem giá X theo Test
- ✅ `getOutputAmount()` - Tính output antes khi swap

---

## 🚀 Cách Sử Dụng

### Step 1: Kết Nối Ví
1. Truy cập: **http://localhost:3001**
2. Nhấn "Connect Wallet" ở góc trên cùng
3. Chọn MetaMask hoặc ví khác
4. Được thêm vào Sapphire Testnet nếu chưa có

### Step 2: Xem Token Marketplace
- Trang chủ sẽ hiển thị **Token Trading** marketplace
- Danh sách token được tạo sẽ hiển thị dưới dạng card

### Step 3: Buy Token
1. **Nhấn vào token card** bất kỳ
2. **Trading Modal** sẽ mở ra
3. Nhập **Amount** token muốn mua
4. Nhấn **"📈 Buy"** button
5. Confirm transaction trên wallet
6. ✅ Token được thêm vào wallet của bạn

### Step 4: Sell Token
1. **Nhấn vào token card** mà bạn sở hữu
2. Nhập **Amount** token muốn bán
3. Nhấn **"📉 Sell"** button
4. Confirm transaction
5. ✅ Nhận TEST token

---

## 📊 BondingCurve Pricing

### Cách Tính Giá

Công thức: 
```
outputAmount = (reserveOut × amountIn × 0.9975) / (reserveIn + amountIn × 0.9975)
```

### Ví Dụ
```
Pool: 100 KUTI <-> 100 TEST
k = 10,000

Swap 10 KUTI → ?
Output = (100 × 9.975) / (100 + 9.975) = 8.94 TEST

Pool sau: 109.975 KUTI <-> 91.06 TEST
```

---

## 🔧 Contract Addresses (Sapphire Testnet)

| Contract | Địa Chỉ |
|----------|---------|
| **BondingCurve** | `0xB3Ad4eb3590Ef65b8D4816b1030b465404d1e7a1` |
| **Token X (KUTI)** | `0x614Cb533EB4691794790366eF5B84cAC6aDf9959` |
| **Token Test (TEST)** | `0xe824Ed6ED596f4c415e93145a58c86a57984136A` |
| **TokenFactory** | (Tùy chỉnh khi deploy) |

---

## 🎨 Frontend Components

### 1. **TokenMarketplace** 
- Hiển thị tất cả token
- Click token → mở modal trading
- Live refresh token list

### 2. **TokenTrader**
- Xem thông tin token (Price, Available, Market Cap)
- Input amount → tính total price
- Buy/Sell buttons
- Real-time calculation

### 3. **BondingCurveTrader** (Advanced)
- Swap giữa KUTI ↔ TEST
- View pool reserves
- View current prices
- Calculate slippage

---

## 🐛 Troubleshooting

### 1. **"Please connect wallet"**
   - Nhấn Connect Wallet ở header
   - Chọn MetaMask

### 2. **"Token is not for sale"**
   - Token creator cần bật sale status
   - Hoặc token chưa được approve

### 3. **"Insufficient balance"**
   - Không đủ TEST token để mua
   - Yêu cầu faucet từ Sapphire Testnet

### 4. **"Slippage tolerance exceeded"**
   - Market price thay đổi quá nhanh
   - Thử lại hoặc tăng slippage tolerance

---

## 📝 Công Thức Bonding Curve

### Constant Product Formula
```
x × y = k (hằng số)
```

**Ý nghĩa:**
- Khi mua nhiều → giá tăng
- Khi bán nhiều → giá giảm
- Giá tự động điều chỉnh theo supply/demand

### Price Movement
```
Trước: x = 100, y = 100, k = 10,000
Mua 10x: y giảm → (100 × 9.975) / 109.975 ≈ 9.07 (giá cao hơn)
Bán 5x:  y tăng → (109.975 × 4.9875) / 100 ≈ 5.48 (giá thấp hơn)
```

---

## 🔐 Security Features

✅ **Slippage Protection**: Yêu cầu minAmountOut để tránh MEV attacks  
✅ **Approval Pattern**: Phải approve trước khi swap  
✅ **Fee Collection**: 0.25% tự động vào pool  
✅ **No Flashloan Risk**: Private blockchain (Sapphire)

---

## 📈 Monitoring

### Xem Pool Status
```bash
npx hardhat run scripts/check-reserves.ts --network sapphire-testnet
```

### Xem Token Status
```bash
npx hardhat run scripts/check-token-status.ts --network sapphire-testnet
```

### Test Swap
```bash
npx hardhat run scripts/swap.ts --network sapphire-testnet
```

---

## 💡 Tips

1. **Thêm Liquidity Sớm**: Thêm tokens vào pool sẽ tạo pool depth
2. **Monitor Price**: Giá sẽ tăng khi có buyer, giảm khi có seller
3. **Use Slippage**: Luôn đặt min slippage 1-5% để tránh bad timing
4. **Pool Depth**: Yêu cầu reserves lớn để tránh high slippage

---

**Status**: ✅ Live on Sapphire Testnet  
**Frontend**: http://localhost:3001  
**Last Updated**: March 2, 2026
