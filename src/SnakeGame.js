import React, { useState, useEffect, useRef, useCallback } from 'react';
import './SnakeGame.css';
import { Address,getPortfolio, tokenTransfer, useOkto } from "@okto_web3/react-sdk";
import { useGlobalOktoClient } from './context/OktoClientContext';
const GAME_CONFIG = {
  BOARD_WIDTH: 400,
  BOARD_HEIGHT: 400,
  GRID_SIZE: 20,
  INITIAL_SPEED: 200,
  ENTRY_FEE: 5,
  BASE_THRESHOLD: 500
};

const TIERS = [
  { 
    name: 'Novice', 
    minScore: 500, 
    maxScore: 1000, 
    multiplier: 1.2,
    speedMultiplier: 0.9
  },
  { 
    name: 'Apprentice', 
    minScore: 1000, 
    maxScore: 2000, 
    multiplier: 1.5,
    speedMultiplier: 0.8
  },
  { 
    name: 'Expert', 
    minScore: 2000, 
    maxScore: 3500, 
    multiplier: 2,
    speedMultiplier: 0.7
  },
  { 
    name: 'Master', 
    minScore: 3500, 
    maxScore: 5000, 
    multiplier: 3,
    speedMultiplier: 0.6
  },
  { 
    name: 'Legendary', 
    minScore: 5000, 
    maxScore: Infinity, 
    multiplier: 5,
    speedMultiplier: 0.5
  }
];

const SnakeGame = () => {
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState('RIGHT');
  const [gameStatus, setGameStatus] = useState('READY');
  const [score, setScore] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [reward, setReward] = useState(0);
  const [portfolioBalance, setPortfolioBalance] = useState(0);

  const gameLoopRef = useRef(null);
  const timeIntervalRef = useRef(null);
  const canvasRef = useRef(null);
  const oktoClient = useGlobalOktoClient(); 

  const getCurrentTier = useCallback(() => {
    return TIERS.find(
      tier => score >= tier.minScore && score < tier.maxScore
    ) || TIERS[TIERS.length - 1];
  }, [score]);

  const getCurrentSpeed = useCallback(() => {
    const currentTier = getCurrentTier();
    return GAME_CONFIG.INITIAL_SPEED * currentTier.speedMultiplier;
  }, [getCurrentTier]);

  const calculateReward = useCallback(() => {
    if (score < GAME_CONFIG.BASE_THRESHOLD) return 0;
    
    const currentTier = getCurrentTier();
    const additionalReward = GAME_CONFIG.ENTRY_FEE * (
      (score - GAME_CONFIG.BASE_THRESHOLD) / 
      GAME_CONFIG.BASE_THRESHOLD * 
      currentTier.multiplier
    );

    return Math.round(additionalReward * 100) / 100;
  }, [score, getCurrentTier]);

  const generateFood = () => {
    const x = Math.floor(Math.random() * (GAME_CONFIG.BOARD_WIDTH / GAME_CONFIG.GRID_SIZE));
    const y = Math.floor(Math.random() * (GAME_CONFIG.BOARD_HEIGHT / GAME_CONFIG.GRID_SIZE));
    return { x, y };
  };

  const startGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(generateFood());
    setDirection('RIGHT');
    setScore(0);
    setGameTime(0);
    setGameStatus('PLAYING');
    setReward(GAME_CONFIG.ENTRY_FEE);

    timeIntervalRef.current = setInterval(() => {
      setGameTime(prev => prev + 1);
    }, 1000);
  };

  const gameOver = () => {
    setGameStatus('GAME_OVER');
    clearInterval(gameLoopRef.current);
    clearInterval(timeIntervalRef.current);
    const finalReward = calculateReward();
    setReward(finalReward);
  };

  const moveSnake = useCallback(() => {
    if (gameStatus !== 'PLAYING') return;

    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };

      switch (direction) {
        case 'UP': head.y -= 1; break;
        case 'DOWN': head.y += 1; break;
        case 'LEFT': head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
        default: break;
      }

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
        setScore(prevScore => prevScore + 10);
        setFood(generateFood());
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, gameStatus]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp': 
          if (direction !== 'DOWN') setDirection('UP'); 
          break;
        case 'ArrowDown': 
          if (direction !== 'UP') setDirection('DOWN'); 
          break;
        case 'ArrowLeft': 
          if (direction !== 'RIGHT') setDirection('LEFT'); 
          break;
        case 'ArrowRight': 
          if (direction !== 'LEFT') setDirection('RIGHT'); 
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
  }, [direction]);

  useEffect(() => {
    if (gameStatus === 'PLAYING') {
      gameLoopRef.current = setInterval(moveSnake, getCurrentSpeed());
      return () => clearInterval(gameLoopRef.current);
    }
  }, [gameStatus, moveSnake, getCurrentSpeed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, GAME_CONFIG.BOARD_WIDTH, GAME_CONFIG.BOARD_HEIGHT);

    ctx.fillStyle = '#4CAF50';
    snake.forEach(segment => {
      ctx.fillRect(
        segment.x * GAME_CONFIG.GRID_SIZE, 
        segment.y * GAME_CONFIG.GRID_SIZE, 
        GAME_CONFIG.GRID_SIZE - 1, 
        GAME_CONFIG.GRID_SIZE - 1
      );
    });

    ctx.fillStyle = '#F44336';
    ctx.fillRect(
      food.x * GAME_CONFIG.GRID_SIZE, 
      food.y * GAME_CONFIG.GRID_SIZE, 
      GAME_CONFIG.GRID_SIZE - 1, 
      GAME_CONFIG.GRID_SIZE - 1
    );
  }, [snake, food]);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const portfolio = await getPortfolio(oktoClient);
        //if not empty
        if (portfolio.aggregatedData.totalHoldingPriceInr !==""){
          setPortfolioBalance(Number(portfolio.aggregatedData.totalHoldingPriceInr));
        }
      } catch (error) {
        console.error('Error fetching portfolio:', error);
      }
    };
    fetchPortfolio();
  }, []);

  const refreshPortfolio = async () => {
    try {
      const portfolio = await getPortfolio(oktoClient);
      if (portfolio.aggregatedData.totalHoldingPriceInr !==""){
        setPortfolioBalance(Number(portfolio.aggregatedData.totalHoldingPriceInr));
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    }
  };
  async function convertUsdToWei(usdAmount) {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      const exchangeRate = data.ethereum.usd;
  
      // Convert USD to ETH
      const ethAmount = usdAmount / exchangeRate;
  
      // Convert ETH to Wei (1 ETH = 10^18 Wei)
      const weiAmount = ethAmount * 1e18;
  
      console.log(`${usdAmount} USD is approximately ${weiAmount} Wei`);
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    }
  }

  const transferTokenToTreasury=async () => {
    const tokenToTransfer=0.1;
    await convertUsdToWei

    const transferParams = {
      amount: Number(quantity),
      recipient: "0x117419d4D598129453A89E37e2dd964b09E7B5E6",
      token: "",
      chain: "eip155:42161",
    };
    tokenTransfer(oktoClient, );
  }

  const getStatusClass = () => {
    switch (gameStatus) {
      case 'PLAYING': return 'status-playing';
      case 'PAUSED': return 'status-paused';
      case 'GAME_OVER': return 'status-gameover';
      default: return 'status-ready';
    }
  };

  return (
    <div className="game-container">
      <div className="game-board">
        <canvas 
          ref={canvasRef}
          width={GAME_CONFIG.BOARD_WIDTH}
          height={GAME_CONFIG.BOARD_HEIGHT}
          className="game-canvas"
        />
        {gameStatus === 'READY' && (
          <button 
            onClick={startGame} 
            className="game-button start-button"
          >
            Start Game
          </button>
        )}
        {gameStatus === 'GAME_OVER' && (
          <button 
            onClick={startGame} 
            className="game-button retry-button"
          >
            Play Again
          </button>
        )}
      </div>

      <div className="stats-sidebar">
        <div className="stats-card">
          <div className="stats-section">
            <h3>Game Status</h3>
            <div className="status-badge">
              <span className={`status ${getStatusClass()}`}>
                {gameStatus}
              </span>
            </div>
          </div>

          <div className="stats-section">
            <div className="stat-row">
              <span>Game Time</span>
              <span>{gameTime} sec</span>
            </div>
          </div>

          <div className="stats-section">
            <div className="stat-row">
              <span>Current Score</span>
              <span>{score} pts</span>
            </div>
          </div>

          <div className="stats-section">
            <div className="stat-row">
              <span>Current Tier</span>
              <span className="tier-badge">
                {getCurrentTier().name}
              </span>
            </div>
          </div>

          <div className="stats-section">
            <div className="stat-row">
              <span>Potential Reward</span>
              <span className="reward">${reward.toFixed(2)}</span>
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
          </div>

          <div className="controls-section">
            <h4>Controls:</h4>
            <p>Arrow Keys: Move Snake</p>
            <p>Space: Pause/Resume</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;
