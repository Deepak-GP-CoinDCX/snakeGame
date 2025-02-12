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
  DEV_MODE: false, // Set to false for okto web3 
  BOARD_WIDTH: 400,
  BOARD_HEIGHT: 400,
  GRID_SIZE: 20,
  INITIAL_SPEED: 150,
  ENTRY_FEE: 2,
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
    name: 'Moon Lander', // Changed from Diamond Hands
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
  const [selectedFilter, setSelectedFilter] = useState('all');

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

  const transferMatic = async (recipientAddress, inrAmount) => {
    try {
      setIsLoading(true);
      const tokenBalance = await fetchPortfolio();
      const maticRateInInr = Number(tokenBalance.holdingsPriceInr) / Number(tokenBalance.balance);
      const maticAmount = inrAmount / maticRateInInr;

      const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC);
      const wallet = new ethers.Wallet(process.env.REACT_APP_PRIVATE_KEY, provider);

      // Convert MATIC to Wei using ethers.utils directly
      const amountInWei = ethers.utils.parseEther(maticAmount.toFixed(18));

      // Get gas price
      const gasPrice = await provider.getGasPrice();
      const adjustedGasPrice = gasPrice.mul(130).div(100); // Add 30% buffer

      // Standard gas limit for native transfers
      const gasLimit = ethers.BigNumber.from(21000);

      // Calculate total gas cost using BigNumber operations
      const totalGasCost = adjustedGasPrice.mul(gasLimit);

      // Get current balance
      const balance = await provider.getBalance(wallet.address);

      // Calculate total needed using BigNumber operations
      const totalNeeded = amountInWei.add(totalGasCost);

      setLoadingMessage(
        `Checking balance...\n` +
        `Transfer Amount: ${ethers.utils.formatEther(amountInWei)} MATIC\n` +
        `Gas Cost: ${ethers.utils.formatEther(totalGasCost)} MATIC\n` +
        `Total Needed: ${ethers.utils.formatEther(totalNeeded)} MATIC\n` +
        `Balance: ${ethers.utils.formatEther(balance)} MATIC`
      );



      if (balance.lt(totalNeeded)) {
        throw new Error(`Insufficient MATIC balance. Need ${ethers.utils.formatEther(totalNeeded)} MATIC`);
      }

      setLoadingMessage('Sending MATIC transaction...');

      // Send transaction
      const tx = await wallet.sendTransaction({
        to: recipientAddress,
        value: amountInWei,
        gasPrice: adjustedGasPrice,
        gasLimit: gasLimit
      });

      const receipt = await tx.wait();
      console.log('Transaction successful:', receipt);
      setLoadingMessage('Transfer successful!');

      return receipt.transactionHash;
    } catch (error) {
      console.error('MATIC transfer error:', error);
      if (error.message.includes('insufficient funds')) {
        throw new Error('Insufficient MATIC balance for transfer and gas fees');
      } else if (error.code === 'NETWORK_ERROR') {
        throw new Error('Network error. Please try again or check your connection.');
      } else if (error.reason === 'overflow') {
        throw new Error('Transfer amount is too large');
      }
      // throw error;
    }
  };

  const gameOver = useCallback(async () => {
    clearInterval(gameLoopRef.current);
    clearInterval(timeIntervalRef.current);
    setGameStatus('ENDED');

    const finalReward = calculateReward(); // Calculate final reward in INR

    if (finalReward > 0 && !GAME_CONFIG.DEV_MODE) {
      try {
        setLoadingMessage('Processing reward transfer of ' + finalReward + ' INR...');
        setIsLoading(true);

        const txHash = await transferMatic(walletAddress, finalReward);
        console.log('MATIC Reward transfer successful:', txHash);

        setLoadingMessage('Transfer successful! Updating balance...');
        //wait for 10 seconds
        await new Promise(resolve => setTimeout(resolve, 10000));
        await fetchPortfolio();
        setError(null);
      } catch (err) {
        console.error('Transfer error:', err);
        setError(err.message || 'Failed to process MATIC reward');
      } finally {
        setIsLoading(false);
      }
    }
  }, [score, getCurrentTier, walletAddress]);

  const startGame = async () => {
    try {
      setLoadingMessage('Processing entry fee of ' + GAME_CONFIG.ENTRY_FEE + ' INR');
      setIsLoading(true);
      // Update portfolio balance
      const token = await fetchPortfolio();

      // Transfer entry fee to house wallet
      if (!GAME_CONFIG.DEV_MODE) {
        const status = await transferTokenToTreasury(token);
        if (status === "FAILED") {
          setError('Failed to process entry fee');
          return;
        }
        // Update portfolio balance
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
    const element = document.createElement('div');
    element.className = 'score-popup';
    element.textContent = points;

    // Position relative to game board
    const gameBoard = document.querySelector('.game-board');
    if (gameBoard) {
      const boardRect = gameBoard.getBoundingClientRect();
      element.style.left = `${x - 10}px`; // Offset to center
      element.style.top = `${y - 20}px`; // Start a bit above the food

      // Add to game container instead of game board for proper z-index handling
      document.querySelector('.game-container').appendChild(element);

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

      // Check for collisions
      if (
        head.x < 0 ||
        head.x >= GAME_CONFIG.BOARD_WIDTH / GAME_CONFIG.GRID_SIZE ||
        head.y < 0 ||
        head.y >= GAME_CONFIG.BOARD_HEIGHT / GAME_CONFIG.GRID_SIZE ||
        newSnake.some(segment => segment.x === head.x && segment.y === head.y)
      ) {
        gameOver();
        return prevSnake;
      }

      newSnake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        setScore(prevScore => prevScore + GAME_CONFIG.FOOD_REWARD / 2);
        setFood(generateFood());

        // Calculate position for score popup relative to canvas
        const pixelX = head.x * GAME_CONFIG.GRID_SIZE + canvasRef.current.offsetLeft;
        const pixelY = head.y * GAME_CONFIG.GRID_SIZE + canvasRef.current.offsetTop;

        addScorePopup(pixelX, pixelY, '+10');

        // Add ripple effect
        addRippleEffect(pixelX, pixelY + GAME_CONFIG.GRID_SIZE / 2);

        // Animate snake segments
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
        if (group.shortName === 'POL') {
          for (const token of group.tokens) {
            if (token.shortName === "POL") {
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
  // const refreshPortfolio = async () => {
  //   try {
  //     const portfolio = await getPortfolio(oktoClient);
  //     if (portfolio.aggregatedData.totalHoldingPriceInr !== "") {
  //       setPortfolioBalance(Number(portfolio.aggregatedData.totalHoldingPriceInr));
  //     }
  //   } catch (error) {
  //     console.error('Error fetching portfolio:', error);
  //   }
  // };

  async function convertWeiToMaticInInr(weiAmount, token) {
    try {
      // Get MATIC/INR rate from token data
      const maticToInrRate = Number(token.holdingsPriceInr) / Number(token.balance);

      // Convert Wei to MATIC (1 MATIC = 10^18 Wei)
      const maticAmount = ethers.utils.formatEther(weiAmount.toString());

      // Convert MATIC to INR using the rate
      const inrAmount = Number(maticAmount) * maticToInrRate;

      console.log(`Converting ${weiAmount} Wei`);
      console.log(`= ${maticAmount} MATIC`);
      console.log(`= ₹${inrAmount.toFixed(2)} INR (Rate: ₹${maticToInrRate.toFixed(2)}/MATIC)`);

      return inrAmount.toFixed(2);
    } catch (error) {
      console.error('Error converting Wei to INR:', error);
      return '0.00';
    }
  }

  async function convertMaticToWei(maticAmount) {
    try {
      // Use ethers.utils.parseEther which returns a BigNumber
      return ethers.utils.parseEther(maticAmount.toString());
    } catch (error) {
      console.error('Error converting MATIC to Wei:', error);
      throw error;
    }
  }

  async function transferTokenToTreasury(token) {
    console.log("transfering token to treasury");
    const maticRateInInr = Number(token.holdingsPriceInr) / Number(token.balance);
    console.log("maticRateInInr in inr", maticRateInInr);
    const maticAmount = GAME_CONFIG.ENTRY_FEE / maticRateInInr;
    console.log("tokenToTransfer in matic", maticAmount);
    const weiAmount = await convertMaticToWei(maticAmount);

    const transferParams = {
      amount: Number(weiAmount), // Convert BigNumber to string
      recipient: "0x117419d4D598129453A89E37e2dd964b09E7B5E6",
      chain: "eip155:137",
      token: ""
    };
    const userOp = await tokenTransfer(oktoClient, transferParams);
    console.log(userOp);
    const signedUserOp = await oktoClient.signUserOp(userOp);
    console.log(signedUserOp);
    const tx = await oktoClient.executeUserOp(signedUserOp);
    console.log("txHash", tx);
    //keep looping until the tx is confirmed
    var isTxnConfirmed = false;
    var status = "";
    return "SUCCESSFUL";
    while (!isTxnConfirmed) {
      const orderHistory = await getOrdersHistory(oktoClient);
      //loop orderHistory and search for the order
      for (let i = 0; i < orderHistory.length; i++) {
        if (orderHistory[i].intentId === tx.jobId) {
          console.log("order found", orderHistory[i]);
          if (orderHistory[i].status === "SUCCESSFUL") {
            isTxnConfirmed = true;
            status = "SUCCESSFUL";
            break;
          }
          if (orderHistory[i].status === "FAILED") {
            isTxnConfirmed = true;
            status = "FAILED";
            break;
          }
        }

      }
      // add delay of 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    return status;


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
      const token = await fetchPortfolio();
      // Convert amounts
      const amounts = await Promise.all(orderHistory.map(async (order) => {
        const amountInInr = order.details?.amount ? await convertWeiToMaticInInr(order.details.amount, token) : '0.00';
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

  const getOrderStatusClass = (status) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'successful') return 'successful';
    if (statusLower === 'initiated' || statusLower === 'in_progress') return 'in-progress';
    if (statusLower === 'failed' || statusLower === 'bundler_discarded') return 'failed';
    return '';
  };

  const getStatusIcon = (status) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'successful') return '✓';
    if (statusLower === 'failed' || statusLower === 'bundler_discarded') return '✕';
    return '•';
  };

  const getDisplayStatus = (status) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'initiated' || statusLower === 'in_progress') return 'In Progress';
    if (statusLower === 'bundler_discarded' || statusLower === 'failed') return 'Failed';
    if (statusLower === 'successful') return 'Successful';
    return status || 'N/A';
  };

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
          <h3>Order History</h3>
          <button
            className="close-button"
            onClick={() => setShowOrderHistory(false)}
          >
            ✕
          </button>
          <div className="filter-section">
            <button
              className={`filter-button ${selectedFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-button ${selectedFilter === 'in_progress' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('in_progress')}
            >
              In Progress
            </button>
            <button
              className={`filter-button ${selectedFilter === 'successful' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('successful')}
            >
              Successful
            </button>
            <button
              className={`filter-button ${selectedFilter === 'failed' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('failed')}
            >
              Failed
            </button>
          </div>
          <div className="orders-list">
            {(() => {
              const filteredOrders = orders.filter(order => {
                if (selectedFilter === 'all') return true;
                const status = order.status?.toLowerCase();
                switch (selectedFilter) {
                  case 'in_progress':
                    return status === 'initiated' || status === 'in_progress';
                  case 'successful':
                    return status === 'successful';
                  case 'failed':
                    return status === 'failed' || status === 'bundler_discarded';
                  default:
                    return true;
                }
              });

              return filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => (
                  <div key={index} className="order-item">
                    <div className="order-item-left">
                      <div className="order-network">
                        <span className="label">Network</span>
                        <span className="value">{order.networkName || 'N/A'}</span>
                      </div>
                      <div className="order-status">
                        <span className={`status-indicator ${getOrderStatusClass(order.status)}`}>
                          {getStatusIcon(order.status)}
                        </span>
                        <span className="status-text">{getDisplayStatus(order.status)}</span>
                      </div>
                    </div>
                    <div className="order-amount">
                      <span className="amount">₹{convertedAmounts[index]} INR</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-orders">
                  {selectedFilter === 'all'
                    ? 'No orders found'
                    : `No ${selectedFilter.replace('_', ' ')} orders found`}
                </div>
              );
            })()}
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
                  onClick={fetchPortfolio}
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
                Play Game ({GAME_CONFIG.ENTRY_FEE} INR + Gass Fee)
              </button>
            )}
            {gameStatus === 'ENDED' && (
              <button
                onClick={handlePlayClick}
                disabled={isLoading || portfolioBalance < GAME_CONFIG.ENTRY_FEE}
                className="play-button"
              >
                Play Again ({GAME_CONFIG.ENTRY_FEE} INR + Gass Fee))
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
