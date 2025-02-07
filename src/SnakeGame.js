import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TIER_ICONS } from './tierIcons';
import './SnakeGame.css';

const GAME_CONFIG = {
  BOARD_WIDTH: 400,
  BOARD_HEIGHT: 400,
  GRID_SIZE: 20,
  INITIAL_SPEED: 150,
  ENTRY_FEE: 5,
  BASE_THRESHOLD: 500,
  INITIAL_SNAKE_SIZE: 3
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

const SnakeGame = () => {
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState({ x: 0, y: 0 });
  const [gameStatus, setGameStatus] = useState('READY');
  const [score, setScore] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [reward, setReward] = useState(0);

  const gameLoopRef = useRef(null);
  const timeIntervalRef = useRef(null);
  const canvasRef = useRef(null);

  const getCurrentTier = useCallback(() => {
    return TIERS.find(tier => score >= tier.minScore && score < tier.maxScore) || TIERS[0];
  }, [score]);

  const calculateReward = useCallback(() => {
    if (score < GAME_CONFIG.BASE_THRESHOLD) return 0;
    
    const currentTier = getCurrentTier();
    const additionalReward = GAME_CONFIG.ENTRY_FEE * (
      (score - GAME_CONFIG.BASE_THRESHOLD) / 
      GAME_CONFIG.BASE_THRESHOLD * 
      currentTier.multiplier
    );

    return Math.max(0, Math.round(additionalReward * 100) / 100);
  }, [score, getCurrentTier]);

  const generateFood = () => {
    const x = Math.floor(Math.random() * (GAME_CONFIG.BOARD_WIDTH / GAME_CONFIG.GRID_SIZE));
    const y = Math.floor(Math.random() * (GAME_CONFIG.BOARD_HEIGHT / GAME_CONFIG.GRID_SIZE));
    return { x, y };
  };

  const startGame = () => {
    const initialSnake = [];
    for (let i = 0; i < 3; i++) {
      initialSnake.push({ x: 10 - i, y: 10 });
    }
    setSnake(initialSnake);
    setFood(generateFood());
    setDirection({ x: 1, y: 0 });
    setScore(0);
    setGameTime(0);
    setGameStatus('PLAYING');
    setReward(0);

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
        setScore(prevScore => prevScore + 10);
        setFood(generateFood());
        setReward(calculateReward());
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, gameStatus, calculateReward]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      e.preventDefault(); // Prevent scrolling
      
      if (gameStatus === 'GAME_OVER') return;

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

    // Draw snake with gradient and tier badge
    snake.forEach((segment, index) => {
      const gradient = ctx.createLinearGradient(
        segment.x * GAME_CONFIG.GRID_SIZE,
        segment.y * GAME_CONFIG.GRID_SIZE,
        (segment.x + 1) * GAME_CONFIG.GRID_SIZE,
        (segment.y + 1) * GAME_CONFIG.GRID_SIZE
      );
      gradient.addColorStop(0, '#4CAF50');
      gradient.addColorStop(1, '#45a049');
      
      ctx.fillStyle = gradient;
      ctx.shadowColor = '#4CAF50';
      ctx.shadowBlur = index === 0 ? 10 : 5;
      ctx.fillRect(
        segment.x * GAME_CONFIG.GRID_SIZE,
        segment.y * GAME_CONFIG.GRID_SIZE,
        GAME_CONFIG.GRID_SIZE - 1,
        GAME_CONFIG.GRID_SIZE - 1
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
        ctx.shadowBlur = 0;
      }
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
  }, [snake, food, getCurrentTier]);

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
              <span className={`tier-badge tier-${getCurrentTier().name.replace(' ', '-')}`}>
                {TIER_ICONS[getCurrentTier().name]} {getCurrentTier().name}
              </span>
            </div>
          </div>

          <div className="stats-section">
            <div className="stat-row">
              <span>Potential Reward</span>
              <span className="reward">${reward.toFixed(2)}</span>
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
