// Mock Web3 SDK for demonstration
export class Web3SDK {
  constructor() {
    this.mockDelay = 2000; // Simulate network delay
  }

  async connect(userEmail) {
    await this.delay();
    // Mock wallet address based on email
    return `0x${Array.from(userEmail).reduce((h, c) => 
      (h + c.charCodeAt(0).toString(16)), '').slice(0, 40)}`;
  }

  async getPortfolioBalance(walletAddress) {
    await this.delay();
    // Mock balance between 100 and 1000
    if (!walletAddress) throw new Error('Invalid wallet address');
    return Math.floor(Math.random() * 900 + 100);
  }

  async transferTokens(fromAddress, toAddress, amount) {
    await this.delay();
    if (Math.random() < 0.1) { // 10% chance of failure
      throw new Error('Transaction failed');
    }
    return {
      transactionHash: `0x${Math.random().toString(16).slice(2)}`,
      status: 'success'
    };
  }

  async delay() {
    return new Promise(resolve => setTimeout(resolve, this.mockDelay));
  }
}

export const sdk = new Web3SDK();
