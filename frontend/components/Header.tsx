'use client';

import React, { useState } from 'react';
import {
  Wallet,
  Search,
  LayoutGrid,
  PlusCircle,
  HelpCircle,
  Menu,
  X,
  ChevronDown,
  Settings,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  onConnectWallet: () => void;
  walletConnected: boolean;
  walletAddress?: string;
  activeTab: 'showMarketplace' | 'create';
  onChangeTab: (tab: 'showMarketplace' | 'create') => void;
}

const Header: React.FC<HeaderProps> = ({
  onConnectWallet,
  walletConnected,
  walletAddress,
  activeTab,
  onChangeTab,
}) => {

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);

  const headerStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    width: '100%',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(11, 15, 25, 0.95)',
    backdropFilter: 'blur(10px)',
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '80rem',
    margin: '0 auto',
    paddingLeft: '1rem',
    paddingRight: '1rem',
  };

  const headerRowStyle: React.CSSProperties = {
    display: 'flex',
    height: '64px',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const leftDivStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  };

  const logoWrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    opacity: 1,
    transition: 'opacity 0.2s',
  };

  const logoBadgeStyle: React.CSSProperties = {
    display: 'flex',
    height: '40px',
    width: '40px',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    boxShadow: '0 4px 6px rgba(139, 92, 246, 0.3)',
  };

  const logoTextStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  };

  const logoTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    lineHeight: 1,
  };

  const logoSubtitleStyle: React.CSSProperties = {
    fontSize: '10px',
    color: '#9ca3af',
    fontFamily: 'monospace',
  };

  const navStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  const navButtonBaseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const searchContainerStyle: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    maxWidth: '448px',
    marginLeft: '32px',
    marginRight: '32px',
  };

  const searchWrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
  };

  const rightDivStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const walletContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
  };

  const mobileMenuButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    borderRadius: '8px',
    color: '#d1d5db',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const mobileMenuStyle: React.CSSProperties = {
    display: mobileMenuOpen ? 'block' : 'none',
    paddingBottom: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  };

  const mobileMenuListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingTop: '16px',
    paddingBottom: '16px',
  };

  return (
    <header style={headerStyle}>
      <div style={containerStyle}>
        <div style={headerRowStyle}>
          {/* LEFT */}
          <div style={leftDivStyle}>
            {/* LOGO */}
            <div
              style={logoWrapperStyle}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <div style={logoBadgeStyle}>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>◆</span>
              </div>

              <div style={logoTextStyle}>
                <span style={logoTitleStyle}>Oasis Astra</span>
                <span style={logoSubtitleStyle}>Sapphire Network</span>
              </div>
            </div>

            {/* NAV DESKTOP */}
            <nav style={navStyle}>
              <button
                onClick={() => onChangeTab('showMarketplace')}
                style={{
                  ...navButtonBaseStyle,
                  color: activeTab === 'showMarketplace' ? '#fff' : '#d1d5db',
                  backgroundColor:
                    activeTab === 'showMarketplace'
                      ? 'rgba(139, 92, 246, 0.15)'
                      : 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.15)';
                }}
              >
                <LayoutGrid style={{ width: '16px', height: '16px' }} />
                Board
              </button>

              <button
                onClick={() => onChangeTab('create')}
                style={{
                  ...navButtonBaseStyle,
                  color: activeTab === 'create' ? '#fff' : '#d1d5db',
                  backgroundColor:
                    activeTab === 'create'
                      ? 'rgba(139, 92, 246, 0.15)'
                      : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'create') {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'create') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#d1d5db';
                  }
                }}
              >
                <PlusCircle style={{ width: '16px', height: '16px' }} />
                Create Token
              </button>


              <button
                style={{
                  ...navButtonBaseStyle,
                  color: '#d1d5db',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#d1d5db';
                }}
              >
                <HelpCircle style={{ width: '16px', height: '16px' }} />
                Docs
              </button>
            </nav>
          </div>

          {/* CENTER SEARCH */}
          <div style={searchContainerStyle}>
            <div style={searchWrapperStyle}>
              <Search
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '12px',
                  width: '16px',
                  height: '16px',
                  color: '#6b7280',
                }}
              />

              <input
                type="search"
                placeholder="Search tokens..."
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(17, 24, 39, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  paddingLeft: '40px',
                  paddingRight: '16px',
                  fontSize: '14px',
                  outline: 'none',
                  color: '#fff',
                  transition: 'all 0.2s',
                } as React.CSSProperties}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#8b5cf6';
                  e.currentTarget.style.backgroundColor = 'rgba(17, 24, 39, 1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.backgroundColor = 'rgba(17, 24, 39, 0.8)';
                }}
              />
            </div>
          </div>

          {/* RIGHT */}
          <div style={rightDivStyle}>
            {/* WALLET BUTTON */}
            <div style={walletContainerStyle}>
              <button
                onClick={() => {
                  if (walletConnected) {
                    setWalletDropdownOpen(!walletDropdownOpen);
                  } else {
                    onConnectWallet();
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '8px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  boxShadow: '0 4px 6px rgba(139, 92, 246, 0.3)',
                  transition: 'all 0.2s',
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(139, 92, 246, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(139, 92, 246, 0.3)';
                }}
              >
                <Wallet style={{ width: '16px', height: '16px' }} />

                {walletConnected ? (
                  <>
                    <span style={{ fontSize: '12px' }}>
                      {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                    </span>
                    <ChevronDown style={{ width: '16px', height: '16px' }} />
                  </>
                ) : (
                  'Connect Wallet'
                )}
              </button>

              {/* WALLET DROPDOWN */}
              {walletConnected && walletDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '192px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    zIndex: 50,
                    backdropFilter: 'blur(10px)',
                  } as React.CSSProperties}
                >
                  <div
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <p style={{ fontSize: '12px', color: '#9ca3af' }}>Connected Wallet</p>
                    <p
                      style={{
                        fontSize: '14px',
                        color: '#fff',
                        fontFamily: 'monospace',
                        marginTop: '4px',
                      }}
                    >
                      {walletAddress}
                    </p>
                  </div>

                  <button
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: '#d1d5db',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    } as React.CSSProperties}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#d1d5db';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Settings style={{ width: '16px', height: '16px' }} />
                    Settings
                  </button>

                  <button
                    onClick={() => {
                      setWalletDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: '#f87171',
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      borderRadius: '0 0 6px 6px',
                      transition: 'all 0.2s',
                    } as React.CSSProperties}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#fca5a5';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#f87171';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <LogOut style={{ width: '16px', height: '16px' }} />
                    Disconnect
                  </button>
                </div>
              )}
            </div>

            {/* MOBILE MENU BUTTON */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={mobileMenuButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#d1d5db';
              }}
            >
              {mobileMenuOpen ? (
                <X style={{ width: '24px', height: '24px' }} />
              ) : (
                <Menu style={{ width: '24px', height: '24px' }} />
              )}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {mobileMenuOpen && (
          <div style={mobileMenuStyle}>
            <div style={mobileMenuListStyle}>
              {/* MOBILE SEARCH */}
              <div style={{ paddingLeft: '8px', paddingRight: '8px', marginBottom: '8px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '12px',
                      width: '16px',
                      height: '16px',
                      color: '#6b7280',
                    }}
                  />
                  <input
                    type="search"
                    placeholder="Search tokens..."
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(17, 24, 39, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      paddingTop: '8px',
                      paddingBottom: '8px',
                      paddingLeft: '40px',
                      paddingRight: '16px',
                      fontSize: '14px',
                      outline: 'none',
                      color: '#fff',
                      transition: 'all 0.2s',
                    } as React.CSSProperties}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#8b5cf6';
                      e.currentTarget.style.backgroundColor = 'rgba(17, 24, 39, 1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.backgroundColor = 'rgba(17, 24, 39, 0.8)';
                    }}
                  />
                </div>
              </div>

              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#fff',
                  backgroundColor: 'rgba(139, 92, 246, 0.15)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.15)';
                }}
              >
                <LayoutGrid style={{ width: '16px', height: '16px' }} />
                Board
              </button>

              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#d1d5db',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#d1d5db';
                }}
              >
                <PlusCircle style={{ width: '16px', height: '16px' }} />
                Create Token
              </button>

              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#d1d5db',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#d1d5db';
                }}
              >
                <HelpCircle style={{ width: '16px', height: '16px' }} />
                Docs
              </button>

              {/* MOBILE WALLET BUTTON */}
              {!walletConnected && (
                <button
                  onClick={() => {
                    onConnectWallet();
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '8px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    boxShadow: '0 4px 6px rgba(139, 92, 246, 0.3)',
                    width: '100%',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  } as React.CSSProperties}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(139, 92, 246, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(139, 92, 246, 0.3)';
                  }}
                >
                  <Wallet style={{ width: '16px', height: '16px' }} />
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
