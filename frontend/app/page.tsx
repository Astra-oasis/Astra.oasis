'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import Header from '../components/Header'

const CreateToken = dynamic(() => import('../components/CreateToken'), { ssr: false })
const TokenMarketplace = dynamic(() => import('../components/TokenMarketplace'), { ssr: false })

export default function Home() {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState('')
  const [createdTokens, setCreatedTokens] = useState<string[]>([])

  // TAB STATE
  const [tab, setTab] = useState<'showMarketplace' | 'create'>('showMarketplace')

  // Khi tạo token xong → quay về market
  const handleTokenCreated = (tokenAddress: string) => {
    const updatedTokens = [...createdTokens, tokenAddress]

    setCreatedTokens(updatedTokens)
    localStorage.setItem('createdTokens', JSON.stringify(updatedTokens))

    setTab('showMarketplace')
  }

  // Connect wallet
  const handleConnectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        })

        if (accounts.length > 0) {
          setConnected(true)
          setAddress(accounts[0])
        }
      } catch {
        console.log('Wallet connection failed')
      }
    }
  }

  // Load data
  useEffect(() => {
    const saved = localStorage.getItem('createdTokens')

    if (saved) {
      try {
        setCreatedTokens(JSON.parse(saved))
      } catch {}
    }

    const checkConnection = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        })

        if (accounts.length > 0) {
          setConnected(true)
          setAddress(accounts[0])
        }
      }
    }

    checkConnection()
  }, [])

  return (
    <div className="min-h-screen bg-pump-bg text-pump-text font-sans">

      {/* HEADER */}
      <Header
        onConnectWallet={handleConnectWallet}
        walletConnected={connected}
        walletAddress={address}

        // 👇 TRUYỀN TAB
        activeTab={tab}
        onChangeTab={setTab}
      />

      {/* CONTENT */}
      <main className="container mx-auto px-4 py-8">

        {/* MARKET */}
        {tab === 'showMarketplace' && connected && (
          <TokenMarketplace
            connected={connected}
            address={address}
            createdTokens={createdTokens}
          />
        )}

        {/* CREATE */}
        {tab === 'create' && (
          <CreateToken
            onTokenCreated={handleTokenCreated}
            onConnectionChange={(c, a) => {
              setConnected(c)
              setAddress(a)
            }}
          />
        )}

      </main>
    </div>
  )
}
