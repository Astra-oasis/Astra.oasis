// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TokenPolicyMint {
    uint256 public constant BASIS_POINTS = 10_000;
    uint256 public constant CREATOR_FEE_BPS = 30; // 0.300%
    uint256 public constant PROTOCOL_FEE_BPS = 80; // 0.800%
    address public constant PLATFORM_WALLET = 0x9000ddD81bCBF2851D2e2f467a0A4984Ac816224;

    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    
    string public metadataURI;
    address public creator;
    bool public isForSale;
    
    uint256 public soldSupply;
    uint256 public reserveBalance;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event TokenPurchased(address indexed buyer, uint256 totalPrice, uint256 newPrice);
    event TokenSold(address indexed seller, uint256 totalPrice, uint256 newPrice);
    event TradeFeesPaid(address indexed trader, bool isBuy, uint256 creatorFee, uint256 protocolFee);
    
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _metadataURI,
        address _creator
    ) {
        name = _name;
        symbol = _symbol;
        metadataURI = _metadataURI;
        creator = _creator;
        isForSale = true;
        soldSupply = 0;
        reserveBalance = 0;
        
        balanceOf[address(this)] = TOTAL_SUPPLY;
        emit Transfer(address(0), address(this), TOTAL_SUPPLY);
    }
    
    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator can call this function");
        _;
    }
    
    function getCurrentPrice() public view returns (uint256) {
        if (soldSupply == 0) return 5e16;
        uint256 tokensInUnits = soldSupply / 1e18;
        return 5e16 + (tokensInUnits * 1e13);
    }
    
    function getBuyPrice(uint256 amount) public view returns (uint256) {
        if (amount == 0) return 0;
        
        uint256 tokensInUnits = amount / 1e18;
        uint256 currentSoldUnits = soldSupply / 1e18;
        
        uint256 startPrice = 5e16 + (currentSoldUnits * 1e13);
        uint256 endPrice = 5e16 + ((currentSoldUnits + tokensInUnits) * 1e13);
        uint256 avgPrice = (startPrice + endPrice) / 2;
        
        return (avgPrice * amount) / 1e18;
    }
    
    function getSellPrice(uint256 amount) public view returns (uint256) {
        if (amount == 0 || amount > soldSupply) return 0;
        
        uint256 tokensInUnits = amount / 1e18;
        uint256 currentSoldUnits = soldSupply / 1e18;
        
        if (currentSoldUnits < tokensInUnits) return 0;
        
        uint256 startPrice = 5e16 + (currentSoldUnits * 1e13);
        uint256 endPrice = 5e16 + ((currentSoldUnits - tokensInUnits) * 1e13);
        uint256 avgPrice = (startPrice + endPrice) / 2;
        
        uint256 refund = (avgPrice * amount) / 1e18;
        
        if (refund > reserveBalance) return reserveBalance;
        return refund;
    }
    
    function getNewPrice(uint256 supply) internal pure returns (uint256) {
        if (supply == 0) return 5e16;
        uint256 tokensInUnits = supply / 1e18;
        return 5e16 + (tokensInUnits * 1e13);
    }

    function getTradeFees(uint256 amount) public pure returns (uint256 creatorFee, uint256 protocolFee, uint256 totalFee) {
        creatorFee = (amount * CREATOR_FEE_BPS) / BASIS_POINTS;
        protocolFee = (amount * PROTOCOL_FEE_BPS) / BASIS_POINTS;
        totalFee = creatorFee + protocolFee;
    }
    
    function buyTokens(uint256 amount) external payable {
        require(isForSale, "Token is not for sale");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf[address(this)] >= amount, "Not enough tokens available");
        
        uint256 totalPrice = getBuyPrice(amount);
        (uint256 creatorFee, uint256 protocolFee, uint256 totalFee) = getTradeFees(totalPrice);
        uint256 totalCost = totalPrice + totalFee;
        require(msg.value >= totalCost, "Insufficient payment");
        
        balanceOf[address(this)] -= amount;
        balanceOf[msg.sender] += amount;
        soldSupply += amount;
        reserveBalance += totalPrice;

        (bool creatorPaid, ) = payable(creator).call{value: creatorFee}("");
        require(creatorPaid, "Creator fee transfer failed");

        (bool protocolPaid, ) = payable(PLATFORM_WALLET).call{value: protocolFee}("");
        require(protocolPaid, "Protocol fee transfer failed");
        
        if (msg.value > totalCost) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - totalCost}("");
            require(success, "Refund failed");
        }
        
        emit TradeFeesPaid(msg.sender, true, creatorFee, protocolFee);
        emit TokenPurchased(msg.sender, totalPrice, getCurrentPrice());
    }
    
    function sellTokens(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf[msg.sender] >= amount, "Insufficient token balance");
        require(isForSale, "Token sales are disabled");
        require(soldSupply >= amount, "Cannot sell more than sold supply");
        
        uint256 totalPrice = getSellPrice(amount);
        (uint256 creatorFee, uint256 protocolFee, uint256 totalFee) = getTradeFees(totalPrice);
        uint256 netPayout = totalPrice - totalFee;
        require(reserveBalance >= totalPrice, "Insufficient reserve balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[address(this)] += amount;
        soldSupply -= amount;
        reserveBalance -= totalPrice;
        
        (bool success, ) = payable(msg.sender).call{value: netPayout}("");
        require(success, "Transfer failed");

        (bool creatorPaid, ) = payable(creator).call{value: creatorFee}("");
        require(creatorPaid, "Creator fee transfer failed");

        (bool protocolPaid, ) = payable(PLATFORM_WALLET).call{value: protocolFee}("");
        require(protocolPaid, "Protocol fee transfer failed");
        
        emit TradeFeesPaid(msg.sender, false, creatorFee, protocolFee);
        emit TokenSold(msg.sender, netPayout, getCurrentPrice());
    }
    
    function setSaleStatus(bool _isForSale) external onlyCreator {
        isForSale = _isForSale;
    }
    
    function getAvailableTokens() external view returns (uint256) {
        return balanceOf[address(this)];
    }
    
    function totalSupply() external pure returns (uint256) {
        return TOTAL_SUPPLY;
    }
    
    function getContractBalance() external view returns (uint256) {
        return reserveBalance;
    }
    
    function getBondingProgress() external view returns (uint256) {
        return (soldSupply * 100) / TOTAL_SUPPLY;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        return true;
    }
}
