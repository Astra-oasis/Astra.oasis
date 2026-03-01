// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract BondingCurve {
    // Token addresses
    address public tokenX;      // Token gốc (ví dụ: custom token)
    address public tokenTest;   // Token thanh toán (ví dụ: TEST)
    
    // Pool reserves - công thức: reserveX * reserveTest = k (constant)
    uint256 public reserveX;
    uint256 public reserveTest;
    
    // Fee trong basis points (100 = 1%)
    uint256 public feePercentage = 25; // 0.25% fee
    
    uint256 public constant DECIMALS = 18;
    uint256 public constant MIN_LIQUIDITY = 1000;
    
    address public owner;
    
    event LiquidityAdded(address indexed provider, uint256 amountX, uint256 amountTest);
    event LiquidityRemoved(address indexed provider, uint256 amountX, uint256 amountTest);
    event TokenXBought(address indexed buyer, uint256 amountXOut, uint256 amountTestIn);
    event TokenTestBought(address indexed buyer, uint256 amountTestOut, uint256 amountXIn);
    event FeeUpdated(uint256 newFee);
    event Swap(address indexed user, uint256 amountIn, uint256 amountOut, bool isXForTest);
    
    constructor(address _tokenX, address _tokenTest) {
        require(_tokenX != address(0) && _tokenTest != address(0), "Invalid token addresses");
        require(_tokenX != _tokenTest, "Tokens must be different");
        
        tokenX = _tokenX;
        tokenTest = _tokenTest;
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    // Công thức tính output dựa trên constant product formula
    // x * y = k (trước = sau)
    // Nếu input là amountIn token X, output token Test là:
    // outputAmount = (reserveTest * amountIn) / (reserveX + amountIn)
    function getOutputAmount(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        require(amountIn > 0, "Amount in must be greater than 0");
        require(reserveIn > 0 && reserveOut > 0, "Invalid reserves");
        
        uint256 amountInWithFee = amountIn * 9975 / 10000; // 0.25% fee
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn + amountInWithFee;
        
        return numerator / denominator;
    }
    
    // Thêm thanh khoản ban đầu vào pool
    function addLiquidity(
        uint256 amountXDesired,
        uint256 amountTestDesired
    ) external returns (uint256 amountX, uint256 amountTest) {
        require(amountXDesired > 0 && amountTestDesired > 0, "Amounts must be greater than 0");
        
        // Pool trống - accept tùy ý
        if (reserveX == 0 && reserveTest == 0) {
            amountX = amountXDesired;
            amountTest = amountTestDesired;
        } else {
            // Pool có liquidity - phải duy trì tỷ lệ
            uint256 optimalAmountTest = (amountXDesired * reserveTest) / reserveX;
            
            if (optimalAmountTest <= amountTestDesired) {
                amountX = amountXDesired;
                amountTest = optimalAmountTest;
            } else {
                uint256 optimalAmountX = (amountTestDesired * reserveX) / reserveTest;
                amountX = optimalAmountX;
                amountTest = amountTestDesired;
            }
        }
        
        require(amountX > 0 && amountTest > 0, "Insufficient liquidity amounts");
        
        // Transfer tokens từ provider vào contract
        require(
            IERC20(tokenX).transferFrom(msg.sender, address(this), amountX),
            "TokenX transfer failed"
        );
        require(
            IERC20(tokenTest).transferFrom(msg.sender, address(this), amountTest),
            "TokenTest transfer failed"
        );
        
        // Cập nhật reserves
        reserveX += amountX;
        reserveTest += amountTest;
        
        emit LiquidityAdded(msg.sender, amountX, amountTest);
        
        return (amountX, amountTest);
    }
    
    // Rút thanh khoản từ pool
    function removeLiquidity(
        uint256 amountX,
        uint256 amountTest
    ) external onlyOwner {
        require(amountX > 0 && amountTest > 0, "Amounts must be greater than 0");
        require(reserveX >= amountX && reserveTest >= amountTest, "Insufficient liquidity");
        
        reserveX -= amountX;
        reserveTest -= amountTest;
        
        require(
            IERC20(tokenX).transfer(msg.sender, amountX),
            "TokenX transfer failed"
        );
        require(
            IERC20(tokenTest).transfer(msg.sender, amountTest),
            "TokenTest transfer failed"
        );
        
        emit LiquidityRemoved(msg.sender, amountX, amountTest);
    }
    
    // Swap Token X lấy Token Test
    // Người dùng gửi Token X, nhận lại Token Test
    function swapXForTest(uint256 amountXIn, uint256 minAmountTestOut) external returns (uint256 amountTestOut) {
        require(amountXIn > 0, "Amount in must be greater than 0");
        require(reserveX > 0 && reserveTest > 0, "Pool has no liquidity");
        
        // Tính toán số lượng Token Test nhận được
        amountTestOut = getOutputAmount(amountXIn, reserveX, reserveTest);
        require(amountTestOut > 0, "Insufficient output amount");
        require(amountTestOut >= minAmountTestOut, "Slippage tolerance exceeded");
        require(amountTestOut <= reserveTest, "Insufficient liquidity");
        
        // Transfer Token X từ user vào contract
        require(
            IERC20(tokenX).transferFrom(msg.sender, address(this), amountXIn),
            "TokenX transfer failed"
        );
        
        // Cập nhật reserves
        reserveX += amountXIn;
        reserveTest -= amountTestOut;
        
        // Transfer Token Test từ contract đến user
        require(
            IERC20(tokenTest).transfer(msg.sender, amountTestOut),
            "TokenTest transfer failed"
        );
        
        emit TokenXBought(msg.sender, amountXIn, amountTestOut);
        emit Swap(msg.sender, amountXIn, amountTestOut, true);
        
        return amountTestOut;
    }
    
    // Swap Token Test lấy Token X
    // Người dùng gửi Token Test, nhận lại Token X
    function swapTestForX(uint256 amountTestIn, uint256 minAmountXOut) external returns (uint256 amountXOut) {
        require(amountTestIn > 0, "Amount in must be greater than 0");
        require(reserveX > 0 && reserveTest > 0, "Pool has no liquidity");
        
        // Tính toán số lượng Token X nhận được
        amountXOut = getOutputAmount(amountTestIn, reserveTest, reserveX);
        require(amountXOut > 0, "Insufficient output amount");
        require(amountXOut >= minAmountXOut, "Slippage tolerance exceeded");
        require(amountXOut <= reserveX, "Insufficient liquidity");
        
        // Transfer Token Test từ user vào contract
        require(
            IERC20(tokenTest).transferFrom(msg.sender, address(this), amountTestIn),
            "TokenTest transfer failed"
        );
        
        // Cập nhật reserves
        reserveTest += amountTestIn;
        reserveX -= amountXOut;
        
        // Transfer Token X từ contract đến user
        require(
            IERC20(tokenX).transfer(msg.sender, amountXOut),
            "TokenX transfer failed"
        );
        
        emit TokenTestBought(msg.sender, amountXOut, amountTestIn);
        emit Swap(msg.sender, amountTestIn, amountXOut, false);
        
        return amountXOut;
    }
    
    // Xem giá hiện tại của Token X tính theo Token Test
    // Công thức: giá = reserveTest / reserveX
    function getPriceX() external view returns (uint256) {
        require(reserveX > 0, "Invalid reserve");
        return (reserveTest * 10**DECIMALS) / reserveX;
    }
    
    // Xem giá hiện tại của Token Test tính theo Token X
    function getPriceTest() external view returns (uint256) {
        require(reserveTest > 0, "Invalid reserve");
        return (reserveX * 10**DECIMALS) / reserveTest;
    }
    
    // Xem tỷ lệ trong pool
    function getReserves() external view returns (uint256, uint256) {
        return (reserveX, reserveTest);
    }
    
    // Xem k (constant product)
    function getConstantProduct() external view returns (uint256) {
        return reserveX * reserveTest;
    }
    
    // Cập nhật phí (chỉ owner)
    function setFeePercentage(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        feePercentage = newFee;
        emit FeeUpdated(newFee);
    }
}
