'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers'
import { wrapEthereumProvider } from '@oasisprotocol/sapphire-paratime'
import { TOKEN_ABI, FACTORY_ABI, FACTORY_ADDRESS } from '../abi/factoryAbi'

declare global {
  interface Window {
    ethereum?: any
  }
}

interface TokenInfo {
  name: string
  symbol: string
  decimals: number
}

interface TokenMarketplaceProps {
  connected: boolean
  address: string
  createdTokens: string[]
}

const TokenMarketplace = forwardRef<any, TokenMarketplaceProps>(({ connected, address, createdTokens }, ref) => {
  const [availableTokens, setAvailableTokens] = useState<any[]>([])
  const [tokenInfos, setTokenInfos] = useState<{ [address: string]: TokenInfo }>({})
  const [userBalances, setUserBalances] = useState<{ [address: string]: bigint }>({})
  const [loading, setLoading] = useState(false)

  // Expose refresh function to parent
  useImperativeHandle(ref, () => ({
    refreshTokens: () => {
      loadAvailableTokens()
    }
  }))

  useEffect(() => {
    if (connected && FACTORY_ADDRESS) {
      loadAvailableTokens()
    }
  }, [connected, address, createdTokens])

  // Load all available tokens from TokenFactory
  const loadAvailableTokens = async () => {
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
            connected && address ? tokenContract.balanceOf(address) : Promise.resolve(BigInt(0))
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
          }
        } catch (error) {
          console.error('Error loading token info for', tokenData.tokenAddress, error)
        }
      }

      console.log('Tokens with info:', tokensWithInfo)
      setAvailableTokens(tokensWithInfo)
    } catch (error) {
      console.error('Error loading available tokens:', error)
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

      // Save purchase to database
      try {
        // First, get token_id from contract address
        const tokenResponse = await fetch(`/api/tokens/by-address?contract_address=${tokenAddress}`)
        const tokenData = await tokenResponse.json()

        if (tokenData.success && tokenData.token_id) {
          const response = await fetch('/api/purchases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token_id: tokenData.token_id,
              buyer_address: address,
              seller_address: null,
              quantity: amount,
              price_per_token: formatEther(pricePerToken),
              total_price: formatEther(totalPrice),
              transaction_hash: receipt.hash,
              status: 'completed',
            }),
          })

          if (response.ok) {
            const data = await response.json()
            console.log('Purchase saved to database:', data)
          } else {
            const error = await response.json()
            console.warn('Failed to save purchase to database:', error)
          }
        } else {
          console.warn('Could not find token ID for contract:', tokenAddress)
        }
      } catch (dbError) {
        console.warn('Error saving purchase to database:', dbError)
      }

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

  if (!connected) {
    return (
      <div className="text-center py-8" style={{ textAlign: 'center', padding: '2rem 0' }}>
        <p className="text-gray-600" style={{ color: '#4b5563' }}>
          Vui lòng kết nối ví để sử dụng token trading
        </p>
      </div>
    )
  }

  if (!FACTORY_ADDRESS) {
    return (
      <div className="text-center py-8" style={{ textAlign: 'center', padding: '2rem 0' }}>
        <p className="text-red-600" style={{ color: '#dc2626' }}>
          Factory chưa được deploy. Vui lòng deploy factory trước.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: '100%',
      margin: '2rem 0 0 0',
      background: 'rgb(11, 15, 25)',
      minHeight: '100vh',
      padding: '2rem 1rem'
    }}>
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
          }}>Token Trading</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
            Discover và trade tokens - Pump your portfolio 🚀
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fff' }}>
            Trending Tokens ({availableTokens.length})
          </h3>
          <button
            onClick={loadAvailableTokens}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#a78bfa',
              borderRadius: '0.5rem',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {availableTokens.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'rgba(139, 92, 246, 0.05)',
            borderRadius: '1rem',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            color: '#9ca3af'
          }}>
            <h4 style={{ fontSize: '1.15rem', fontWeight: '500', marginBottom: '0.5rem', color: '#d1d5db' }}>
              Chưa có token nào
            </h4>
            <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              Hãy tạo token đầu tiên để bắt đầu giao dịch!
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: '#fff',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(139, 92, 246, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Tạo Token Ngay
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1.5rem'
          }}>
            {availableTokens.map((token) => {
              const tokenInfo = tokenInfos[token.tokenAddress]
              const userBalance = userBalances[token.tokenAddress] || BigInt(0)
              const marketCap = (parseFloat(formatEther(token.contractBalance)) * parseFloat(formatEther(token.pricePerToken))).toFixed(2)
              const bondingProgress = Math.min(90, Math.floor(Math.random() * 90) + 10) // Mock bonding progress

              return (
                <div
                  key={token.tokenAddress}
                  style={{
                    background: 'rgba(17, 24, 39, 0.6)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(139, 92, 246, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Token Header with Image */}
                  <div style={{
                    height: '120px',
                    background: `linear-gradient(135deg, ${['#8b5cf6', '#7c3aed', '#6d28d9'][Math.floor(Math.random() * 3)]}, ${['#7c3aed', '#6d28d9', '#5b21b6'][Math.floor(Math.random() * 3)]})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <div style={{
                      fontSize: '3rem',
                      fontWeight: 'bold',
                      color: 'rgba(255, 255, 255, 0.8)',
                      opacity: 0.9
                    }}>
                      {(tokenInfo?.symbol || token.symbol)[0]}
                    </div>
                  </div>

                  {/* Token Body */}
                  <div style={{ padding: '1rem' }}>
                    {/* Creator Info */}
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#9ca3af',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>Created by {token.creator ? `${token.creator.slice(0, 6)}...${token.creator.slice(-2)}` : 'Unknown'}</span>
                      <span style={{ color: '#22c55e', fontWeight: '600' }}>MC: ${marketCap}</span>
                    </div>

                    {/* Token Info */}
                    <h3 style={{
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      color: '#fff',
                      marginBottom: '0.25rem',
                      lineHeight: 1.2
                    }}>
                      {tokenInfo?.name || token.name}
                    </h3>

                    <p style={{
                      fontSize: '0.9rem',
                      color: '#a78bfa',
                      fontWeight: '600',
                      marginBottom: '0.5rem'
                    }}>
                      ${tokenInfo?.symbol || token.symbol}
                    </p>

                    {/* Description */}
                    <p style={{
                      fontSize: '0.8rem',
                      color: '#9ca3af',
                      marginBottom: '0.75rem',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      The most decentralized token on the Sapphire Network scaling...
                    </p>

                    {/* Bonding Curve */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#9ca3af',
                        marginBottom: '0.25rem',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span>BONDING CURVE PROGRESS</span>
                        <span style={{ color: '#fff', fontWeight: '600' }}>{bondingProgress}%</span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '6px',
                        background: 'rgba(75, 85, 99, 0.3)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${bondingProgress}%`,
                          background: 'linear-gradient(90deg, #22c55e, #84cc16)',
                          borderRadius: '3px',
                          transition: 'width 0.3s'
                        }}></div>
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginTop: '0.25rem'
                      }}>
                        There are {formatEther(token.availableAmount).slice(0, 6)} A in the bonding curve
                      </div>
                    </div>

                    {/* Replies and Price */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      color: '#9ca3af',
                      borderTop: '1px solid rgba(139, 92, 246, 0.2)',
                      paddingTop: '0.75rem'
                    }}>
                      <span>📝 {Math.floor(Math.random() * 200)} replies</span>
                      <span style={{ color: '#22c55e', fontWeight: '600' }}>Price: {formatEther(token.pricePerToken).slice(0, 8)} TEST</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})

TokenMarketplace.displayName = 'TokenMarketplace'

export default TokenMarketplace