'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI } from '@/abi/bondingCurveAbi';

interface TokenTraderProps {
    selectedToken?: any;
}

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function transfer(address to, uint256 amount) external returns (bool)",
];

export default function TokenTrader({ selectedToken }: TokenTraderProps) {
    const [loading, setLoading] = useState(false);
    const [buyAmount, setBuyAmount] = useState('');
    const [totalPrice, setTotalPrice] = useState('0');
    const [poolStats, setPoolStats] = useState({
        price: '0',
        reserves: '0',
        volume24h: '--'
    });

    // Nếu không có selectedToken, show default message
    if (!selectedToken) {
        return (
            <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#9ca3af'
            }}>
                <p style={{ marginBottom: '1rem' }}>No token selected</p>
            </div>
        );
    }

    const handleBuyToken = async () => {
        if (!buyAmount || parseFloat(buyAmount) <= 0) {
            alert('Vui lòng nhập số lượng hợp lệ');
            return;
        }

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const tokenContract = new ethers.Contract(
                selectedToken.tokenAddress,
                ["function buyTokens(uint256 amount) payable returns (bool)"],
                signer
            );

            const amountToBuy = ethers.parseEther(buyAmount);

            // Convert BigInt to proper format
            const pricePerTokenBigInt = BigInt(selectedToken.pricePerToken.toString());
            const totalPriceWei = (amountToBuy * pricePerTokenBigInt) / ethers.parseEther('1');

            console.log('Buying token...', {
                amount: buyAmount,
                amountWei: amountToBuy.toString(),
                pricePerToken: pricePerTokenBigInt.toString(),
                totalPrice: totalPriceWei.toString(),
                totalPriceETH: ethers.formatEther(totalPriceWei)
            });

            // Gọi buyTokens với value parameter
            const buyTx = await tokenContract.buyTokens(amountToBuy, {
                value: totalPriceWei,
                gasLimit: 200000
            });

            await buyTx.wait();
            alert(`✅ Mua ${buyAmount} tokens thành công!`);
            setBuyAmount('');
            setTotalPrice('0');
        } catch (error: any) {
            console.error('Error buying token:', error);
            alert('❌ Mua token thất bại: ' + (error.reason || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSellToken = async () => {
        if (!buyAmount || parseFloat(buyAmount) <= 0) {
            alert('Vui lòng nhập số lượng hợp lệ');
            return;
        }

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const tokenContract = new ethers.Contract(selectedToken.tokenAddress, ["function sellTokens(uint256 amount)", "function approve(address spender, uint256 amount) returns (bool)"], signer);

            const amountToSell = ethers.parseEther(buyAmount);

            console.log('Selling token...', { amount: buyAmount });

            // Approve trước
            const approveTx = await tokenContract.approve(selectedToken.tokenAddress, amountToSell);
            await approveTx.wait();
            console.log('✅ Token approved');

            // Bán token
            const sellTx = await tokenContract.sellTokens(amountToSell);
            await sellTx.wait();

            alert(`✅ Bán ${buyAmount} tokens thành công!`);
            setBuyAmount('');
            setTotalPrice('0');
        } catch (error: any) {
            console.error('Error selling token:', error);
            alert('❌ Bán token thất bại: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAmountChange = (e: any) => {
        const amount = e.target.value;
        setBuyAmount(amount);

        if (amount && parseFloat(amount) > 0) {
            try {
                // Convert properly
                const pricePerTokenBigInt = BigInt(selectedToken.pricePerToken.toString());
                const amountBigInt = ethers.parseEther(amount);
                const totalWei = (amountBigInt * pricePerTokenBigInt) / ethers.parseEther('1');
                const totalEth = ethers.formatEther(totalWei);
                setTotalPrice(totalEth);
            } catch (e) {
                console.error('Error calculating price:', e);
                setTotalPrice('--');
            }
        } else {
            setTotalPrice('0');
        }
    };

    return (
        <div style={{ padding: '1.5rem' }}>
            {/* Pool Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Price</p>
                    <p style={{ color: '#fff', fontSize: '1.25rem', fontWeight: '700' }}>
                        {ethers.formatEther(selectedToken.pricePerToken).slice(0, 10)} TEST
                    </p>
                </div>

                <div style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Available</p>
                    <p style={{ color: '#fff', fontSize: '1.25rem', fontWeight: '700' }}>
                        {ethers.formatEther(selectedToken.availableAmount).slice(0, 10)}
                    </p>
                </div>

                <div style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Market Cap</p>
                    <p style={{ color: '#22c55e', fontSize: '1.25rem', fontWeight: '700' }}>
                        ${(parseFloat(ethers.formatEther(selectedToken.contractBalance)) *
                            parseFloat(ethers.formatEther(selectedToken.pricePerToken))).toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Buy/Sell Section */}
            <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                border: '1px solid rgba(139, 92, 246, 0.2)'
            }}>
                <h3 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1.1rem' }}>💱 Trade Token</h3>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ color: '#9ca3af', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                        Amount
                    </label>
                    <input
                        type="number"
                        value={buyAmount}
                        onChange={handleAmountChange}
                        placeholder="0.0"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(17, 24, 39, 0.6)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: '0.5rem',
                            color: '#fff',
                            fontSize: '1rem',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                <div style={{
                    background: 'rgba(17, 24, 39, 0.4)',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1.5rem',
                    border: '1px solid rgba(139, 92, 246, 0.1)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '0.85rem' }}>
                        <span>Total Price</span>
                        <span style={{ color: '#fff', fontWeight: '600' }}>{totalPrice} TEST</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={handleBuyToken}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: loading ? 'rgba(34, 197, 94, 0.3)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            opacity: loading ? 0.5 : 1
                        }}
                    >
                        {loading ? '⏳ Processing...' : '📈 Buy'}
                    </button>
                    <button
                        onClick={handleSellToken}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: loading ? 'rgba(239, 68, 68, 0.3)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            opacity: loading ? 0.5 : 1
                        }}
                    >
                        {loading ? '⏳ Processing...' : '📉 Sell'}
                    </button>
                </div>
            </div>
        </div>
    );
}
