import React from 'react';
import './Introduction.css';

const Introduction = () => {
  return (
    <div className="introduction-container">
      <div className="intro-content">
        <h1>Welcome to Snake Game!</h1>
        
        <div className="game-description">
          <p>
            Experience the classic Snake Game with a modern twist! Control your snake,
            collect food, and win exciting reward points while avoiding collisions.
          </p>
        </div>

        <div className="how-to-play">
          <h2>How to Play</h2>
          <div className="instruction-steps">
            <div className="step">
              <div className="step-number">1</div>
              <p>Use arrow keys (↑, ↓, ←, →) to control the snake's direction</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <p>Collect food (shown as dots) to grow your snake and earn reward points</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <p>Avoid hitting the walls and your own tail</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <p>Sign in to play the snake and win rewards points</p>
            </div>
          </div>
        </div>

        <div className="game-features">
          <h2>Features</h2>
          <ul>
            <li>Classic snake gameplay with smooth controls</li>
            <li>Earn real rewards as you play</li>
            <li>Save your progress with Google Sign-in</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Introduction;
