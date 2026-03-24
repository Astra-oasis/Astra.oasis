# 📊 Token Metrics System - Hướng Dẫn Chi Tiết

## ✨ Tính năng

Hệ thống tự động tracking các metrics quan trọng cho mỗi token:

| Metric | Mô tả | Dữ liệu từ |
|--------|-------|-----------|
| **Marketcap** | Vốn hóa thị trường | current_price × total_supply |
| **Volume 24h** | Khối lượng giao dịch trong 24h | Tổng quantity từ purchases table |
| **Price Change 5m** | % thay đổi giá 5 phút gần đây | So sánh giá hiện tại vs 5 phút trước |
| **Price Change 1h** | % thay đổi giá 1 giờ gần đây | So sánh giá hiện tại vs 1 giờ trước |
| **Price Change 6h** | % thay đổi giá 6 giờ gần đây | So sánh giá hiện tại vs 6 giờ trước |
| **Trader Count** | Số lượng traders nắm giữ token | COUNT(DISTINCT addresses) |

## 🔧 Cài đặt

### Step 1: Chạy Migration

#### Option A: Dùng script TypeScript (Recommended)
```bash
cd frontend
npm run ts-node scripts/run-migration.ts
```

#### Option B: Chạy SQL trực tiếp
```bash
psql $DATABASE_URL -f migrations/001_add_token_metrics.sql
```

#### Option C: Manual - Copy SQL vào PostgreSQL client:
```sql
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS marketcap NUMERIC(36, 18) DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS volume_24h NUMERIC(36, 18) DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS price_change_5m NUMERIC(10, 4) DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS price_change_1h NUMERIC(10, 4) DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS price_change_6h NUMERIC(10, 4) DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS trader_count INTEGER DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS price_snapshot_time TIMESTAMP;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS price_snapshot_value NUMERIC(36, 18);
```

### Step 2: Kiểm tra cột được thêm
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tokens' 
AND column_name IN (
  'marketcap', 'volume_24h', 'price_change_5m', 
  'price_change_1h', 'price_change_6h', 'trader_count', 
  'price_snapshot_time', 'price_snapshot_value'
);
```

## 📱 Sử dụng API

### 1️⃣ Calculate Metrics (Automatic)

**Khi nào gọi**: Tự động được gọi trong `savePurchaseToDatabase()` sau mỗi lần mua/bán

**Request**:
```bash
POST /api/tokens/calculate-metrics
Content-Type: application/json

{
  "token_id": 1,
  "current_price": "0.5"
}
```

- `token_id`: ID của token (required nếu không có token_address)
- `token_address`: Contract address (required nếu không có token_id)
- `current_price`: Giá hiện tại (optional, lấy từ snapshot nếu không cung cấp)

**Response**:
```json
{
  "success": true,
  "data": {
    "token": {...token object},
    "metrics": {
      "marketcap": 1000000,
      "volume_24h": 5000,
      "price_change_5m": 2.5,
      "price_change_1h": -1.2,
      "price_change_6h": 5.0,
      "trader_count": 150,
      "current_price": 0.5
    }
  }
}
```

### 2️⃣ Get Token Metrics

**Request**:
```bash
GET /api/tokens/update-metrics?token_id=1
# hoặc
GET /api/tokens/update-metrics?token_address=0x...
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Bitcoin",
    "symbol": "BTC",
    "marketcap": 1000000,
    "volume_24h": 5000,
    "price_change_5m": 2.5,
    "price_change_1h": -1.2,
    "price_change_6h": 5.0,
    "trader_count": 150,
    ...
  }
}
```

### 3️⃣ Manual Update Metrics

**Request**:
```bash
POST /api/tokens/update-metrics
Content-Type: application/json

{
  "token_id": 1,
  "marketcap": 1500000,
  "volume_24h": 6000,
  "price_change_5m": 3.0,
  "price_change_1h": -0.5,
  "price_change_6h": 6.0,
  "trader_count": 200,
  "current_price": 0.6
}
```

**Lưu ý**: Tất cả field là optional, nó sẽ chỉ update các field được cung cấp

## 🎨 Hiển thị Metrics trong UI

### Cách 1: Dùng TokenMetrics Component (Recommended)

```tsx
import TokenMetrics from '@/components/TokenMetrics'

export default function TokenDetail() {
  const [tokenData, setTokenData] = useState(null)

  return (
    <div>
      <TokenMetrics token={tokenData} />
    </div>
  )
}
```

**Output**:
```
📊 Market Cap     📈 24h Volume    5m Change    1h Change    6h Change    👥 Traders
$1.0M             5.0K             +2.50%       -1.20%       +5.00%       150
```

### Cách 2: Dùng Formatters

```tsx
import { 
  formatMarketCap, 
  formatVolume, 
  formatPriceChange,
  formatPriceChangeColor,
  formatTraderCount 
} from '@/utils/formatters'

export default function TokenCard({ token }) {
  return (
    <div className="flex gap-4">
      <div>
        <span className="text-sm text-gray-500">Market Cap</span>
        <p className="text-lg font-bold">{formatMarketCap(token.marketcap)}</p>
      </div>
      
      <div>
        <span className="text-sm text-gray-500">24h Volume</span>
        <p className="text-lg font-bold">{formatVolume(token.volume_24h)}</p>
      </div>
      
      <div>
        <span className="text-sm text-gray-500">6h Change</span>
        <p className={`text-lg font-bold ${formatPriceChangeColor(token.price_change_6h)}`}>
          {formatPriceChange(token.price_change_6h)}
        </p>
      </div>
      
      <div>
        <span className="text-sm text-gray-500">Traders</span>
        <p className="text-lg font-bold">{formatTraderCount(token.trader_count)}</p>
      </div>
    </div>
  )
}
```

### Cách 3: Manual Display

```tsx
export default function MetricsDisplay({ token }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="bg-gray-900 p-3 rounded">
        <p className="text-xs text-gray-500">Market Cap</p>
        <p className="text-xl font-bold text-white">
          ${(token.marketcap / 1_000_000).toFixed(2)}M
        </p>
      </div>
      
      <div className="bg-gray-900 p-3 rounded">
        <p className="text-xs text-gray-500">24h Volume</p>
        <p className="text-xl font-bold text-white">
          {token.volume_24h.toFixed(0)}
        </p>
      </div>
      
      <div className="bg-gray-900 p-3 rounded">
        <p className="text-xs text-gray-500">5m Change</p>
        <p className={`text-xl font-bold ${token.price_change_5m >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {(token.price_change_5m >= 0 ? '+' : '')}{token.price_change_5m.toFixed(2)}%
        </p>
      </div>

      <div className="bg-gray-900 p-3 rounded">
        <p className="text-xs text-gray-500">1h Change</p>
        <p className={`text-xl font-bold ${token.price_change_1h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {(token.price_change_1h >= 0 ? '+' : '')}{token.price_change_1h.toFixed(2)}%
        </p>
      </div>

      <div className="bg-gray-900 p-3 rounded">
        <p className="text-xs text-gray-500">6h Change</p>
        <p className={`text-xl font-bold ${token.price_change_6h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {(token.price_change_6h >= 0 ? '+' : '')}{token.price_change_6h.toFixed(2)}%
        </p>
      </div>

      <div className="bg-gray-900 p-3 rounded">
        <p className="text-xs text-gray-500">Traders</p>
        <p className="text-xl font-bold text-white">{token.trader_count}</p>
      </div>
    </div>
  )
}
```

## 🔄 Flow: Buy/Sell Token

```
User Click "Buy" Token
     ↓
handleTrade() executes
     ↓
buyTokens() → smart contract
     ↓
tx.wait() → transaction confirmed
     ↓
savePurchaseToDatabase()
  └─ Insert into purchases table ✓
  └─ calculateAndUpdateMetrics() ← AUTOMATIC
     ├─ Calculate marketcap = price × supply
     ├─ Calculate volume_24h = SUM(quantity) 
     ├─ Calculate trader_count = DISTINCT addresses
     ├─ Calculate price_change_5m/1h/6h
     └─ Update tokens table ✓
     ↓
Success toast + reload data
```

## 📊 Database Queries

### Get Top Tokens by Marketcap
```sql
SELECT id, name, symbol, marketcap, volume_24h, trader_count
FROM tokens
WHERE marketcap > 0
ORDER BY marketcap DESC
LIMIT 10;
```

### Get Trending Tokens (by 24h change)
```sql
SELECT id, name, symbol, price_change_24h, volume_24h
FROM tokens
WHERE price_change_6h > 5
ORDER BY volume_24h DESC;
```

### Get Most Active Traders
```sql
SELECT id, name, symbol, trader_count, volume_24h
FROM tokens
WHERE trader_count > 0
ORDER BY trader_count DESC
LIMIT 10;
```

### Monitor Metric Updates
```sql
SELECT id, name, symbol, updated_at, marketcap, volume_24h, trader_count
FROM tokens
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
```

## ⚠️ Important Notes

1. **Price Changes** được tính từ **purchase history**, không từ external API
2. **Metrics được update tự động** sau mỗi giao dịch
3. **Volume 24h** bao gồm tất cả buy + sell transactions
4. **Trader Count** tính unique addresses từ `buyer_address` và `seller_address`
5. **Formatters** tự động convert số lớn: 1.5M, 2.5K, 3.5B, etc

## 🐛 Troubleshooting

### Metrics không update
- Kiểm tra console.log trong `calculateAndUpdateMetrics()`
- Kiểm tra API response từ `/api/tokens/calculate-metrics`
- Kiểm tra database bằng query: `SELECT * FROM tokens WHERE id = X;`

### Price changes luôn 0
- Cần ít nhất 1 purchase trong khoảng thời gian đó
- Check `price_snapshot_value` có được set không
- Kiểm trace log trong `calculate-metrics` API

### Trader count sai
- Database cần ít nhất 2 purchases từ 2 addresses khác nhau
- Kiểm tra bảng purchases: `SELECT DISTINCT buyer_address, seller_address FROM purchases WHERE token_id = X;`

## 📝 Todo/Next Steps

- [ ] Thêm historical metrics table để track dữ liệu theo thời gian
- [ ] Tạo chart để visualize price changes
- [ ] Thêm cảnh báo khi metrics thay đổi vượt quá threshold
- [ ] Tạo leaderboard tokens theo marketcap, volume, traders
- [ ] Export metrics data dạng CSV/JSON
