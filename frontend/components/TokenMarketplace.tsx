'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { BrowserProvider, Contract, formatEther } from 'ethers'
import { wrapEthereumProvider } from '@oasisprotocol/sapphire-paratime'
<<<<<<< Updated upstream
import { TOKEN_ABI, FACTORY_ABI, FACTORY_ADDRESS } from '../abi/factoryAbi'
=======
import { TOKEN_ABI } from '../abi/factoryAbi'
import TokenTrader from './TokenTrader'
>>>>>>> Stashed changes

declare global {
  interface Window {
    ethereum?: any
  }
}

interface TokenMarketplaceProps {
  connected: boolean
  address: string
  createdTokens: string[]
}

const TokenMarketplace = forwardRef<any, TokenMarketplaceProps>(({ connected, address, createdTokens }, ref) => {
  const [availableTokens, setAvailableTokens] = useState<any[]>([])
<<<<<<< Updated upstream
  const [tokenInfos, setTokenInfos] = useState<{[address: string]: TokenInfo}>({})
  const [userBalances, setUserBalances] = useState<{[address: string]: bigint}>({})
=======
>>>>>>> Stashed changes
  const [loading, setLoading] = useState(false)

  useImperativeHandle(ref, () => ({
    refreshTokens: () => {
      loadAvailableTokens()
    }
  }))

  useEffect(() => {
    if (connected) {
      loadAvailableTokens()
    }
  }, [connected, address, createdTokens])

  const loadAvailableTokens = async () => {
<<<<<<< Updated upstream
    if (!FACTORY_ADDRESS) return
    
    try {
      const provider = await getProvider()
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider)
      
      // Get all tokens from factory
      const allTokens = await factory.getAllTokens()
      console.log('All tokens from factory:', allTokens)
      
      // Load additional info for each token
      const tokensWithInfo = []
      for (const tokenData of allTokens) {
        console.log('Processing token:', tokenData)
        
        const tokenContract = new Contract(tokenData.tokenAddress, TOKEN_ABI, provider)
        
        try {
          const [isForSale, availableAmount, pricePerToken, contractBalance, userBalance] = await Promise.all([
            tokenContract.isForSale(),
            tokenContract.getAvailableTokens(),
            tokenContract.pricePerToken(),
            tokenContract.getContractBalance(),
            connected && address ? tokenContract.balanceOf(address) : Promise.resolve(0n)
          ])
          
          console.log('Token info:', {
            address: tokenData.tokenAddress,
            isForSale,
            availableAmount: availableAmount.toString(),
            pricePerToken: pricePerToken.toString(),
            contractBalance: contractBalance.toString(),
            userBalance: userBalance.toString()
          })
          
          if (isForSale) {
            tokensWithInfo.push({
              tokenAddress: tokenData.tokenAddress,
              name: tokenData.name,
              symbol: tokenData.symbol,
              totalSupply: tokenData.totalSupply,
              creator: tokenData.creator,
              isForSale,
              availableAmount,
              pricePerToken,
              contractBalance,
              userBalance
            })
            
            // Store user balance
            if (connected && address) {
              setUserBalances(prev => ({ ...prev, [tokenData.tokenAddress]: userBalance }))
            }
            
            // Load token info for display
            await getTokenInfo(tokenData.tokenAddress)
=======
    setLoading(true)
    try {
      // Load tokens from database
      const response = await fetch('/api/tokens')
      const data = await response.json()

      if (data.success && data.data) {
        const provider = await getProvider()
        
        const tokensWithInfo = []
        for (const tokenData of data.data) {
          const tokenContract = new Contract(tokenData.contract_address, TOKEN_ABI, provider)

          try {
            const [isForSale, availableAmount, currentPrice, contractBalance, userBalance, bondingProgress, soldSupply] = await Promise.all([
              tokenContract.isForSale(),
              tokenContract.getAvailableTokens(),
              tokenContract.getCurrentPrice(),
              tokenContract.getContractBalance(),
              connected && address ? tokenContract.balanceOf(address) : Promise.resolve(BigInt(0)),
              tokenContract.getBondingProgress(),
              tokenContract.soldSupply()
            ])

            if (isForSale) {
              tokensWithInfo.push({
                tokenAddress: tokenData.contract_address,
                name: tokenData.name,
                symbol: tokenData.symbol,
                description: tokenData.description || '',
                imageUrl: tokenData.image_url || '',
                socialLink: tokenData.social_link || '',
                totalSupply: tokenData.total_supply,
                creator: tokenData.owner,
                createdAt: tokenData.created_at,
                isForSale,
                availableAmount,
                currentPrice,
                contractBalance,
                userBalance,
                bondingProgress: Number(bondingProgress),
                soldSupply
              })
            }
          } catch (error) {
            console.error('Error loading token info for', tokenData.contract_address, error)
>>>>>>> Stashed changes
          }
        }
<<<<<<< Updated upstream
      }
      
      console.log('Tokens with info:', tokensWithInfo)
      setAvailableTokens(tokensWithInfo)
=======

        setAvailableTokens(tokensWithInfo)
      }
>>>>>>> Stashed changes
    } catch (error) {
      console.error('Error loading tokens from database:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProvider = async () => {
    let ethereum = window.ethereum
    if (window.ethereum?.providers) {
      ethereum = window.ethereum.providers.find((provider: any) => provider.isMetaMask)
    }
    const wrappedProvider = wrapEthereumProvider(ethereum)
    return new BrowserProvider(wrappedProvider)
  }

<<<<<<< Updated upstream
  const getTokenInfo = async (tokenAddress: string): Promise<TokenInfo> => {
    if (tokenInfos[tokenAddress]) {
      return tokenInfos[tokenAddress]
    }

    try {
      const provider = await getProvider()
      const token = new Contract(tokenAddress, TOKEN_ABI, provider)
      
      const [name, symbol, decimals] = await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals()
      ])

      const info = { name, symbol, decimals: Number(decimals) }
      setTokenInfos(prev => ({ ...prev, [tokenAddress]: info }))
      return info
    } catch (error) {
      console.error('Error getting token info:', error)
      return { name: 'Unknown', symbol: 'UNK', decimals: 18 }
    }
  }

  const buyTokenDirect = async (tokenAddress: string, amount: string, pricePerToken: bigint) => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('❌ Vui lòng nhập số lượng hợp lệ!')
      return
    }

    setLoading(true)
    try {
      const provider = await getProvider()
      const signer = await provider.getSigner()
      const tokenContract = new Contract(tokenAddress, TOKEN_ABI, signer)
      
      const amountToBuy = parseEther(amount)
      const totalPrice = (amountToBuy * pricePerToken) / parseEther('1')
      
      console.log('Buying token directly...', {
        tokenAddress,
        amount: amountToBuy.toString(),
        pricePerToken: pricePerToken.toString(),
        totalPrice: totalPrice.toString()
      })
      
      const buyTx = await tokenContract.buyTokens(amountToBuy, { value: totalPrice })
      const receipt = await buyTx.wait()
      
      console.log('Token bought successfully:', receipt.hash)
      alert(`✅ Mua ${amount} tokens thành công!\nTx: ${receipt.hash}`)
      
      // Clear input
      const input = document.getElementById(`buy-amount-${tokenAddress}`) as HTMLInputElement
      if (input) input.value = ''
      
      await loadAvailableTokens()
      
    } catch (error: any) {
      console.error('Error buying token:', error)
      if (error.message.includes('insufficient funds')) {
        alert('❌ Không đủ TEST token để mua!')
      } else if (error.message.includes('Not enough tokens available')) {
        alert('❌ Không đủ token có sẵn!')
      } else if (error.message.includes('Token is not for sale')) {
        alert('❌ Token này hiện không bán!')
      } else if (error.message.includes('user rejected')) {
        alert('❌ Bạn đã từ chối transaction!')
      } else {
        alert(`❌ Lỗi mua token: ${error.message || error}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const sellTokenDirect = async (tokenAddress: string, amount: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('❌ Vui lòng nhập số lượng hợp lệ!')
      return
    }

    setLoading(true)
    try {
      const provider = await getProvider()
      const signer = await provider.getSigner()
      const tokenContract = new Contract(tokenAddress, TOKEN_ABI, signer)
      
      const amountToSell = parseEther(amount)
      
      console.log('Selling token directly...', {
        tokenAddress,
        amount: amountToSell.toString()
      })
      
      const sellTx = await tokenContract.sellTokens(amountToSell)
      const receipt = await sellTx.wait()
      
      console.log('Token sold successfully:', receipt.hash)
      alert(`✅ Bán ${amount} tokens thành công!\nTx: ${receipt.hash}`)
      
      // Clear input
      const input = document.getElementById(`sell-amount-${tokenAddress}`) as HTMLInputElement
      if (input) input.value = ''
      
      await loadAvailableTokens()
      
    } catch (error: any) {
      console.error('Error selling token:', error)
      if (error.message.includes('Insufficient token balance')) {
        alert('❌ Không đủ token để bán!')
      } else if (error.message.includes('Contract has insufficient TEST balance')) {
        alert('❌ Contract không đủ TEST để mua lại!')
      } else if (error.message.includes('Token sales are disabled')) {
        alert('❌ Token này hiện không cho phép bán!')
      } else if (error.message.includes('user rejected')) {
        alert('❌ Bạn đã từ chối transaction!')
      } else {
        alert(`❌ Lỗi bán token: ${error.message || error}`)
      }
    } finally {
      setLoading(false)
    }
  }

=======
>>>>>>> Stashed changes
  if (!connected) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <p style={{ color: '#9ca3af', fontSize: '1.1rem' }}>
          Connect your wallet to start trading
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-8 mt-8" style={{
      maxWidth: '72rem',
      margin: '2rem auto 0 auto',
      background: 'white',
      borderRadius: '0.75rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      padding: '2rem'
    }}>
<<<<<<< Updated upstream
      <div className="text-center mb-8" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 className="text-3xl font-bold text-gray-800 mb-2" style={{
          fontSize: '1.875rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '0.5rem'
        }}>Token Trading</h2>
        <p className="text-gray-600" style={{ color: '#4b5563' }}>
          Mua và bán token trực tiếp - giống pump.fun
        </p>
      </div>

      <div className="flex justify-between items-center mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 className="text-xl font-semibold" style={{ fontSize: '1.25rem', fontWeight: '600' }}>
          Tokens có sẵn ({availableTokens.length})
        </h3>
        <button
          onClick={loadAvailableTokens}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          style={{
            padding: '0.5rem 1rem',
            background: '#f3f4f6',
            borderRadius: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      <div className="grid gap-6" style={{ display: 'grid', gap: '1.5rem' }}>
        {availableTokens.length === 0 ? (
          <div className="text-center py-8 text-gray-500" style={{ textAlign: 'center', padding: '2rem 0', color: '#6b7280' }}>
            <div className="mb-4" style={{ marginBottom: '1rem' }}>
              <h4 className="text-lg font-medium mb-2" style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Chưa có token nào có sẵn để giao dịch
              </h4>
              <p className="text-sm" style={{ fontSize: '0.875rem' }}>
                Hãy tạo token đầu tiên để bắt đầu giao dịch!
              </p>
            </div>
=======
      <div style={{
        maxWidth: '90rem',
        margin: '0 auto'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: '0.5rem'
          }}>Token Board</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
            Discover and trade tokens with bonding curve pricing 🚀
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fff' }}>
            All Tokens ({availableTokens.length})
          </h3>
          <button
            onClick={loadAvailableTokens}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              background: loading ? 'rgba(75, 85, 99, 0.5)' : 'rgba(139, 92, 246, 0.2)',
              color: loading ? '#6b7280' : '#a78bfa',
              borderRadius: '0.5rem',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = 'rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
            }}
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {loading && availableTokens.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: '#9ca3af'
          }}>
            <p>Loading tokens...</p>
          </div>
        ) : availableTokens.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'rgba(139, 92, 246, 0.05)',
            borderRadius: '1rem',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            color: '#9ca3af'
          }}>
            <h4 style={{ fontSize: '1.15rem', fontWeight: '500', marginBottom: '0.5rem', color: '#d1d5db' }}>
              No tokens yet
            </h4>
            <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              Create the first token to start trading!
            </p>
>>>>>>> Stashed changes
            <button
              onClick={() => {
                // Scroll to top to show create token form
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              style={{
                padding: '0.5rem 1rem',
                background: '#9333ea',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
<<<<<<< Updated upstream
                transition: 'background-color 0.2s'
=======
                fontWeight: '600',
                transition: 'all 0.2s'
>>>>>>> Stashed changes
              }}
            >
              Create Token Now
            </button>
          </div>
        ) : (
<<<<<<< Updated upstream
          availableTokens.map((token) => {
            const tokenInfo = tokenInfos[token.tokenAddress]
            const userBalance = userBalances[token.tokenAddress] || 0n
            
            return (
              <div key={token.tokenAddress} className="border rounded-lg p-6" style={{
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '1.5rem',
                background: '#fafafa'
              }}>
                <div className="grid md:grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  {/* Token Info */}
                  <div>
                    <h4 className="text-xl font-bold mb-3" style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                      {tokenInfo?.name || token.name} ({tokenInfo?.symbol || token.symbol})
                    </h4>
                    <div className="space-y-2 text-sm" style={{ fontSize: '0.875rem' }}>
                      <p><strong>Giá:</strong> {formatEther(token.pricePerToken)} TEST per token</p>
                      <p><strong>Có sẵn:</strong> {formatEther(token.availableAmount)} tokens</p>
                      <p><strong>Liquidity:</strong> {formatEther(token.contractBalance)} TEST</p>
                      <p><strong>Creator:</strong> {token.creator ? `${token.creator.slice(0, 6)}...${token.creator.slice(-4)}` : 'Unknown'}</p>
                      <p><strong>Total Supply:</strong> {formatEther(token.totalSupply)} tokens</p>
                      {connected && address && (
                        <p><strong>Bạn sở hữu:</strong> {formatEther(userBalance)} tokens</p>
                      )}
                    </div>
                  </div>

                  {/* Trading Actions */}
                  <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Buy Section */}
                    <div className="bg-green-50 p-4 rounded-lg" style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '0.5rem' }}>
                      <h5 className="font-semibold text-green-800 mb-2" style={{ fontWeight: '600', color: '#166534', marginBottom: '0.5rem' }}>
                        🟢 Mua Token
                      </h5>
                      <div className="flex gap-2" style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="number"
                          placeholder="Số lượng mua"
                          min="0"
                          step="0.000000000000000001"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                          style={{
                            flex: 1,
                            padding: '0.5rem 0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.25rem',
                            fontSize: '0.875rem'
                          }}
                          id={`buy-amount-${token.tokenAddress}`}
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById(`buy-amount-${token.tokenAddress}`) as HTMLInputElement
                            const amount = input?.value
                            if (amount && parseFloat(amount) > 0) {
                              buyTokenDirect(token.tokenAddress, amount, token.pricePerToken)
                            } else {
                              alert('❌ Vui lòng nhập số lượng hợp lệ!')
                            }
                          }}
                          disabled={loading}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-sm transition-colors"
                          style={{
                            padding: '0.5rem 1rem',
                            background: loading ? '#9ca3af' : '#16a34a',
                            color: 'white',
                            borderRadius: '0.25rem',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s',
                            fontSize: '0.875rem'
                          }}
                        >
                          {loading ? 'Đang mua...' : 'Mua'}
                        </button>
                      </div>
                    </div>

                    {/* Sell Section */}
                    {userBalance > 0n && (
                      <div className="bg-red-50 p-4 rounded-lg" style={{ background: '#fef2f2', padding: '1rem', borderRadius: '0.5rem' }}>
                        <h5 className="font-semibold text-red-800 mb-2" style={{ fontWeight: '600', color: '#991b1b', marginBottom: '0.5rem' }}>
                          🔴 Bán Token
                        </h5>
                        <div className="flex gap-2" style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="number"
                            placeholder="Số lượng bán"
                            min="0"
                            max={formatEther(userBalance)}
                            step="0.000000000000000001"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                            style={{
                              flex: 1,
                              padding: '0.5rem 0.75rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.25rem',
                              fontSize: '0.875rem'
                            }}
                            id={`sell-amount-${token.tokenAddress}`}
                          />
                          <button
                            onClick={() => {
                              const input = document.getElementById(`sell-amount-${token.tokenAddress}`) as HTMLInputElement
                              const amount = input?.value
                              if (amount && parseFloat(amount) > 0) {
                                sellTokenDirect(token.tokenAddress, amount)
                              } else {
                                alert('❌ Vui lòng nhập số lượng hợp lệ!')
                              }
                            }}
                            disabled={loading}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded text-sm transition-colors"
                            style={{
                              padding: '0.5rem 1rem',
                              background: loading ? '#9ca3af' : '#dc2626',
                              color: 'white',
                              borderRadius: '0.25rem',
                              border: 'none',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              transition: 'background-color 0.2s',
                              fontSize: '0.875rem'
                            }}
                          >
                            {loading ? 'Đang bán...' : 'Bán'}
                          </button>
                        </div>
=======
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            {availableTokens.map((token) => {
              const marketCap = parseFloat(formatEther(token.contractBalance)).toFixed(2)
              const timeAgo = (() => {
                const now = new Date()
                const created = new Date(token.createdAt)
                const diffMs = now.getTime() - created.getTime()
                const diffMins = Math.floor(diffMs / 60000)
                const diffHours = Math.floor(diffMs / 3600000)
                const diffDays = Math.floor(diffMs / 86400000)
                
                if (diffMins < 60) return `${diffMins}m ago`
                if (diffHours < 24) return `${diffHours}h ago`
                return `${diffDays}d ago`
              })()

              return (
                <div
                  key={token.tokenAddress}
                  onClick={() => {
                    setSelectedToken(token)
                    setShowTrader(true)
                  }}
                  style={{
                    background: 'rgba(17, 24, 39, 0.8)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '1rem',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.3)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Image Section */}
                  <div style={{
                    width: '100%',
                    height: '400px',
                    background: token.imageUrl 
                      ? `url(${token.imageUrl}) center/cover`
                      : 'linear-gradient(135deg, #374151, #1f2937)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {!token.imageUrl && (
                      <div style={{
                        fontSize: '6rem',
                        fontWeight: 'bold',
                        color: 'rgba(255, 255, 255, 0.3)',
                      }}>
                        {token.symbol[0]}
                      </div>
                    )}
                    {/* Market Cap Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      background: 'rgba(34, 197, 94, 0.9)',
                      color: '#fff',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      fontWeight: '700',
                      fontSize: '1rem'
                    }}>
                      ${marketCap}
                    </div>
                  </div>

                  {/* Info Section */}
                  <div style={{ padding: '1.5rem' }}>
                    {/* Title and Symbol */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <h3 style={{
                        fontSize: '1.75rem',
                        fontWeight: '700',
                        color: '#fff',
                        marginBottom: '0.25rem'
                      }}>
                        {token.name}
                      </h3>
                      <p style={{
                        fontSize: '1rem',
                        color: '#9ca3af'
                      }}>
                        {token.symbol}
                      </p>
                    </div>

                    {/* Description */}
                    <p style={{
                      fontSize: '0.95rem',
                      color: '#d1d5db',
                      marginBottom: '1rem',
                      lineHeight: 1.5
                    }}>
                      {token.description || 'No'}
                    </p>

                    {/* Bonding Curve */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{
                          fontSize: '0.85rem',
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          BONDING CURVE
                        </span>
                        <span style={{
                          fontSize: '0.95rem',
                          color: '#fff',
                          fontWeight: '600'
                        }}>
                          {token.bondingProgress}%
                        </span>
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
                          width: `${token.bondingProgress}%`,
                          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                          borderRadius: '4px',
                          transition: 'width 0.3s'
                        }}></div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.85rem',
                      color: '#6b7280'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>💬 0</span>
                      </div>
                      <div>
                        Created by {token.creator.slice(0, 4)}...{token.creator.slice(-4)}
                      </div>
                    </div>

                    {/* Social Link */}
                    {token.socialLink && (
                      <div style={{
                        marginTop: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid rgba(75, 85, 99, 0.3)'
                      }}>
                        <a 
                          href={token.socialLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: '#60a5fa',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          🔗 {token.socialLink}
                        </a>
>>>>>>> Stashed changes
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
<<<<<<< Updated upstream
=======

      {showTrader && selectedToken && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(8px)'
        }}
          onClick={() => {
            setShowTrader(false)
            setSelectedToken(null)
          }}
        >
          <div style={{
            background: 'rgba(15, 23, 42, 0.98)',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            position: 'relative'
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowTrader(false)
                setSelectedToken(null)
              }}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(139, 92, 246, 0.2)',
                border: 'none',
                color: '#a78bfa',
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>

            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ color: '#fff', fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                {selectedToken.name}
              </h2>
              <p style={{ color: '#a78bfa', fontSize: '1.1rem', fontWeight: '600' }}>
                ${selectedToken.symbol}
              </p>
            </div>

            <TokenTrader 
              selectedToken={selectedToken} 
              onSuccess={() => {
                loadAvailableTokens()
                setShowTrader(false)
                setSelectedToken(null)
              }}
            />
          </div>
        </div>
      )}
>>>>>>> Stashed changes
    </div>
  )
})

TokenMarketplace.displayName = 'TokenMarketplace'

export default TokenMarketplace
