import React from 'react';
import './Introduction.css';
import { TIER_ICONS } from '../tierIcons';

const Introduction = () => {
  return (
    <div className="introduction-container">
      <div className="intro-content">
        <h1>Welcome to Snake Game!</h1>

        <div className="game-description">
          <p>
            Experience the classic Snake Game with a modern twist! Control your snake and collect food to win exciting MATIC rewards while avoiding collisions.
          </p>
        </div>

        <div className="how-to-play">
          <h2>How to Play</h2>
          <div className="instruction-steps">
            <div className="step">
              <div className="step-number">1</div>
              <p>Sign in to play and win rewards</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <p>Use arrow keys (↑, ↓, ←, →) to control the snake's direction</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <p>Collect food (shown as dots) to grow your snake and earn points</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <p>Avoid hitting the walls and your self</p>
            </div>

          </div>
        </div>

        <div className="tier-system">
          <h2>Tier System & Rewards</h2>
          <div className="tiers-grid">
            <div className="tier-card">
              <span className="tier-icon">{TIER_ICONS['Noob']}</span>
              <h3>Noob</h3>
              <p>0-50 points</p>
              <p>No rewards</p>
            </div>
            <div className="tier-card">
              <span className="tier-icon">{TIER_ICONS['Ape']}</span>
              <h3>Ape</h3>
              <p>50-100 points</p>
              <p>10% bonus rewards</p>
            </div>
            <div className="tier-card">
              <span className="tier-icon">{TIER_ICONS['Hodler']}</span>
              <h3>Hodler</h3>
              <p>100-150 points</p>
              <p>20% bonus rewards</p>
            </div>
            <div className="tier-card">
              <span className="tier-icon">{TIER_ICONS['Moon Lander']}</span>
              <h3>Moon Lander</h3>
              <p>150-200 points</p>
              <p>30% bonus rewards</p>
            </div>
            <div className="tier-card">
              <span className="tier-icon">{TIER_ICONS['Satoshi']}</span>
              <h3>Satoshi</h3>
              <p>200+ points</p>
              <p>40% bonus rewards</p>
            </div>
          </div>
        </div>

        <div className="reward-info">
          <h2>Reward System</h2>
          <ul>
            <li>Entry fee: 2 INR worth of MATIC per game</li>
            <li>Base threshold: 50 points to qualify for rewards</li>
            <li>Higher tiers earn bonus rewards through multipliers</li>
            <li>Rewards are paid in MATIC to your wallet</li>
            <li>Each food collected adds 10 points to your score</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Introduction;
