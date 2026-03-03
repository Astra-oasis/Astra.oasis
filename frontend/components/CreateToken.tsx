'use client'

import { useState, useEffect } from 'react'
import { BrowserProvider, Contract } from 'ethers'
import { wrapEthereumProvider } from '@oasisprotocol/sapphire-paratime'
import { FACTORY_ABI, FACTORY_ADDRESS } from '../abi/factoryAbi'

declare global {
  interface Window {
    ethereum?: any
  }
}

interface TokenForm {
  name: string
  symbol: string
  description: string
  socialLink: string
  image: File | null
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
    description: '',
    socialLink: '',
    image: null
  })
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [createdToken, setCreatedToken] = useState('')
  const [createdTokens, setCreatedTokens] = useState<string[]>([])

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            setConnected(true)
            setAddress(accounts[0])
<<<<<<< Updated upstream
            
            // Notify parent component
            if (onConnectionChange) {
              onConnectionChange(true, accounts[0])
            }
            
            console.log('Auto-detected wallet connection:', accounts[0])
=======
            if (onConnectionChange) {
              onConnectionChange(true, accounts[0])
            }
>>>>>>> Stashed changes
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
      alert('Please install MetaMask!')
      return
    }

    let ethereum = window.ethereum
    if (window.ethereum.providers) {
      ethereum = window.ethereum.providers.find((provider: any) => provider.isMetaMask)
      if (!ethereum) {
        alert('MetaMask not found!')
        return
      }
    }

    try {
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length > 0) {
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
<<<<<<< Updated upstream
        
        // Notify parent component
=======

>>>>>>> Stashed changes
        if (onConnectionChange) {
          onConnectionChange(true, accounts[0])
        }
      }
    } catch (error) {
      console.error('Connection error:', error)
      alert('Wallet connection failed!')
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setForm({ ...form, image: file })
    }
  }

<<<<<<< Updated upstream
  const uploadToIPFS = async (data: any): Promise<string> => {
    // Simulate IPFS upload - trong thực tế sẽ upload lên IPFS/Arweave
    console.log('Uploading to IPFS...', data)
    
    // Mock IPFS hash
    const mockHash = 'QmX' + Math.random().toString(36).substring(2, 15)
    return `ipfs://${mockHash}`
=======
  const uploadToIPFS = async (file: File): Promise<string> => {
    // TODO: Implement real IPFS upload
    // For now, return empty string - store description in database instead
    return ''
>>>>>>> Stashed changes
  }

  const createToken = async () => {
    if (!form.name || !form.symbol) {
      alert('Please fill in all required fields!')
      return
    }

    setLoading(true)
    setTxHash('')
    setCreatedToken('')

    try {
      // No IPFS upload - we'll store metadata in database
      const metadataURI = ''

      let ethereum = window.ethereum
      if (window.ethereum?.providers) {
        ethereum = window.ethereum.providers.find((provider: any) => provider.isMetaMask)
      }

      const wrappedProvider = wrapEthereumProvider(ethereum)
      const provider = new BrowserProvider(wrappedProvider)
      const signer = await provider.getSigner()
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer)

      const tx = await factory.createToken(
        form.name,
        form.symbol,
        metadataURI
      )

      setTxHash(tx.hash)
      const receipt = await tx.wait()

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
<<<<<<< Updated upstream
        
        // Save to localStorage and state
        const updatedTokens = [...createdTokens, tokenAddress]
        setCreatedTokens(updatedTokens)
        localStorage.setItem('createdTokens', JSON.stringify(updatedTokens))
        
        // Call callback if provided
        if (onTokenCreated) {
          onTokenCreated(tokenAddress)
        }
        
        // Call success callback to refresh marketplace
        if (onTokenCreatedSuccess) {
          onTokenCreatedSuccess()
        }
        
        alert(`✅ Token created successfully!\nAddress: ${tokenAddress}\nPrice: ${form.pricePerToken} TEST per token\nTokens are now available for purchase!`)
=======

        const updatedTokens = [...createdTokens, tokenAddress]
        setCreatedTokens(updatedTokens)

        // Save to database with description and image
        try {
          // Upload image if exists
          let imageUrl = ''
          if (form.image) {
            const formData = new FormData()
            formData.append('file', form.image)
            
            // TODO: Implement real image upload to storage service
            // For now, we'll skip image upload
            console.log('Image upload not implemented yet')
          }

          const response = await fetch('/api/tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: form.name,
              symbol: form.symbol,
              description: form.description || '',
              image_url: imageUrl,
              social_link: form.socialLink || '',
              totalSupply: '1000000000',
              owner: address,
              contractAddress: tokenAddress,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            console.log('Token saved to database:', data)
          } else {
            const error = await response.json()
            console.error('Failed to save token to database:', error)
            alert('⚠️ Token created but failed to save to database')
          }
        } catch (dbError) {
          console.error('Error saving token to database:', dbError)
          alert('⚠️ Token created but failed to save to database')
        }

        if (onTokenCreated) {
          onTokenCreated(tokenAddress)
        }

        if (onTokenCreatedSuccess) {
          onTokenCreatedSuccess()
        }

        alert(`✅ Token created successfully!\nAddress: ${tokenAddress}`)
>>>>>>> Stashed changes
      }

      setForm({
        name: '',
        symbol: '',
        description: '',
        socialLink: '',
        image: null
      })

    } catch (error: any) {
      console.error('Token creation error:', error)
      alert(`❌ Token creation failed: ${error.message || error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return (
<<<<<<< Updated upstream
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8" style={{
=======
      <div style={{
>>>>>>> Stashed changes
        maxWidth: '28rem',
        margin: '0 auto',
        background: 'white',
        borderRadius: '0.75rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        padding: '2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '4rem',
            height: '4rem',
            background: 'linear-gradient(90deg, #a855f7, #ec4899)',
            borderRadius: '50%',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}>🚀</span>
          </div>
<<<<<<< Updated upstream
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 className="text-2xl font-bold text-gray-800 mb-2" style={{
=======
          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{
>>>>>>> Stashed changes
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '0.5rem'
<<<<<<< Updated upstream
            }}>Token Creator</h2>
            <p className="text-gray-600" style={{ color: '#4b5563' }}>Tạo token của riêng bạn trên Oasis Sapphire</p>
=======
            }}>Launch Your Token</h2>
            <p style={{ color: '#9ca3af' }}>Create and trade on bonding curve</p>
>>>>>>> Stashed changes
          </div>
          <button
            onClick={connectWallet}
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, #9333ea, #db2777)',
              color: 'white',
              fontWeight: 'bold',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Connect Wallet
          </button>
        </div>
      </div>
    )
  }

  return (
<<<<<<< Updated upstream
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8" style={{
=======
    <div style={{
>>>>>>> Stashed changes
      maxWidth: '42rem',
      margin: '0 auto',
      background: 'white',
      borderRadius: '0.75rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      padding: '2rem'
    }}>
<<<<<<< Updated upstream
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
        <h2 className="text-3xl font-bold text-gray-800 mb-2" style={{
=======
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{
>>>>>>> Stashed changes
          fontSize: '1.875rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '0.5rem'
<<<<<<< Updated upstream
        }}>Create Your Token</h2>
        <p className="text-gray-600" style={{ color: '#4b5563' }}>Deploy your own ERC20 token on Oasis Sapphire</p>
      </div>

      {/* Wallet Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6" style={{
        background: '#f9fafb',
=======
        }}>Launch Your Token</h2>
        <p style={{ color: '#9ca3af' }}>1 billion supply • Bonding curve pricing</p>
      </div>

      <div style={{
        background: 'rgba(17, 24, 39, 0.5)',
>>>>>>> Stashed changes
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1.5rem'
      }}>
<<<<<<< Updated upstream
        <p className="text-sm text-gray-600" style={{ fontSize: '0.875rem', color: '#4b5563' }}>Connected Wallet:</p>
        <p className="font-mono text-sm text-gray-800 break-all" style={{
=======
        <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Connected:</p>
        <p style={{
>>>>>>> Stashed changes
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          color: '#1f2937',
          wordBreak: 'break-all'
        }}>{address}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div>
<<<<<<< Updated upstream
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{
=======
            <label style={{
>>>>>>> Stashed changes
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Token Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
<<<<<<< Updated upstream
              placeholder="e.g. My Awesome Token"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
=======
              placeholder="e.g. Pepe Coin"
>>>>>>> Stashed changes
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                outline: 'none',
                fontSize: '1rem'
              }}
            />
          </div>

          <div>
<<<<<<< Updated upstream
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{
=======
            <label style={{
>>>>>>> Stashed changes
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Symbol *
            </label>
            <input
              type="text"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
<<<<<<< Updated upstream
              placeholder="e.g. MAT"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
=======
              placeholder="e.g. PEPE"
>>>>>>> Stashed changes
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                outline: 'none',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        <div>
<<<<<<< Updated upstream
          <label className="block text-sm font-medium text-gray-700 mb-2" style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              outline: 'none',
              fontSize: '1rem'
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              outline: 'none',
              fontSize: '1rem'
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
          <label className="block text-sm font-medium text-gray-700 mb-2" style={{
=======
          <label style={{
>>>>>>> Stashed changes
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Tell us about your token..."
            rows={3}
<<<<<<< Updated upstream
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
=======
>>>>>>> Stashed changes
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              outline: 'none',
              fontSize: '1rem',
              resize: 'vertical',
              minHeight: '80px'
            }}
          />
        </div>

        <div>
<<<<<<< Updated upstream
          <label className="block text-sm font-medium text-gray-700 mb-2" style={{
=======
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#d1d5db',
            marginBottom: '0.5rem'
          }}>
            Social Link (Twitter, Telegram, Website)
          </label>
          <input
            type="url"
            value={form.socialLink}
            onChange={(e) => setForm({ ...form, socialLink: e.target.value })}
            placeholder="https://twitter.com/yourtoken"
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
          <label style={{
>>>>>>> Stashed changes
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Token Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
<<<<<<< Updated upstream
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
=======
>>>>>>> Stashed changes
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              outline: 'none',
              fontSize: '1rem'
            }}
          />
          {form.image && (
<<<<<<< Updated upstream
            <p className="text-sm text-green-600 mt-2" style={{
=======
            <p style={{
>>>>>>> Stashed changes
              fontSize: '0.875rem',
              color: '#059669',
              marginTop: '0.5rem'
            }}>
              ✓ {form.image.name}
            </p>
          )}
        </div>

<<<<<<< Updated upstream
        {form.totalSupply && form.pricePerToken && (
          <div className="bg-blue-50 rounded-lg p-4" style={{
            background: '#eff6ff',
            borderRadius: '0.5rem',
            padding: '1rem'
          }}>
            <p className="text-sm text-blue-800 font-medium" style={{
              fontSize: '0.875rem',
              color: '#1e40af',
              fontWeight: '500'
            }}>
              Token Overview:
            </p>
            <div className="text-sm text-blue-700 mt-2 space-y-1" style={{
              fontSize: '0.875rem',
              color: '#1d4ed8',
              marginTop: '0.5rem'
            }}>
              <p>Total Supply: {parseInt(form.totalSupply).toLocaleString()} {form.symbol || 'tokens'}</p>
              <p>Price per Token: {form.pricePerToken} TEST</p>
              <p>Total Value: {(parseInt(form.totalSupply || '0') * parseFloat(form.pricePerToken || '0')).toFixed(6)} TEST</p>
              <p className="text-xs text-blue-600 mt-2" style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.5rem' }}>
                💡 Smart contract sẽ nắm giữ tất cả tokens và tự động bán theo giá đã đặt
              </p>
            </div>
          </div>
        )}

        <button
          onClick={createToken}
          disabled={loading || !form.name || !form.symbol || !form.totalSupply || !form.pricePerToken}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-4 px-6 rounded-lg transition duration-200 transform hover:scale-105 disabled:scale-100"
          style={{
            width: '100%',
            background: loading || !form.name || !form.symbol || !form.totalSupply || !form.pricePerToken
              ? 'linear-gradient(90deg, #9ca3af, #9ca3af)' 
              : 'linear-gradient(90deg, #9333ea, #db2777)',
=======
        <button
          onClick={createToken}
          disabled={loading || !form.name || !form.symbol}
          style={{
            width: '100%',
            background: loading || !form.name || !form.symbol
              ? 'linear-gradient(90deg, #4b5563, #4b5563)'
              : 'linear-gradient(90deg, #9333ea, #7c3aed)',
>>>>>>> Stashed changes
            color: 'white',
            fontWeight: 'bold',
            padding: '1rem 1.5rem',
            borderRadius: '0.5rem',
            border: 'none',
            cursor: loading || !form.name || !form.symbol ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            transform: 'scale(1)',
            fontSize: '1rem'
          }}
<<<<<<< Updated upstream
          onMouseEnter={(e) => {
            if (!loading && form.name && form.symbol && form.totalSupply && form.pricePerToken) {
              e.currentTarget.style.background = 'linear-gradient(90deg, #7c3aed, #be185d)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && form.name && form.symbol && form.totalSupply && form.pricePerToken) {
              e.currentTarget.style.background = 'linear-gradient(90deg, #9333ea, #db2777)';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
=======
>>>>>>> Stashed changes
        >
          {loading ? 'Creating Token...' : 'Create Token'}
        </button>
      </div>

      {txHash && (
<<<<<<< Updated upstream
        <div className="mt-6 bg-blue-50 rounded-lg p-4" style={{
=======
        <div style={{
>>>>>>> Stashed changes
          marginTop: '1.5rem',
          background: '#eff6ff',
          borderRadius: '0.5rem',
          padding: '1rem'
        }}>
<<<<<<< Updated upstream
          <p className="text-sm text-blue-800 font-medium" style={{
=======
          <p style={{
>>>>>>> Stashed changes
            fontSize: '0.875rem',
            color: '#1e40af',
            fontWeight: '500'
          }}>Transaction Hash:</p>
          <a
            href={`https://testnet.explorer.sapphire.oasis.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
<<<<<<< Updated upstream
            className="font-mono text-sm text-blue-600 hover:underline break-all"
=======
>>>>>>> Stashed changes
            style={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              color: '#2563eb',
              textDecoration: 'none',
              wordBreak: 'break-all'
            }}
          >
            {txHash}
          </a>
        </div>
      )}

      {createdToken && (
<<<<<<< Updated upstream
        <div className="mt-6 bg-green-50 rounded-lg p-4" style={{
=======
        <div style={{
>>>>>>> Stashed changes
          marginTop: '1.5rem',
          background: '#f0fdf4',
          borderRadius: '0.5rem',
          padding: '1rem'
        }}>
<<<<<<< Updated upstream
          <p className="text-sm text-green-800 font-medium" style={{
=======
          <p style={{
>>>>>>> Stashed changes
            fontSize: '0.875rem',
            color: '#166534',
            fontWeight: '500'
<<<<<<< Updated upstream
          }}>Token Created Successfully!</p>
          <p className="text-sm text-green-700" style={{
            fontSize: '0.875rem',
            color: '#15803d'
          }}>Contract Address:</p>
=======
          }}>✅ Token Created!</p>
>>>>>>> Stashed changes
          <a
            href={`https://testnet.explorer.sapphire.oasis.io/address/${createdToken}`}
            target="_blank"
            rel="noopener noreferrer"
<<<<<<< Updated upstream
            className="font-mono text-sm text-green-600 hover:underline break-all"
=======
>>>>>>> Stashed changes
            style={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              color: '#16a34a',
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
