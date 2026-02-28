'use client'

import { useState, useEffect } from 'react'
import { BrowserProvider, Contract, parseEther } from 'ethers'
import { wrapEthereumProvider } from '@oasisprotocol/sapphire-paratime'
import { FACTORY_ABI, FACTORY_ADDRESS } from '../abi/factoryAbi'

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

interface TokenForm {
  name: string
  symbol: string
  totalSupply: string
  description: string
  image: File | null
  pricePerToken: string
}

interface CreateTokenProps {
  onTokenCreated?: (tokenAddress: string) => void
  onConnectionChange?: (connected: boolean, address: string) => void
  onTokenCreatedSuccess?: () => void
}

export default function CreateToken({ onTokenCreated, onConnectionChange, onTokenCreatedSuccess }: CreateTokenProps = {}) {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState('')
  const [form, setForm] = useState<TokenForm>({
    name: '',
    symbol: '',
    totalSupply: '',
    description: '',
    image: null,
    pricePerToken: ''
  })
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [createdToken, setCreatedToken] = useState('')
  const [createdTokens, setCreatedTokens] = useState<string[]>([])

  // Load created tokens from localStorage on mount and check wallet connection
  useEffect(() => {
    const saved = localStorage.getItem('createdTokens')
    if (saved) {
      setCreatedTokens(JSON.parse(saved))
    }

    // Check if wallet is already connected
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            setConnected(true)
            setAddress(accounts[0])

            // Notify parent component
            if (onConnectionChange) {
              onConnectionChange(true, accounts[0])
            }

            console.log('Auto-detected wallet connection:', accounts[0])
          }
        } catch (error) {
          console.log('No wallet connection detected')
        }
      }
    }

    checkConnection()
  }, [])

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Vui lòng cài đặt MetaMask!')
      return
    }

    // If multiple wallets, try to use MetaMask specifically
    let ethereum = window.ethereum
    if (window.ethereum.providers) {
      ethereum = window.ethereum.providers.find((provider: any) => provider.isMetaMask)
      if (!ethereum) {
        alert('Không tìm thấy MetaMask!')
        return
      }
    }

    try {
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length > 0) {
        // Switch to Sapphire Testnet
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x5aff' }],
          })
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x5aff',
                chainName: 'Oasis Sapphire Testnet',
                nativeCurrency: {
                  name: 'TEST',
                  symbol: 'TEST',
                  decimals: 18
                },
                rpcUrls: ['https://testnet.sapphire.oasis.io'],
                blockExplorerUrls: ['https://testnet.explorer.sapphire.oasis.io']
              }]
            })
          }
        }

        setAddress(accounts[0])
        setConnected(true)

        // Notify parent component
        if (onConnectionChange) {
          onConnectionChange(true, accounts[0])
        }
      }
    } catch (error) {
      console.error('Lỗi kết nối:', error)
      alert('Lỗi kết nối ví!')
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setForm({ ...form, image: file })
    }
  }

  const uploadToIPFS = async (data: any): Promise<string> => {
    // Simulate IPFS upload - trong thực tế sẽ upload lên IPFS/Arweave
    console.log('Uploading to IPFS...', data)

    // Mock IPFS hash
    const mockHash = 'QmX' + Math.random().toString(36).substring(2, 15)
    return `ipfs://${mockHash}`
  }

  const createToken = async () => {
    if (!form.name || !form.symbol || !form.totalSupply || !form.pricePerToken) {
      alert('Vui lòng điền đầy đủ thông tin!')
      return
    }

    setLoading(true)
    setTxHash('')
    setCreatedToken('')

    try {
      // 1. Upload image and metadata to IPFS
      let metadataURI = ''
      if (form.image || form.description) {
        const metadata = {
          name: form.name,
          symbol: form.symbol,
          description: form.description,
          image: form.image ? await uploadToIPFS(form.image) : '',
          totalSupply: form.totalSupply,
          pricePerToken: form.pricePerToken
        }
        metadataURI = await uploadToIPFS(metadata)
      }

      // 2. Connect to contract
      let ethereum = window.ethereum
      if (window.ethereum?.providers) {
        ethereum = window.ethereum.providers.find((provider: any) => provider.isMetaMask)
      }

      const wrappedProvider = wrapEthereumProvider(ethereum)
      const provider = new BrowserProvider(wrappedProvider)
      const signer = await provider.getSigner()
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer)

      // 3. Create token
      console.log('Creating token...', {
        name: form.name,
        symbol: form.symbol,
        totalSupply: form.totalSupply,
        metadataURI,
        pricePerToken: form.pricePerToken
      })

      // Validate inputs
      if (parseFloat(form.totalSupply) <= 0) {
        throw new Error('Total supply must be greater than 0')
      }
      if (parseFloat(form.pricePerToken) <= 0) {
        throw new Error('Price per token must be greater than 0')
      }

      const tx = await factory.createToken(
        form.name,
        form.symbol,
        parseEther(form.totalSupply),
        metadataURI,
        parseEther(form.pricePerToken)
      )

      setTxHash(tx.hash)
      console.log('Transaction sent:', tx.hash)

      const receipt = await tx.wait()
      console.log('Transaction confirmed:', receipt)

      // Extract token address from event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log)
          return parsed?.name === 'TokenCreated'
        } catch {
          return false
        }
      })

      if (event) {
        const parsed = factory.interface.parseLog(event)
        const tokenAddress = parsed?.args[0]
        setCreatedToken(tokenAddress)

        // Save to localStorage and state
        const updatedTokens = [...createdTokens, tokenAddress]
        setCreatedTokens(updatedTokens)
        localStorage.setItem('createdTokens', JSON.stringify(updatedTokens))

        // Save to database
        try {
          const tokenResponse = await fetch('/api/tokens', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: form.name,
              symbol: form.symbol,
              totalSupply: form.totalSupply,
              owner: address,
              contractAddress: tokenAddress,
            }),
          })

          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json()
            const tokenId = tokenData.data.id
            console.log('Token saved to database:', tokenData)

            // Save transaction to database
            try {
              const txResponse = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  token_id: tokenId,
                  from_address: '0x0000000000000000000000000000000000000000', // Contract creation
                  to_address: address,
                  amount: form.totalSupply,
                  transaction_hash: tx.hash,
                }),
              })

              if (txResponse.ok) {
                const txData = await txResponse.json()
                console.log('Transaction saved to database:', txData)
              } else {
                const error = await txResponse.json()
                console.error('Failed to save transaction:', error)
              }
            } catch (txError) {
              console.error('Error saving transaction:', txError)
            }
          } else {
            const error = await tokenResponse.json()
            console.error('Failed to save token to database:', error)
          }
        } catch (dbError) {
          console.error('Error saving to database:', dbError)
        }

        // Call callback if provided
        if (onTokenCreated) {
          onTokenCreated(tokenAddress)
        }

        // Call success callback to refresh marketplace
        if (onTokenCreatedSuccess) {
          onTokenCreatedSuccess()
        }

        alert(`✅ Token created successfully!\nAddress: ${tokenAddress}\nPrice: ${form.pricePerToken} TEST per token\nTokens are now available for purchase!`)
      }

      // Reset form
      setForm({
        name: '',
        symbol: '',
        totalSupply: '',
        description: '',
        image: null,
        pricePerToken: ''
      })

    } catch (error: any) {
      console.error('Lỗi tạo token:', error)
      if (error.message.includes('insufficient funds')) {
        alert('❌ Không đủ TEST token để trả phí gas!')
      } else if (error.message.includes('user rejected')) {
        alert('❌ Bạn đã từ chối transaction!')
      } else if (error.message.includes('Name cannot be empty')) {
        alert('❌ Tên token không được để trống!')
      } else if (error.message.includes('Symbol cannot be empty')) {
        alert('❌ Symbol token không được để trống!')
      } else if (error.message.includes('Total supply must be greater than 0')) {
        alert('❌ Total supply phải lớn hơn 0!')
      } else if (error.message.includes('Price per token must be greater than 0')) {
        alert('❌ Giá token phải lớn hơn 0!')
      } else {
        alert(`❌ Lỗi tạo token: ${error.message || error}`)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return (
      <div className="max-w-md mx-auto bg-pump-card rounded-xl border border-gray-800 p-8" style={{
        maxWidth: '28rem',
        margin: '0 auto',
        background: 'rgb(11, 15, 25)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        padding: '2rem'
      }}>
        <div className="text-center space-y-6" style={{ textAlign: 'center' }}>
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto flex items-center justify-center" style={{
            width: '4rem',
            height: '4rem',
            background: 'linear-gradient(90deg, #a855f7, #ec4899)',
            borderRadius: '50%',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span className="text-white text-2xl font-bold" style={{
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}>T</span>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 className="text-2xl font-bold text-white mb-2" style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '0.5rem'
            }}>Token Creator</h2>
            <p className="text-gray-400" style={{ color: '#9ca3af' }}>Tạo token của riêng bạn trên Oasis Sapphire</p>
          </div>
          <button
            onClick={connectWallet}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 transform hover:scale-105"
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, #9333ea, #db2777)',
              color: 'white',
              fontWeight: 'bold',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              transform: 'scale(1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(90deg, #7c3aed, #be185d)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(90deg, #9333ea, #db2777)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Kết nối MetaMask
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto bg-pump-card rounded-xl border border-gray-800 p-8" style={{
      maxWidth: '42rem',
      margin: '0 auto',
      background: 'rgb(11, 15, 25)',
      borderRadius: '0.75rem',
      border: '1px solid rgba(139, 92, 246, 0.2)',
      padding: '2rem'
    }}>
      <div className="text-center mb-8" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto flex items-center justify-center mb-4" style={{
          width: '4rem',
          height: '4rem',
          background: 'linear-gradient(90deg, #a855f7, #ec4899)',
          borderRadius: '50%',
          margin: '0 auto 1rem auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span className="text-white text-2xl font-bold" style={{
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>T</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2" style={{
          fontSize: '1.875rem',
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: '0.5rem'
        }}>Create Your Token</h2>
        <p className="text-gray-400" style={{ color: '#9ca3af' }}>Deploy your own ERC20 token on Oasis Sapphire</p>
      </div>

      {/* Wallet Info */}
      <div className="bg-pump-bg rounded-lg p-4 mb-6 border border-gray-800" style={{
        background: 'rgba(17, 24, 39, 0.5)',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1.5rem',
        border: '1px solid rgba(139, 92, 246, 0.2)'
      }}>
        <p className="text-sm text-gray-400" style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Connected Wallet:</p>
        <p className="font-mono text-sm text-gray-300 break-all" style={{
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          color: '#d1d5db',
          wordBreak: 'break-all'
        }}>{address}</p>
      </div>

      {/* Form */}
      <div className="space-y-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="grid md:grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#d1d5db',
              marginBottom: '0.5rem'
            }}>
              Token Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. My Awesome Token"
              className="w-full px-4 py-3 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pump-green focus:border-transparent bg-pump-bg text-white"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '0.5rem',
                outline: 'none',
                fontSize: '1rem',
                background: 'rgba(31, 41, 55, 0.4)',
                color: '#ffffff'
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#d1d5db',
              marginBottom: '0.5rem'
            }}>
              Symbol *
            </label>
            <input
              type="text"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
              placeholder="e.g. MAT"
              className="w-full px-4 py-3 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pump-green focus:border-transparent bg-pump-bg text-white"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '0.5rem',
                outline: 'none',
                fontSize: '1rem',
                background: 'rgba(31, 41, 55, 0.4)',
                color: '#ffffff'
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2" style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#d1d5db',
            marginBottom: '0.5rem'
          }}>
            Total Supply *
          </label>
          <input
            type="number"
            value={form.totalSupply}
            onChange={(e) => setForm({ ...form, totalSupply: e.target.value })}
            placeholder="e.g. 1000000"
            min="1"
            className="w-full px-4 py-3 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pump-green focus:border-transparent bg-pump-bg text-white"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '0.5rem',
              outline: 'none',
              fontSize: '1rem',
              background: 'rgba(31, 41, 55, 0.4)',
              color: '#ffffff'
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2" style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#d1d5db',
            marginBottom: '0.5rem'
          }}>
            Price Per Token (TEST) *
          </label>
          <input
            type="number"
            value={form.pricePerToken}
            onChange={(e) => setForm({ ...form, pricePerToken: e.target.value })}
            placeholder="e.g. 0.001"
            min="0"
            step="0.000000000000000001"
            className="w-full px-4 py-3 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pump-green focus:border-transparent bg-pump-bg text-white"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '0.5rem',
              outline: 'none',
              fontSize: '1rem',
              background: 'rgba(31, 41, 55, 0.4)',
              color: '#ffffff'
            }}
          />
          <p className="text-xs text-gray-500 mt-1" style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '0.25rem'
          }}>
            Giá mỗi token khi người khác mua từ smart contract
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2" style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#d1d5db',
            marginBottom: '0.5rem'
          }}>
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe your token..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pump-green focus:border-transparent bg-pump-bg text-white"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '0.5rem',
              outline: 'none',
              fontSize: '1rem',
              resize: 'vertical',
              minHeight: '80px',
              background: 'rgba(31, 41, 55, 0.4)',
              color: '#ffffff'
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2" style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#d1d5db',
            marginBottom: '0.5rem'
          }}>
            Token Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full px-4 py-3 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pump-green focus:border-transparent bg-pump-bg text-white"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '0.5rem',
              outline: 'none',
              fontSize: '1rem',
              background: 'rgba(31, 41, 55, 0.4)',
              color: '#ffffff'
            }}
          />
          {form.image && (
            <p className="text-sm text-pump-green mt-2" style={{
              fontSize: '0.875rem',
              color: '#4ade80',
              marginTop: '0.5rem'
            }}>
              Selected: {form.image.name}
            </p>
          )}
        </div>

        {form.totalSupply && form.pricePerToken && (
          <div className="bg-pump-accent/10 rounded-lg p-4 border border-pump-accent/30" style={{
            background: 'rgba(139, 92, 246, 0.1)',
            borderRadius: '0.5rem',
            padding: '1rem',
            border: '1px solid rgba(139, 92, 246, 0.3)'
          }}>
            <p className="text-sm text-pump-accent font-medium" style={{
              fontSize: '0.875rem',
              color: '#c4b5fd',
              fontWeight: '500'
            }}>
              Token Overview:
            </p>
            <div className="text-sm text-gray-300 mt-2 space-y-1" style={{
              fontSize: '0.875rem',
              color: '#d1d5db',
              marginTop: '0.5rem'
            }}>
              <p>Total Supply: {parseInt(form.totalSupply).toLocaleString()} {form.symbol || 'tokens'}</p>
              <p>Price per Token: {form.pricePerToken} TEST</p>
              <p>Total Value: {(parseInt(form.totalSupply || '0') * parseFloat(form.pricePerToken || '0')).toFixed(6)} TEST</p>
              <p className="text-xs text-pump-accent mt-2" style={{ fontSize: '0.75rem', color: '#a78bfa', marginTop: '0.5rem' }}>
                💡 Smart contract sẽ nắm giữ tất cả tokens và tự động bán theo giá đã đặt
              </p>
            </div>
          </div>
        )}

        <button
          onClick={createToken}
          disabled={loading || !form.name || !form.symbol || !form.totalSupply || !form.pricePerToken}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-4 px-6 rounded-lg transition duration-200"
          style={{
            width: '100%',
            background: loading || !form.name || !form.symbol || !form.totalSupply || !form.pricePerToken
              ? 'linear-gradient(90deg, #4b5563, #4b5563)'
              : 'linear-gradient(90deg, #9333ea, #7c3aed)',
            color: 'white',
            fontWeight: 'bold',
            padding: '1rem 1.5rem',
            borderRadius: '0.5rem',
            border: 'none',
            cursor: loading || !form.name || !form.symbol || !form.totalSupply || !form.pricePerToken ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            fontSize: '1rem'
          }}
          onMouseEnter={(e) => {
            if (!loading && form.name && form.symbol && form.totalSupply && form.pricePerToken) {
              e.currentTarget.style.background = 'linear-gradient(90deg, #7c3aed, #6d28d9)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && form.name && form.symbol && form.totalSupply && form.pricePerToken) {
              e.currentTarget.style.background = 'linear-gradient(90deg, #9333ea, #7c3aed)';
            }
          }}
        >
          {loading ? 'Creating Token...' : 'Create Token'}
        </button>
      </div>

      {/* Transaction Info */}
      {txHash && (
        <div className="mt-6 bg-pump-accent/10 rounded-lg p-4 border border-pump-accent/30" style={{
          marginTop: '1.5rem',
          background: 'rgba(139, 92, 246, 0.1)',
          borderRadius: '0.5rem',
          padding: '1rem',
          border: '1px solid rgba(139, 92, 246, 0.3)'
        }}>
          <p className="text-sm text-pump-accent font-medium" style={{
            fontSize: '0.875rem',
            color: '#c4b5fd',
            fontWeight: '500'
          }}>Transaction Hash:</p>
          <a
            href={`https://testnet.explorer.sapphire.oasis.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-pump-accent hover:text-pump-green break-all"
            style={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              color: '#a78bfa',
              textDecoration: 'none',
              wordBreak: 'break-all'
            }}
          >
            {txHash}
          </a>
        </div>
      )}

      {/* Created Token */}
      {createdToken && (
        <div className="mt-6 bg-pump-green/10 rounded-lg p-4 border border-pump-green/30" style={{
          marginTop: '1.5rem',
          background: 'rgba(74, 222, 128, 0.1)',
          borderRadius: '0.5rem',
          padding: '1rem',
          border: '1px solid rgba(74, 222, 128, 0.3)'
        }}>
          <p className="text-sm text-pump-green font-medium" style={{
            fontSize: '0.875rem',
            color: '#86efac',
            fontWeight: '500'
          }}>Token Created Successfully!</p>
          <p className="text-sm text-gray-300" style={{
            fontSize: '0.875rem',
            color: '#d1d5db'
          }}>Contract Address:</p>
          <a
            href={`https://testnet.explorer.sapphire.oasis.io/address/${createdToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-pump-green hover:text-pump-green/80 break-all"
            style={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              color: '#86efac',
              textDecoration: 'none',
              wordBreak: 'break-all'
            }}
          >
            {createdToken}
          </a>
        </div>
      )}
    </div>
  )
}

// Remove the static method as it's not needed anymore