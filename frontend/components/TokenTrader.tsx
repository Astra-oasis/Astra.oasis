'use client'

import { useState, useEffect } from 'react'
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers'
import { wrapEthereumProvider } from '@oasisprotocol/sapphire-paratime'
import { TOKEN_ABI } from '../abi/factoryAbi'

interface TokenTraderProps {
  selectedToken: any
  onSuccess?: () => void
}

export default function TokenTrader({ selectedToken, onSuccess }: TokenTraderProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [estimatedCost, setEstimatedCost] = useState('0')
  const [currentPrice, setCurrentPrice] = useState('0')
  const [bondingProgress, setBondingProgress] = useState(0)
  const [soldSupply, setSoldSupply] = useState('0')
  const [availableTokens, setAvailableTokens] = useState('0')
  const [userAddress, setUserAddress] = useState('')

  const getProvider = async () => {
    let ethereum = window.ethereum
    if (window.ethereum?.providers) {
      ethereum = window.ethereum.providers.find((provider: any) => provider.isMetaMask)
    }
    const wrappedProvider = wrapEthereumProvider(ethereum)
    return new BrowserProvider(wrappedProvider)
  }

  useEffect(() => {
    loadTokenData()
    loadUserAddress()
  }, [selectedToken])

  useEffect(() => {
    calculateEstimatedCost()
  }, [amount, activeTab, selectedToken])

  const loadUserAddress = async () => {
    try {
      const provider = await getProvider()
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      setUserAddress(address)
    } catch (error) {
      console.error('Error loading user address:', error)
    }
  }

  const loadTokenData = async () => {
    try {
      const provider = await getProvider()
      const tokenContract = new Contract(selectedToken.tokenAddress, TOKEN_ABI, provider)

      const [price, progress, sold, available] = await Promise.all([
        tokenContract.getCurrentPrice(),
        tokenContract.getBondingProgress(),
        tokenContract.soldSupply(),
        tokenContract.getAvailableTokens()
      ])

      setCurrentPrice(formatEther(price))
      setBondingProgress(Number(progress))
      setSoldSupply(formatEther(sold))
      setAvailableTokens(formatEther(available))
    } catch (error) {
      console.error('Error loading token data:', error)
    }
  }

  const calculateEstimatedCost = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setEstimatedCost('0')
      return
    }

    try {
      const provider = await getProvider()
      const tokenContract = new Contract(selectedToken.tokenAddress, TOKEN_ABI, provider)
      const amountBigInt = parseEther(amount)

      if (activeTab === 'buy') {
        const cost = await tokenContract.getBuyPrice(amountBigInt)
        setEstimatedCost(formatEther(cost))
      } else {
        const returnAmount = await tokenContract.getSellPrice(amountBigInt)
        setEstimatedCost(formatEther(returnAmount))
      }
    } catch (error) {
      console.error('Error calculating cost:', error)
      setEstimatedCost('0')
    }
  }

  const savePurchaseToDatabase = async (type: 'buy' | 'sell', txHash: string, amount: string, price: string) => {
    try {
      // Get token_id from database
      const tokenResponse = await fetch(`/api/tokens/by-address?contract_address=${selectedToken.tokenAddress}`)
      const tokenData = await tokenResponse.json()

      if (!tokenData.success || !tokenData.token_id) {
        console.warn('Could not find token in database')
        return
      }

      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_id: tokenData.token_id,
          buyer_address: type === 'buy' ? userAddress : null,
          seller_address: type === 'sell' ? userAddress : null,
          quantity: amount,
          price_per_token: currentPrice,
          total_price: price,
          transaction_hash: txHash,
          status: 'completed',
        }),
      })

      if (response.ok) {
        console.log('Purchase saved to database')
      } else {
        console.warn('Failed to save purchase to database')
      }
    } catch (error) {
      console.warn('Error saving purchase to database:', error)
    }
  }

  const handleBuy = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('❌ Please enter a valid amount!')
      return
    }

    setLoading(true)
    try {
      const provider = await getProvider()
      const signer = await provider.getSigner()
      const tokenContract = new Contract(selectedToken.tokenAddress, TOKEN_ABI, signer)

      const amountToBuy = parseEther(amount)
      const totalPrice = await tokenContract.getBuyPrice(amountToBuy)

      console.log('Buying tokens...', {
        amount: amountToBuy.toString(),
        totalPrice: totalPrice.toString()
      })

      const buyTx = await tokenContract.buyTokens(amountToBuy, { value: totalPrice })
      const receipt = await buyTx.wait()

      console.log('Tokens bought successfully:', receipt.hash)

      // Save to database
      await savePurchaseToDatabase('buy', receipt.hash, amount, formatEther(totalPrice))

      alert(`✅ Successfully bought ${amount} tokens!\nTx: ${receipt.hash}`)

      setAmount('')
      await loadTokenData()

      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error buying token:', error)
      if (error.message.includes('insufficient funds')) {
        alert('❌ Insufficient TEST tokens!')
      } else if (error.message.includes('Not enough tokens available')) {
        alert('❌ Not enough tokens available!')
      } else if (error.message.includes('Token is not for sale')) {
        alert('❌ Token is not for sale!')
      } else if (error.message.includes('user rejected')) {
        alert('❌ Transaction rejected!')
      } else {
        alert(`❌ Error buying token: ${error.message || error}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSell = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('❌ Please enter a valid amount!')
      return
    }

    setLoading(true)
    try {
      const provider = await getProvider()
      const signer = await provider.getSigner()
      const tokenContract = new Contract(selectedToken.tokenAddress, TOKEN_ABI, signer)

      const amountToSell = parseEther(amount)
      const returnAmount = await tokenContract.getSellPrice(amountToSell)

      console.log('Selling tokens...', {
        amount: amountToSell.toString(),
        returnAmount: returnAmount.toString()
      })

      const sellTx = await tokenContract.sellTokens(amountToSell)
      const receipt = await sellTx.wait()

      console.log('Tokens sold successfully:', receipt.hash)

      // Save to database
      await savePurchaseToDatabase('sell', receipt.hash, amount, formatEther(returnAmount))

      alert(`✅ Successfully sold ${amount} tokens!\nTx: ${receipt.hash}`)

      setAmount('')
      await loadTokenData()

      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error selling token:', error)
      if (error.message.includes('Insufficient token balance')) {
        alert('❌ Insufficient token balance!')
      } else if (error.message.includes('Contract has insufficient TEST balance')) {
        alert('❌ Contract has insufficient TEST balance!')
      } else if (error.message.includes('Token sales are disabled')) {
        alert('❌ Token sales are disabled!')
      } else if (error.message.includes('user rejected')) {
        alert('❌ Transaction rejected!')
      } else {
        alert(`❌ Error selling token: ${error.message || error}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
        paddingBottom: '0.5rem'
      }}>
        <button
          onClick={() => setActiveTab('buy')}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: activeTab === 'buy' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
            color: activeTab === 'buy' ? '#22c55e' : '#9ca3af',
            border: activeTab === 'buy' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid transparent',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '1rem',
            transition: 'all 0.2s'
          }}
        >
          Buy
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: activeTab === 'sell' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
            color: activeTab === 'sell' ? '#ef4444' : '#9ca3af',
            border: activeTab === 'sell' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '1rem',
            transition: 'all 0.2s'
          }}
        >
          Sell
        </button>
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.1)',
        padding: '1.25rem',
        borderRadius: '0.75rem',
        marginBottom: '1.5rem',
        border: '1px solid rgba(139, 92, 246, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Current Price:</span>
          <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.95rem' }}>
            {parseFloat(currentPrice).toFixed(6)} TEST
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Available:</span>
          <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.95rem' }}>
            {parseFloat(availableTokens).toFixed(2)} tokens
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Sold:</span>
          <span style={{ color: '#22c55e', fontWeight: '700', fontSize: '0.95rem' }}>
            {parseFloat(soldSupply).toFixed(2)} tokens
          </span>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <div style={{
            fontSize: '0.75rem',
            color: '#9ca3af',
            marginBottom: '0.5rem',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>BONDING CURVE PROGRESS</span>
            <span style={{ color: '#fff', fontWeight: '600' }}>{bondingProgress}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            background: 'rgba(75, 85, 99, 0.3)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${bondingProgress}%`,
              background: 'linear-gradient(90deg, #22c55e, #84cc16)',
              borderRadius: '4px',
              transition: 'width 0.3s'
            }}></div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '600' }}>
          Amount (tokens)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          min="0"
          step="0.000000000000000001"
          style={{
            width: '100%',
            padding: '1rem',
            background: 'rgba(31, 41, 55, 0.6)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '0.5rem',
            color: '#fff',
            fontSize: '1.5rem',
            fontWeight: '600',
            outline: 'none',
            transition: 'all 0.2s'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
          }}
        />
      </div>

      {amount && parseFloat(amount) > 0 && (
        <div style={{
          background: activeTab === 'buy' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '1.25rem',
          border: `1px solid ${activeTab === 'buy' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ color: '#9ca3af', fontSize: '0.9rem', fontWeight: '600' }}>
                {activeTab === 'buy' ? 'You pay:' : 'You receive:'}
              </span>
              <span style={{
                color: activeTab === 'buy' ? '#22c55e' : '#ef4444',
                fontWeight: '700',
                fontSize: '1.1rem'
              }}>
                {parseFloat(estimatedCost).toFixed(6)} TEST
              </span>
            </div>

            <div style={{
              fontSize: '0.8rem',
              color: '#6b7280',
              paddingTop: '0.5rem',
              borderTop: '1px solid rgba(107, 114, 128, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Amount:</span>
                <span style={{ color: '#9ca3af' }}>{amount} tokens</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Current Price:</span>
                <span style={{ color: '#9ca3af' }}>{parseFloat(currentPrice).toFixed(6)} TEST</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Avg Price:</span>
                <span style={{ color: '#9ca3af' }}>
                  {(parseFloat(estimatedCost) / parseFloat(amount)).toFixed(8)} TEST/token
                </span>
              </div>
              {activeTab === 'buy' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(107, 114, 128, 0.2)' }}>
                  <span style={{ fontWeight: '600', color: '#d1d5db' }}>Total Cost:</span>
                  <span style={{ fontWeight: '700', color: '#22c55e' }}>
                    {parseFloat(estimatedCost).toFixed(6)} TEST
                  </span>
                </div>
              )}
              {activeTab === 'sell' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(107, 114, 128, 0.2)' }}>
                  <span style={{ fontWeight: '600', color: '#d1d5db' }}>You Get:</span>
                  <span style={{ fontWeight: '700', color: '#ef4444' }}>
                    {parseFloat(estimatedCost).toFixed(6)} TEST
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={activeTab === 'buy' ? handleBuy : handleSell}
        disabled={loading || !amount || parseFloat(amount) <= 0}
        style={{
          width: '100%',
          padding: '1.25rem',
          background: loading || !amount || parseFloat(amount) <= 0
            ? 'rgba(75, 85, 99, 0.5)'
            : activeTab === 'buy'
              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
              : 'linear-gradient(90deg, #ef4444, #dc2626)',
          color: '#fff',
          border: 'none',
          borderRadius: '0.75rem',
          fontSize: '1.1rem',
          fontWeight: '700',
          cursor: loading || !amount || parseFloat(amount) <= 0 ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          boxShadow: loading || !amount || parseFloat(amount) <= 0
            ? 'none'
            : activeTab === 'buy'
              ? '0 4px 12px rgba(34, 197, 94, 0.3)'
              : '0 4px 12px rgba(239, 68, 68, 0.3)'
        }}
        onMouseEnter={(e) => {
          if (!loading && amount && parseFloat(amount) > 0) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = activeTab === 'buy'
              ? '0 6px 16px rgba(34, 197, 94, 0.4)'
              : '0 6px 16px rgba(239, 68, 68, 0.4)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = loading || !amount || parseFloat(amount) <= 0
            ? 'none'
            : activeTab === 'buy'
              ? '0 4px 12px rgba(34, 197, 94, 0.3)'
              : '0 4px 12px rgba(239, 68, 68, 0.3)';
        }}
      >
        {loading ? 'Processing...' : activeTab === 'buy' ? 'Buy Tokens' : 'Sell Tokens'}
      </button>

      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '0.5rem',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <p style={{ fontSize: '0.8rem', color: '#9ca3af', lineHeight: 1.6 }}>
          💡 Price is determined by bonding curve. The more tokens sold, the higher the price.
          When you buy, price increases. When you sell, price decreases.
        </p>
      </div>
    </div>
  )
}
