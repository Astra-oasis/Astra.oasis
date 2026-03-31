export async function saveWalletInfo(wallet_address: string, info?: { display_name?: string; avatar_url?: string; bio?: string }) {
    try {
        const response = await fetch('/api/wallets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wallet_address,
                display_name: info?.display_name || null,
                avatar_url: info?.avatar_url || null,
                bio: info?.bio || null,
            }),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error saving wallet info:', error);
        throw error;
    }
}

export async function getWalletInfo(wallet_address: string) {
    try {
        const response = await fetch(`/api/wallets?address=${wallet_address}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting wallet info:', error);
        throw error;
    }
}

export async function addWalletCoins(wallet_address: string, coin_addresses: string[], type: 'owned' | 'minted') {
    try {
        const response = await fetch('/api/wallets/coins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wallet_address,
                coin_addresses,
                type,
            }),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error adding wallet coins:', error);
        throw error;
    }
}
