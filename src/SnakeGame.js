import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TIER_ICONS } from './tierIcons';
import { LoadingDialog } from './components/LoadingDialog';
import { sdk } from './sdk/web3SDK';
import './SnakeGame.css';

const GAME_CONFIG = {
  BOARD_WIDTH: 400,
  BOARD_HEIGHT: 400,
  GRID_SIZE: 20,
  INITIAL_SPEED: 150,
  ENTRY_FEE: 5,
  BASE_THRESHOLD: 500,
  ANIMATION_DURATION: 800,
  HOUSE_WALLET: '0x1234567890123456789012345678901234567890'
};

const TIERS = [
  { 
    name: 'Noob', 
    minScore: 0, 
    maxScore: 500, 
    multiplier: 1,
    speedMultiplier: 1
  },
  { 
    name: 'Ape', 
    minScore: 500, 
    maxScore: 1000, 
    multiplier: 1.5,
    speedMultiplier: 0.85
  },
  { 
    name: 'Hodler', 
    minScore: 1000, 
    maxScore: 2000, 
    multiplier: 2,
    speedMultiplier: 0.7
  },
  { 
    name: 'Diamond Hands', 
    minScore: 2000, 
    maxScore: 3500, 
    multiplier: 3,
    speedMultiplier: 0.6
  },
  { 
    name: 'Satoshi', 
    minScore: 3500, 
    maxScore: Infinity, 
    multiplier: 5,
    speedMultiplier: 0.5
  }
];

// Animation frames for the snake's pulse effect
const PULSE_FRAMES = Array.from({ length: 8 }, (_, i) => {
  const progress = i / 7;
  const scale = 1 + Math.sin(progress * Math.PI) * 0.3;
  return scale;
});

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
  const [animations, setAnimations] = useState([]);
  const [pulseFrame, setPulseFrame] = useState(0);
  
  // Web3 state
  const [walletAddress, setWalletAddress] = useState(null);
  const [portfolioBalance, setPortfolioBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);

  // Refs
  const gameLoopRef = useRef(null);
  const timeIntervalRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);

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

  const gameOver = useCallback(async () => {
    clearInterval(gameLoopRef.current);
    clearInterval(timeIntervalRef.current);
    setGameStatus('ENDED');
    
    // Calculate final reward
    const finalReward = Math.floor(score * getCurrentTier().multiplier);
    setReward(finalReward);
    
    if (finalReward > 0) {
      try {
        setLoadingMessage('Processing reward payment...');
        setIsLoading(true);

        // Transfer reward from house wallet to player
        await sdk.transferTokens(
          GAME_CONFIG.HOUSE_WALLET,
          walletAddress,
          finalReward
        );

        // Update portfolio balance
        const newBalance = await sdk.getPortfolioBalance(walletAddress);
        setPortfolioBalance(newBalance);
        
        setError(null);
      } catch (err) {
        setError('Failed to process reward: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    }
  }, [score, getCurrentTier, walletAddress]);

  const startGame = async () => {
    try {
      setLoadingMessage('Processing entry fee...');
      setIsLoading(true);

      // Transfer entry fee to house wallet
      await sdk.transferTokens(
        walletAddress,
        GAME_CONFIG.HOUSE_WALLET,
        GAME_CONFIG.ENTRY_FEE
      );

      // Update portfolio balance
      const newBalance = await sdk.getPortfolioBalance(walletAddress);
      setPortfolioBalance(newBalance);
      
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
    return Math.floor(score * currentTier.multiplier);
  }, [score, getCurrentTier]);

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
        const points = Math.floor(10 * getCurrentTier().multiplier);
        setScore(prevScore => {
          const newScore = prevScore + points;
          return newScore;
        });
        setFood(generateFood());
        
        // Trigger animations
        setPulseFrame(0);
        const pixelX = head.x * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2;
        const pixelY = head.y * GAME_CONFIG.GRID_SIZE;
        addScorePopup(pixelX, pixelY, points);
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

  // Initialize Web3 connection
  useEffect(() => {
    const initializeWeb3 = async () => {
      if (!user?.email) {
        setGameStatus('READY');
        return;
      }

      try {
        setIsLoading(true);
        setLoadingMessage('Connecting to wallet...');
        console.log('Connecting wallet for user:', user.email); // Debug log
        
        const address = await sdk.connect(user.email);
        console.log('Wallet connected:', address); // Debug log
        setWalletAddress(address);
        
        setLoadingMessage('Fetching portfolio...');
        const balance = await sdk.getPortfolioBalance(address);
        console.log('Portfolio balance:', balance); // Debug log
        setPortfolioBalance(balance);
        
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
  }, [user?.email]); // Only depend on user.email

  return (
    <div className="game-container">
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
              <span>Multiplier</span>
              <span>{getCurrentTier().multiplier}x</span>
            </div>
          </div>

          <div className="stats-section">
            <div className="stat-row">
              <span>Portfolio Balance</span>
              <span className="balance">
                {portfolioBalance !== null ? (
                  `${portfolioBalance.toFixed(2)} tokens`
                ) : (
                  <span className="shimmer">Loading...</span>
                )}
              </span>
            </div>
            <div className="stat-row">
              <span>Potential Reward</span>
              <span className="reward">{reward.toFixed(2)} tokens</span>
            </div>
            <div className="stat-row">
              <span>Entry Fee</span>
              <span>{GAME_CONFIG.ENTRY_FEE} tokens</span>
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
