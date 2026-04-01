// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TokenPolicyMint.sol";

contract TokenFactory {
    struct TokenInfo {
        address tokenAddress;
        string name;
        string symbol;
        uint256 totalSupply;
        string metadataURI;
        address creator;
        uint256 createdAt;
    }
    
    TokenInfo[] public tokens;
    mapping(address => address[]) public creatorTokens;
    mapping(address => bool) public isToken;
    
    event TokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 totalSupply,
        string metadataURI
    );
    
    function createToken(
        string memory _name,
        string memory _symbol,
        string memory _metadataURI
    ) external returns (address) {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_symbol).length > 0, "Symbol cannot be empty");
        
        TokenPolicyMint newToken = new TokenPolicyMint(
            _name,
            _symbol,
            _metadataURI,
            msg.sender
        );
        
        address tokenAddress = address(newToken);
        
        TokenInfo memory tokenInfo = TokenInfo({
            tokenAddress: tokenAddress,
            name: _name,
            symbol: _symbol,
            totalSupply: 1_000_000_000 * 10**18,
            metadataURI: _metadataURI,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        
        tokens.push(tokenInfo);
        creatorTokens[msg.sender].push(tokenAddress);
        isToken[tokenAddress] = true;
        
        emit TokenCreated(
            tokenAddress,
            msg.sender,
            _name,
            _symbol,
            1_000_000_000 * 10**18,
            _metadataURI
        );
        
        return tokenAddress;
    }
    
    function getTokenCount() external view returns (uint256) {
        return tokens.length;
    }
    
    function getTokensByCreator(address creator) external view returns (address[] memory) {
        return creatorTokens[creator];
    }
    
    function getTokenInfo(uint256 index) external view returns (TokenInfo memory) {
        require(index < tokens.length, "Token index out of bounds");
        return tokens[index];
    }
    
    function getAllTokens() external view returns (TokenInfo[] memory) {
        return tokens;
    }
}