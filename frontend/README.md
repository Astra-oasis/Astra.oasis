# Frontend

This is the frontend for the Sapphire dApp.

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

## Private Trades (ROFL)

To store trade quantities in private mode, configure a ROFL worker endpoint:

```bash
ROFL_WORKER_URL=https://your-rofl-worker.example.com
ROFL_WORKER_API_KEY=your_worker_token
NEXT_PUBLIC_USE_TEE_PRIVATE_TRADES=true
```

The app posts plaintext quantity to `POST {ROFL_WORKER_URL}/encrypt` and expects:

```json
{ "ciphertext": "..." }
```

For TEE trade execution, the app sends a signed EIP-712 intent to `POST /api/private-trades`.
That endpoint verifies signature and forwards to `POST {ROFL_WORKER_URL}/trade-intent`.

Worker response shape expected:

```json
{
	"txHash": "0x...",
	"totalPrice": "0.123",
	"pricePerToken": "0.00045",
	"status": "confirmed"
}
```

If `ROFL_WORKER_URL` is missing, private purchase writes will fail by design.

Important: full on-chain amount privacy requires deploying the updated token contract that does not emit amount in trade events.
Existing deployed tokens that still emit `TokenPurchased/TokenSold(amount,...)` will continue leaking amount in logs.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.