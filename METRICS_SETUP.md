# Database Migration - Thêm Token Metrics

## Các cột mới thêm vào bảng `tokens`:

- **marketcap** (NUMERIC): Vốn hóa thị trường (price * total_supply)
- **volume_24h** (NUMERIC): Khối lượng giao dịch 24h
- **price_change_5m** (NUMERIC): % thay đổi giá trong 5 phút
- **price_change_1h** (NUMERIC): % thay đổi giá trong 1 giờ
- **price_change_6h** (NUMERIC): % thay đổi giá trong 6 giờ
- **trader_count** (INTEGER): Số lượng traders (nắm giữ token)
- **price_snapshot_time** (TIMESTAMP): Thời điểm snapshot giá
- **price_snapshot_value** (NUMERIC): Giá snapshot để tính % thay đổi

## Cách cập nhật database:

### Option 1: Reset database (nếu đang test)
```bash
cd frontend
npm run reset-db
```

### Option 2: Manual migration (production)
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

## Cách sử dụng API:

### 1. Calculate & Update Metrics (gọi sau mỗi lần mua/bán)
```bash
POST /api/tokens/calculate-metrics
Content-Type: application/json

{
  "token_id": 1,              // (required if no token_address)
  "token_address": "0x...",   // (required if no token_id)
  "current_price": "0.5"      // (optional)
}

Response:
{
  "success": true,
  "data": {
    "token": {...},
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

### 2. Get Token Metrics
```bash
GET /api/tokens/update-metrics?token_id=1
or
GET /api/tokens/update-metrics?token_address=0x...

Response:
{
  "success": true,
  "data": {...token với metrics}
}
```

### 3. Manual Update Metrics (override)
```bash
POST /api/tokens/update-metrics
Content-Type: application/json

{
  "token_id": 1,
  "marketcap": 1000000,
  "volume_24h": 5000,
  "price_change_5m": 2.5,
  "price_change_1h": -1.2,
  "price_change_6h": 5.0,
  "trader_count": 150,
  "current_price": 0.5
}
```

## Cách hiển thị metrics trong UI:

### Import TokenMetrics component:
```tsx
import TokenMetrics from '@/components/TokenMetrics'

// Trong component:
<TokenMetrics token={tokenData} />
```

### Atau sử dụng formatters:
```tsx
import { 
  formatMarketCap, 
  formatVolume, 
  formatPriceChange,
  formatPriceChangeColor,
  formatTraderCount 
} from '@/utils/formatters'

// Format values for display:
<span>{formatMarketCap(token.marketcap)}</span>
<span>{formatVolume(token.volume_24h)}</span>
<span className={formatPriceChangeColor(token.price_change_5m)}>
  {formatPriceChange(token.price_change_5m)}
</span>
<span>{formatTraderCount(token.trader_count)}</span>
```

## Automatic Flow (Luồng tự động):

Khi user mua/bán token:
1. ✅ Gọi smart contract → transaction confirm
2. ✅ Lưu purchase vào database
3. ✅ **Tự động gọi `/api/tokens/calculate-metrics`**
4. ✅ Cập nhật metrics trong token

## Data Calculation Logic:

### Marketcap
```
marketcap = current_price × total_supply
```

### Volume 24h
```
sum(quantity) FROM purchases 
WHERE created_at >= NOW() - INTERVAL '24 hours'
```

### Trader Count
```
COUNT(DISTINCT buyer_address) + COUNT(DISTINCT seller_address)
```

### Price Changes
```
price_change_X% = ((current_price - old_price_X) / old_price_X) × 100
```

- **5m**: Average price từ purchases trong 5 phút trước
- **1h**: Average price từ purchases trong 1 giờ trước (5-60 phút)
- **6h**: Average price từ purchases trong 6 giờ trước (5h50m-6h)

## Notes:

- Metrics được cập nhật **tự động** sau mỗi giao dịch
- Price changes được tính từ lịch sử purchases (không cần external API)
- Có thể query `/api/tokens/update-metrics` để lấy current metrics
- Formatters tự động convert số lớn sang K, M, B, T format
