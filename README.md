# Web3 Snake Game 🐍

A blockchain-enabled Snake Game where players can earn crypto rewards based on their performance. Built with React and integrated with Okto Web3 SDK for handling crypto transactions on the Polygon network.

## 🎮 Game Overview

Players control a snake to collect food while avoiding collisions. As they progress, they earn points and move through different tiers, each offering increased reward multipliers.

### Core Features

- 🎯 Classic Snake Game with modern visual effects
- 💰 Real crypto rewards in MATIC
- 🏆 Tier-based progression system
- 📊 Real-time portfolio tracking
- 📜 Transaction history
- 🎨 Dynamic animations and visual feedback

### Tiers
- **Noob**: 0-50 points, No rewards
- **Ape**: 50-100 points, 10% bonus rewards
- **Hodler**: 100-150 points, 20% bonus rewards
- **Moon Lander**: 150-200 points, 30% bonus rewards
- **Satoshi**: 200+ points, 40% bonus rewards

## 🛠 Technical Stack

- **Frontend**: React.js
- **Blockchain Integration**: Okto Web3 SDK
- **Smart Contract Interaction**: ethers.js
- **Authentication**: Google OAuth
- **Network**: Polygon (MATIC)

## 📋 Prerequisites

- Node.js (v14 or higher)
- NPM (v6 or higher)
- Google account for authentication
- Modern web browser (Chrome, Firefox, Edge)

## 🚀 Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/web3-snake-game.git
cd web3-snake-game
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_PRIVATE_KEY=your_private_key
```

4. Start the development server:
```bash
npm start
```

## 🎮 How to Play

1. Connect your wallet using Google authentication
2. Pay the entry fee (2 INR in MATIC)
3. Use arrow keys to control the snake:
   - ⬆️ Up Arrow: Move up
   - ⬇️ Down Arrow: Move down
   - ⬅️ Left Arrow: Move left
   - ➡️ Right Arrow: Move right
   - Space: Pause/Resume
4. Collect food to increase your score
5. Avoid hitting walls and the snake's body
6. Reach higher tiers to increase your reward multiplier

## 🏗 Project Structure

```
src/
├── components/
│   ├── LoadingDialog.js    # Loading overlay component
│   └── ...
├── context/
│   ├── AuthContext.js      # Authentication context
│   └── OktoClientContext.js # Okto SDK context
├── sdk/
│   └── web3SDK.js          # Web3 integration utilities
├── App.js                  # Main application component
├── SnakeGame.js           # Core game logic
└── tierIcons.js           # Tier system icons
```

## 🔧 Configuration

Key game parameters can be modified in `SnakeGame.js`:

```javascript
const GAME_CONFIG = {
  BOARD_WIDTH: 400,
  BOARD_HEIGHT: 400,
  GRID_SIZE: 20,
  INITIAL_SPEED: 150,
  ENTRY_FEE: 2,
  BASE_THRESHOLD: 50,
  // ...
};
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This is a game involving cryptocurrency transactions. Please ensure you understand the risks involved and play responsibly.
