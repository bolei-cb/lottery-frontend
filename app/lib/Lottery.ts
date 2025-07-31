export const LotteryAbi = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_count',
        type: 'uint256',
      },
    ],
    name: 'buyTickets',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_count',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_teamId',
        type: 'uint256',
      },
    ],
    name: 'buyTicketsForTeam',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimCreatorStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimLastMinterWin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimPrize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'creator',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'drawTimestamp',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'executeDraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getLotteryInfo',
    outputs: [
      {
        internalType: 'address',
        name: '_creator',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_initialStake',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_ticketPrice',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_drawTimestamp',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_totalPot',
        type: 'uint256',
      },
      {
        internalType: 'enum Lottery.LotteryMode',
        name: '_mode',
        type: 'uint8',
      },
      {
        internalType: 'enum Lottery.LotteryStatus',
        name: '_status',
        type: 'uint8',
      },
      {
        internalType: 'uint256',
        name: '_playerCount',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getPlayers',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_teamId',
        type: 'uint256',
      },
    ],
    name: 'getTeamMembers',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getWinners',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'initialStake',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'lastEntryTimestamp',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'lastMinter',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'leiToken',
    outputs: [
      {
        internalType: 'contract IERC20',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'mainWinner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'mode',
    outputs: [
      {
        internalType: 'enum Lottery.LotteryMode',
        name: '',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'playerTeam',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'status',
    outputs: [
      {
        internalType: 'enum Lottery.LotteryStatus',
        name: '',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'ticketCounts',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'ticketPrice',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalPot',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'winnerPrizes',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Lottery mode enum
export enum LotteryMode {
  TeamBased = 0,
  LastMinter = 1,
  PrizeSplashZone = 2,
}

// Lottery status enum
export enum LotteryStatus {
  Open = 0,
  Closed = 1,
  PaidOut = 2,
}

// Helper to get mode name
export function getModeName(mode: number): string {
  switch (mode) {
    case LotteryMode.TeamBased:
      return 'Team-Based';
    case LotteryMode.LastMinter:
      return 'Last Minter';
    case LotteryMode.PrizeSplashZone:
      return 'Prize Splash Zone';
    default:
      return 'Unknown';
  }
}

// Helper to get status name
export function getStatusName(status: number): string {
  switch (status) {
    case LotteryStatus.Open:
      return 'Open';
    case LotteryStatus.Closed:
      return 'Closed';
    case LotteryStatus.PaidOut:
      return 'Paid Out';
    default:
      return 'Unknown';
  }
} 