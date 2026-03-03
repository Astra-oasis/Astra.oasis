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
            if (onConnectionChange) {
              onConnectionChange(true, accounts[0])
            }
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

  const uploadToIPFS = async (file: File): Promise<string> => {
    // TODO: Implement real IPFS upload
    // For now, return empty string - store description in database instead
    return ''
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
      <div style={{
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
          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '0.5rem'
            }}>Launch Your Token</h2>
            <p style={{ color: '#9ca3af' }}>Create and trade on bonding curve</p>
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
    <div style={{
      maxWidth: '42rem',
      margin: '0 auto',
      background: 'white',
      borderRadius: '0.75rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      padding: '2rem'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: '1.875rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '0.5rem'
        }}>Launch Your Token</h2>
        <p style={{ color: '#9ca3af' }}>1 billion supply • Bonding curve pricing</p>
      </div>

      <div style={{
        background: 'rgba(17, 24, 39, 0.5)',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1.5rem'
      }}>
        <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Connected:</p>
        <p style={{
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          color: '#1f2937',
          wordBreak: 'break-all'
        }}>{address}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div>
            <label style={{
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
              placeholder="e.g. Pepe Coin"
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
            <label style={{
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
              placeholder="e.g. PEPE"
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
          <label style={{
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
            <p style={{
              fontSize: '0.875rem',
              color: '#059669',
              marginTop: '0.5rem'
            }}>
              ✓ {form.image.name}
            </p>
          )}
        </div>

        <button
          onClick={createToken}
          disabled={loading || !form.name || !form.symbol}
          style={{
            width: '100%',
            background: loading || !form.name || !form.symbol
              ? 'linear-gradient(90deg, #4b5563, #4b5563)'
              : 'linear-gradient(90deg, #9333ea, #7c3aed)',
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
        >
          {loading ? 'Creating Token...' : 'Create Token'}
        </button>
      </div>

      {txHash && (
        <div style={{
          marginTop: '1.5rem',
          background: '#eff6ff',
          borderRadius: '0.5rem',
          padding: '1rem'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#1e40af',
            fontWeight: '500'
          }}>Transaction Hash:</p>
          <a
            href={`https://testnet.explorer.sapphire.oasis.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
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
        <div style={{
          marginTop: '1.5rem',
          background: '#f0fdf4',
          borderRadius: '0.5rem',
          padding: '1rem'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#166534',
            fontWeight: '500'
          }}>✅ Token Created!</p>
          <a
            href={`https://testnet.explorer.sapphire.oasis.io/address/${createdToken}`}
            target="_blank"
            rel="noopener noreferrer"
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
