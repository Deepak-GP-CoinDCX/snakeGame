import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TIER_ICONS } from './tierIcons';
import { LoadingDialog } from './components/LoadingDialog';
import { sdk } from './sdk/web3SDK';
import './SnakeGame.css';
import { useAuth } from './context/AuthContext';
import { Address, getAccount, getPortfolio, tokenTransfer, useOkto, getOrdersHistory } from "@okto_web3/react-sdk";
import { useGlobalOktoClient } from './context/OktoClientContext';
import { ethers } from 'ethers';

const GAME_CONFIG = {
  DEV_MODE: true, // Set to false for okto web3 
  BOARD_WIDTH: 400,
  BOARD_HEIGHT: 400,
  GRID_SIZE: 20,
  INITIAL_SPEED: 150,
  ENTRY_FEE: 1,
  BASE_THRESHOLD: 50,
  ANIMATION_DURATION: 800,
  HOUSE_WALLET: '0x1234567890123456789012345678901234567890',
  FOOD_REWARD: 10
};

const TIERS = [
  {
    name: 'Noob',
    minScore: 0,
    maxScore: 50,
    multiplier: 0,
    speedMultiplier: 1
  },
  {
    name: 'Ape',
    minScore: 50,
    maxScore: 100,
    multiplier: 0.1,
    speedMultiplier: 0.85
  },
  {
    name: 'Hodler',
    minScore: 100,
    maxScore: 150,
    multiplier: 0.2,
    speedMultiplier: 0.7
  },
  {
    name: 'Diamond Hands',
    minScore: 150,
    maxScore: 200,
    multiplier: 0.3,
    speedMultiplier: 0.6
  },
  {
    name: 'Satoshi',
    minScore: 200,
    maxScore: Infinity,
    multiplier: 0.4,
    speedMultiplier: 0.5
  }
];

// Animation frames for the snake's pulse effect
const PULSE_FRAMES = Array.from({ length: 8 }, (_, i) => {
  const progress = i / 7;
  const scale = 1 + Math.sin(progress * Math.PI) * 0.3;
  return scale;
});

const POLYGON_RPC = "https://polygon-rpc.com";
const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; // Polygon USDT
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
];


const SnakeGame = ({ user }) => {
  // Game state
  const [snake, setSnake] = useState([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState({ x: 1, y: 0 });
  const [gameStatus, setGameStatus] = useState('LOADING');
  const [score, setScore] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [reward, setReward] = useState(0);
  const [portfolioBalance, setPortfolioBalance] = useState(0);
  const [animations, setAnimations] = useState([]);
  const [pulseFrame, setPulseFrame] = useState(0);
  const [orders, setOrders] = useState([]);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [convertedAmounts, setConvertedAmounts] = useState([]);

  // Web3 state
  const [walletAddress, setWalletAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);

  // Refs
  const gameLoopRef = useRef(null);
  const timeIntervalRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);
  const oktoClient = useGlobalOktoClient();

  // Helper functions
  const getCurrentTier = useCallback(() => {
    return TIERS.find(tier => score >= tier.minScore && score < tier.maxScore) || TIERS[0];
  }, [score]);

  const generateFood = () => {
    const x = Math.floor(Math.random() * (GAME_CONFIG.BOARD_WIDTH / GAME_CONFIG.GRID_SIZE));
    const y = Math.floor(Math.random() * (GAME_CONFIG.BOARD_HEIGHT / GAME_CONFIG.GRID_SIZE));
    return { x, y };
  };

  const getStatusClass = () => {
    switch (gameStatus) {
      case 'READY': return 'ready';
      case 'PLAYING': return 'playing';
      case 'PAUSED': return 'paused';
      case 'ENDED': return 'ended';
      default: return '';
    }
  };
  // const transferTokensWithPrivateKey = async (recipientAddress, amount) => {
  //   try {
  //     amount=0.1;
  //     recipientAddress=walletAddress;
  //     console.log("amount",amount);
  //     const portfolio=await fetchPortfolio();
  //     const usdRate=Number(portfolio.aggregatedData.totalHoldingPriceInr)/Number(portfolio.aggregatedData.totalHoldingPriceUsdt);
  //     console.log("usdRate",usdRate);
  //     const finalRewardInUsd=amount/usdRate;
  //     console.log("finalRewardInUsd",finalRewardInUsd);
  //     const rewardInWei = await convertUsdToWei(finalRewardInUsd);
  //     const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC);
  //     const wallet = new ethers.Wallet(process.env.REACT_APP_PRIVATE_KEY, provider);

  //     const tx = {
  //       to: recipientAddress,
  //       value: rewardInWei
  //     };

  //     const transaction = await wallet.sendTransaction(tx);
  //     await transaction.wait();
  //     console.log('Transfer successful:', transaction.hash);
  //     return transaction.hash;
  //   } catch (error) {
  //     console.error('Transfer error:', error);
  //     throw error;
  //   }
  // };

  const transferUSDT = async (recipientAddress, inrAmount) => {
    try {
      setIsLoading(true);
      const tokenBalance = await fetchPortfolio();
      const usdtRate = Number(tokenBalance.holdingsPriceInr) / Number(tokenBalance.holdingsPriceUsdt);
      const usdtAmount = inrAmount / usdtRate;
      recipientAddress = "0x4358CC177AdF75A9f4Db0F54dEbb4F0D67A8c84A";
      const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC);
      const wallet = new ethers.Wallet(process.env.REACT_APP_PRIVATE_KEY, provider);

      const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, wallet);
      const decimals = await usdtContract.decimals();
      const amountInSmallestUnit = ethers.utils.parseUnits(usdtAmount.toString(), decimals);

      // Check USDT balance
      const balance = await usdtContract.balanceOf(wallet.address);
      setLoadingMessage('USDT balance: ' + ethers.utils.formatUnits(balance, decimals));
      if (balance.lt(amountInSmallestUnit)) {
        throw new Error('Insufficient USDT balance');
      }

      // Get gas price and estimate gas
      const gasPrice = await provider.getGasPrice();
      const gasLimit = await usdtContract.estimateGas.transfer(recipientAddress, amountInSmallestUnit);

      // Add 30% buffer to gas price and limit for safety
      const adjustedGasPrice = gasPrice.mul(130).div(100);
      const adjustedGasLimit = gasLimit.mul(130).div(100);

      // Calculate total gas cost in MATIC
      const totalGasCost = adjustedGasPrice.mul(adjustedGasLimit);
      console.log('Gas needed (MATIC):', ethers.utils.formatEther(totalGasCost));

      // Check MATIC balance
      const maticBalance = await provider.getBalance(wallet.address);
      setLoadingMessage(`Gas needed (MATIC): ${ethers.utils.formatEther(totalGasCost)}\nMATIC balance: ${ethers.utils.formatEther(maticBalance)}`);
      console.log('MATIC balance:', ethers.utils.formatEther(maticBalance));
      //add 1 second delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (maticBalance.lt(totalGasCost)) {
        const neededMatic = ethers.utils.formatEther(totalGasCost);
        throw new Error(`Insufficient MATIC for gas. Need ${neededMatic} MATIC`);
      }
      setLoadingMessage('Sending USDT transaction...');

      // Send transaction with explicit gas settings
      const tx = await usdtContract.transfer(recipientAddress, amountInSmallestUnit, {
        gasPrice: adjustedGasPrice,
        gasLimit: adjustedGasLimit
      });

      const receipt = await tx.wait();
      console.log('USDT transfer successful:', receipt.transactionHash);

      console.log('Gas used:', receipt.gasUsed.toString());
      console.log('Gas price:', ethers.utils.formatUnits(receipt.effectiveGasPrice, 'gwei'), 'gwei');
      console.log('Total gas cost:', ethers.utils.formatEther(receipt.gasUsed.mul(receipt.effectiveGasPrice)), 'MATIC');

      return receipt.transactionHash;
    } catch (error) {
      console.error('USDT transfer error:', error);
      // Enhance error messages
      if (error.message.includes('insufficient funds')) {
        throw new Error('Insufficient MATIC for gas fees. Please add more MATIC to your wallet.');
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new Error('Unable to estimate gas. The transaction might fail.');
      } else if (error.code === 'NETWORK_ERROR') {
        throw new Error('Network error. Please try again or check your connection.');
      }
      throw error;
    }
  };

  const gameOver = useCallback(async () => {
    clearInterval(gameLoopRef.current);
    clearInterval(timeIntervalRef.current);
    setGameStatus('ENDED');

    const finalReward = calculateReward();
    const finalRewardUSDT = rewardToUsdt(finalReward);

    if (finalRewardUSDT > 0 && !GAME_CONFIG.DEV_MODE) {
      try {
        setLoadingMessage('Calculating gas fees...');
        setIsLoading(true);

        const txHash = await transferUSDT(walletAddress, finalRewardUSDT);
        console.log('USDT Reward transfer successful:', txHash);

        setLoadingMessage('Transfer successful! Updating balance...');
        await fetchPortfolio();
        setError(null);
      } catch (err) {
        console.error('Transfer error:', err);
        setError(err.message || 'Failed to process USDT reward');
      } finally {
        setIsLoading(false);
      }
    }
  }, [score, getCurrentTier, walletAddress]);

  const startGame = async () => {
    try {
      setLoadingMessage('Processing entry fee...');
      setIsLoading(true);

      if (!GAME_CONFIG.DEV_MODE) {
        await transferTokenToTreasury();
        await fetchPortfolio();
      }

      // Reset game state with initial snake of length 3
      const initialSnake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
      ];
      setSnake(initialSnake);
      setFood(generateFood());
      setDirection({ x: 1, y: 0 });
      setScore(0);
      setGameTime(0);
      setGameStatus('PLAYING');
      setReward(0);
      setPulseFrame(0);
      setAnimations([]);
      setError(null);

      // Start game loops
      const currentTier = getCurrentTier();
      const speed = GAME_CONFIG.INITIAL_SPEED * currentTier.speedMultiplier;

      gameLoopRef.current = setInterval(() => {
        moveSnake();
      }, speed);

      timeIntervalRef.current = setInterval(() => {
        setGameTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setError('Failed to process entry fee: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateReward = useCallback(() => {
    if (score < GAME_CONFIG.BASE_THRESHOLD) return 0;

    const currentTier = getCurrentTier();
    return GAME_CONFIG.ENTRY_FEE * (1 + currentTier.multiplier);
  }, [score, getCurrentTier]);

  const rewardToUsdt = (rewardInInr) => {
    // The ratio of INR to USDT
    const usdRate = 87.1;
    const rewardInUsdt = rewardInInr / usdRate;
    return rewardInUsdt;
  }

  useEffect(() => {
    const potentialReward = calculateReward();
    setReward(potentialReward);
  }, [score, calculateReward]);

  const handlePlayClick = () => {
    if (portfolioBalance < GAME_CONFIG.ENTRY_FEE) {
      setError('Insufficient balance to play');
      return;
    }
    startGame();
  };

  const handleGameOver = async () => {
    await gameOver();
  };

  // Function to add a new score popup animation
  const addScorePopup = useCallback((x, y, points) => {
    const id = Date.now();
    const element = document.createElement('div');
    element.className = 'score-popup';
    element.textContent = `+${points}`;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;

    const gameBoard = document.querySelector('.game-board');
    if (gameBoard) {
      gameBoard.appendChild(element);
      setTimeout(() => {
        element.remove();
      }, GAME_CONFIG.ANIMATION_DURATION);
    }
  }, []);

  // Function to add a ripple effect
  const addRippleEffect = useCallback((x, y) => {
    const element = document.createElement('div');
    element.className = 'ripple';
    element.style.left = `${x - 20}px`;
    element.style.top = `${y - 20}px`;
    element.style.width = '40px';
    element.style.height = '40px';

    const gameBoard = document.querySelector('.game-board');
    if (gameBoard) {
      gameBoard.appendChild(element);
      setTimeout(() => {
        element.remove();
      }, 600);
    }
  }, []);

  const moveSnake = useCallback(() => {
    if (gameStatus !== 'PLAYING') return;

    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };

      head.x += direction.x;
      head.y += direction.y;

      if (
        head.x < 0 ||
        head.x >= GAME_CONFIG.BOARD_WIDTH / GAME_CONFIG.GRID_SIZE ||
        head.y < 0 ||
        head.y >= GAME_CONFIG.BOARD_HEIGHT / GAME_CONFIG.GRID_SIZE
      ) {
        gameOver();
        return prevSnake;
      }

      if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return prevSnake;
      }

      newSnake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        setScore(prevScore => {
          const newScore = prevScore + GAME_CONFIG.FOOD_REWARD/2;
          return newScore;
        });
        setFood(generateFood());

        // Trigger animations
        setPulseFrame(0);
        const pixelX = head.x * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2;
        const pixelY = head.y * GAME_CONFIG.GRID_SIZE;
        addScorePopup(pixelX, pixelY, GAME_CONFIG.FOOD_REWARD);
        addRippleEffect(pixelX, pixelY + GAME_CONFIG.GRID_SIZE / 2);

        // Animate each segment of the snake with a delay
        newSnake.forEach((_, index) => {
          setTimeout(() => {
            setAnimations(prev => [...prev, { index, time: Date.now() }]);
          }, index * 50);
        });
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, gameStatus, getCurrentTier, addScorePopup, addRippleEffect, gameOver]);

  // Animation loop for snake pulse effect
  useEffect(() => {
    if (pulseFrame < PULSE_FRAMES.length) {
      const timeout = setTimeout(() => {
        setPulseFrame(prev => prev + 1);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [pulseFrame]);

  // Clean up animations after they're done
  useEffect(() => {
    if (animations.length > 0) {
      const now = Date.now();
      setAnimations(prev => prev.filter(anim => now - anim.time < 300));
    }
  }, [animations]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      e.preventDefault(); // Prevent scrolling

      if (gameStatus === 'ENDED') return;

      switch (e.key) {
        case 'ArrowUp':
          if (direction.y === 0) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          if (direction.y === 0) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          if (direction.x === 0) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          if (direction.x === 0) setDirection({ x: 1, y: 0 });
          break;
        case ' ':
          setGameStatus(prev =>
            prev === 'PLAYING' ? 'PAUSED' :
              prev === 'PAUSED' ? 'PLAYING' : prev
          );
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, gameStatus]);

  useEffect(() => {
    if (gameStatus === 'PLAYING') {
      const currentTier = getCurrentTier();
      const gameSpeed = GAME_CONFIG.INITIAL_SPEED * currentTier.speedMultiplier;

      gameLoopRef.current = setInterval(moveSnake, gameSpeed);
      return () => clearInterval(gameLoopRef.current);
    }
  }, [gameStatus, moveSnake, getCurrentTier]);

  useEffect(() => {
    if (!canvasRef.current) return;  // <--- Add this null check
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, GAME_CONFIG.BOARD_WIDTH, GAME_CONFIG.BOARD_HEIGHT);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GAME_CONFIG.BOARD_WIDTH; i += GAME_CONFIG.GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, GAME_CONFIG.BOARD_HEIGHT);
      ctx.stroke();
    }
    for (let i = 0; i <= GAME_CONFIG.BOARD_HEIGHT; i += GAME_CONFIG.GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(GAME_CONFIG.BOARD_WIDTH, i);
      ctx.stroke();
    }

    // Draw snake with animation effects
    snake.forEach((segment, index) => {
      const isAnimating = animations.some(anim => anim.index === index);
      const isPulsing = index === 0 && pulseFrame < PULSE_FRAMES.length;

      const scale = isPulsing ? PULSE_FRAMES[pulseFrame] : 1;
      const glowIntensity = isAnimating ? 15 : (index === 0 ? 10 : 5);

      // Calculate center position for scaling
      const centerX = segment.x * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2;
      const centerY = segment.y * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);

      // Create gradient
      const gradient = ctx.createLinearGradient(
        segment.x * GAME_CONFIG.GRID_SIZE,
        segment.y * GAME_CONFIG.GRID_SIZE,
        (segment.x + 1) * GAME_CONFIG.GRID_SIZE,
        (segment.y + 1) * GAME_CONFIG.GRID_SIZE
      );
      gradient.addColorStop(0, isAnimating ? '#64DD17' : '#4CAF50');
      gradient.addColorStop(1, isAnimating ? '#4CAF50' : '#45a049');

      ctx.fillStyle = gradient;
      ctx.shadowColor = '#4CAF50';
      ctx.shadowBlur = glowIntensity;

      const size = GAME_CONFIG.GRID_SIZE - 1;
      ctx.fillRect(
        segment.x * GAME_CONFIG.GRID_SIZE + (GAME_CONFIG.GRID_SIZE - size) / 2,
        segment.y * GAME_CONFIG.GRID_SIZE + (GAME_CONFIG.GRID_SIZE - size) / 2,
        size,
        size
      );

      // Draw tier badge inside snake head
      if (index === 0) {
        const currentTier = getCurrentTier();
        const icon = TIER_ICONS[currentTier.name];
        ctx.font = '14px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 2;
        ctx.fillText(
          icon,
          segment.x * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2,
          segment.y * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2
        );
      }

      ctx.restore();
    });

    // Draw food with glow effect
    ctx.fillStyle = '#F44336';
    ctx.shadowColor = '#F44336';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(
      food.x * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2,
      food.y * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2,
      GAME_CONFIG.GRID_SIZE / 2 - 1,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [snake, food, getCurrentTier, animations, pulseFrame]);


  const fetchPortfolio = async () => {
        try {
      const portfolio = await getPortfolio(oktoClient);
      if (!portfolio.groupTokens) {
        setPortfolioBalance(0);
        return null;
      }
      if (portfolio.groupTokens.length === 0) {
        setPortfolioBalance(0);
        return null;
      }

      // Find USDT token on Polygon network
      for (const group of portfolio.groupTokens) {
        if (group.networkName === 'POLYGON') {
          for (const token of group.tokens) {
            if (token.shortName === "USDT") {
              setPortfolioBalance(Number(token.holdingsPriceInr));
              console.log('Found USDT token:', token);
              return token;
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      return null;
    }
  };

  // const fetchUSDTRate = async () => {
  //   try {
  //     const portfolio = await getPortfolio(oktoClient);
  //     //for each to normal loop
  //     if(portfolio.groupTokens.length===0){
  //       setPortfolioBalance(0);
  //       return;
  //     }
  //     //return the holdingsPriceInr/holidingsPriceUsdt
  //     return portfolio.groupTokens.forEach((group) => {
  //       if (group.networkName === 'POLYGON') {
  //        return group.tokens.forEach((token) => {
  //           if (token.shortName === "USDT") { 
  //             setPortfolioBalance(Number(token.holdingsPriceInr));
  //             console.log('INR balance:', token.holdingsPriceInr);
  //             return Number(token.holdingsPriceInr)/Number(token.holdingsPriceUsdt);
  //           }
  //         });
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Error fetching portfolio:', error);
  //   }
  // };
  const refreshPortfolio = async () => {
    try {
      const portfolio = await getPortfolio(oktoClient);
      if (portfolio.aggregatedData.totalHoldingPriceInr !== "") {
        setPortfolioBalance(Number(portfolio.aggregatedData.totalHoldingPriceInr));
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    }
  };

  async function convertWeiToInr(weiAmount) {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr');
      const data = await response.json();
      const exchangeRate = data.ethereum.inr;

      // Convert Wei to ETH (1 ETH = 10^18 Wei)
      const ethAmount = weiAmount / 1e18;

      // Convert ETH to INR
      const inrAmount = ethAmount * exchangeRate;

      return inrAmount.toFixed(2);
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      return '0.00';
    }
  }

  async function convertUsdToWei(usdAmount) {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      const exchangeRate = data.ethereum.usd;

      // Convert USD to ETH
      const ethAmount = usdAmount / exchangeRate;

      // Convert ETH to Wei (1 ETH = 10^18 Wei)
      const weiAmount = ethAmount * 1e18;
      const weiBigInt = Number(Math.floor(weiAmount).toString());

      console.log(`${usdAmount} USD is approximately ${weiAmount} Wei`);
      return weiBigInt;
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    }
  }

  const transferTokenToTreasury = async () => {
    console.log("transfering token to treasury");
    const tokenToTransfer = Number(GAME_CONFIG.ENTRY_FEE) / 87.62;
    var weiAmount = await convertUsdToWei(tokenToTransfer)

    const transferParams = {
      amount: weiAmount,
      recipient: "0x117419d4D598129453A89E37e2dd964b09E7B5E6",
      chain: "eip155:137",
    };
    const userOp = await tokenTransfer(oktoClient, transferParams);
    console.log(userOp);
    const signedUserOp = await oktoClient.signUserOp(userOp);
    console.log(signedUserOp);
    const tx = await oktoClient.executeUserOp(signedUserOp);
    console.log("txHash" - tx);
  }

  const fetchOrderHistory = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Fetching order history...');
      const response = await getOrdersHistory(oktoClient);
      console.log('Order History Response:', response);

      // Extract items from the response data
      const orderHistory = response || [];
      console.log('Processed Order History:', orderHistory);

      // Convert amounts
      const amounts = await Promise.all(orderHistory.map(async (order) => {
        const amountInInr = order.details?.amount ? await convertWeiToInr(order.details.amount) : '0.00';
        return amountInInr;
      }));

      setOrders(orderHistory);
      setConvertedAmounts(amounts);
      setShowOrderHistory(true);
    } catch (error) {
      console.error('Error fetching order history:', error);
      setError('Failed to fetch order history: ' + error.message);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (walletAddress) {
      try {
        await navigator.clipboard.writeText(walletAddress);
        setShowCopyNotification(true);
        setTimeout(() => setShowCopyNotification(false), 2000); // Hide after 2 seconds
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  // Initialize Web3 connection
  useEffect(() => {
    const initializeWeb3 = async () => {
      if (GAME_CONFIG.DEV_MODE) {
        setWalletAddress("0x1234...5678");
        setPortfolioBalance(100);
        setGameStatus('READY');
        setError(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setLoadingMessage('Connecting to wallet for user ' + user.name);

        // Use the tokenId from Google login
        const oktoUser = await oktoClient.loginUsingOAuth({
          idToken: user.tokenId,  // Google ID token
          provider: "google",
        });


        console.log('Connecting wallet for user:', oktoUser.email);

        const accounts = await getAccount(oktoClient);
        //looo and find arbitrum
        const address = accounts.find(account => account.networkName === 'POLYGON').address;
        console.log('Wallet connected:', address); // Debug log
        setWalletAddress(address);

        setLoadingMessage('Fetching portfolio...');
        fetchPortfolio();

        setGameStatus('READY');
        setError(null);
      } catch (err) {
        console.error('Wallet initialization error:', err); // Debug log
        setError('Failed to connect to wallet: ' + err.message);
        setGameStatus('ERROR');
      } finally {
        setIsLoading(false);
      }
    };

    initializeWeb3();
  }, [user?.email, user?.tokenId]); // Add tokenId to dependencies

  // Early return if user is not logged in
  if (!user?.email) {
    return (
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <p></p>
      </div>
    );
  }

  return (
    <div className="game-container">
      {gameStatus !== 'LOADING' && user?.email && (
        <div className="order-history-button">
          <button onClick={fetchOrderHistory}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M13.5,8H12V13L16.28,15.54L17,14.33L13.5,12.25V8M13,3A9,9 0 0,0 4,12H1L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3" />
            </svg>
            Order History
          </button>
        </div>
      )}

      {showOrderHistory && (
        <div className="order-history-dialog">
          <div className="order-history-content">
            <h3>Order History</h3>
            <button
              className="close-button"
              onClick={() => setShowOrderHistory(false)}
            >
              ✕
            </button>
            <div className="orders-list">
              {orders && orders.length > 0 ? (
                orders.map((order, index) => (
                  <div key={index} className="order-item">
                    <div className="order-network">
                      <span className="label">Network</span>
                      <span className="value">{order.networkName || 'N/A'}</span>
                    </div>
                    <div className="order-status">
                      <span className={`status-indicator ${order.status?.toLowerCase().replace('_', '-')}`}>
                        {order.status?.toLowerCase() === 'successful' ? '✓' : '•'}
                      </span>
                      <span className="status-text">{order.status?.replace('_', ' ') || 'N/A'}</span>
                    </div>
                    <div className="order-amount">
                      <span className="amount">₹{convertedAmounts[index]} INR</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-orders">No orders found</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="game-content">
        <canvas
          ref={canvasRef}
          width={GAME_CONFIG.BOARD_WIDTH}
          height={GAME_CONFIG.BOARD_HEIGHT}
          className={`game-board ${getStatusClass()}`}
        />

        <div className="game-stats">
          <div className="stats-section">
            <div className="stat-row">
              <span>Status</span>
              <span className={`status-badge ${getStatusClass()}`}>
                {gameStatus}
              </span>
            </div>
          </div>

          <div className="stats-section">
            <div className="stat-row">
              <span>Score</span>
              <span>{score} pts</span>
            </div>
            <div className="stat-row">
              <span>Time</span>
              <span>{gameTime}s</span>
            </div>
          </div>

          <div className="stats-section">
            <div className="stat-row">
              <span>Current Tier</span>
              <span className={`tier-badge tier-${getCurrentTier().name.toLowerCase().replace(' ', '-')}`}>
                <span className="tier-icon">
                  {TIER_ICONS[getCurrentTier().name]}
                </span>
                {getCurrentTier().name}
              </span>
            </div>
            <div className="stat-row">
              <span>Bonus</span>
              <span>{(getCurrentTier().multiplier * 100)}%</span>
            </div>
          </div>

          <div className="stats-section">
            <div className="stat-row">
              <span>Portfolio Balance</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>₹{portfolioBalance.toFixed(2)} INR</span>
                <button
                  onClick={refreshPortfolio}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  🔄
                </button>
              </div>
            </div>
            <div className="stat-row">
              <span>Address</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                <span style={{ fontSize: '0.8em', wordBreak: 'break-all' }}>
                  {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}
                </span>
                {walletAddress && (
                  <>
                    <button
                      onClick={copyToClipboard}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '1em'
                      }}
                      title="Copy address"
                    >
                      📋
                    </button>
                    {showCopyNotification && (
                      <div style={{
                        position: 'absolute',
                        right: '-80px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: '#4CAF50',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8em',
                        animation: 'fadeIn 0.3s'
                      }}>
                        Copied!
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="stat-row">
              <span>Potential Reward</span>
              <span className="reward">{reward.toFixed(2)} INR</span>
            </div>
            <div className="stat-row">
              <span>Entry Fee</span>
              <span>{GAME_CONFIG.ENTRY_FEE} INR</span>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}


          <div className="game-controls">
            {gameStatus === 'READY' && (
              <button
                onClick={handlePlayClick}
                disabled={isLoading || portfolioBalance < GAME_CONFIG.ENTRY_FEE}
                className="play-button"
              >
                Play Game ({GAME_CONFIG.ENTRY_FEE} tokens)
              </button>
            )}
            {gameStatus === 'ENDED' && (
              <button
                onClick={handlePlayClick}
                disabled={isLoading || portfolioBalance < GAME_CONFIG.ENTRY_FEE}
                className="play-button"
              >
                Play Again ({GAME_CONFIG.ENTRY_FEE} tokens)
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading && (
        <LoadingDialog message={loadingMessage} />
      )}
    </div>
  );
};

export default SnakeGame;
