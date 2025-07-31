'use client';

import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet";
import { Address, Avatar, EthBalance, Identity, Name } from "@coinbase/onchainkit/identity";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";
import { formatEther, parseEther } from "viem";
import { LotteryFactoryAbi, LOTTERY_FACTORY_ADDRESS } from "./lib/LotteryFactory";
import { LotteryAbi, LotteryMode, LotteryStatus, getModeName, getStatusName } from "./lib/Lottery";
import { LEITokenAbi, leiTokenContract } from "./lib/LEIToken";
import Link from "next/link";

function CreateLotteryModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const { address } = useAccount();
  const [initialStake, setInitialStake] = useState("100");
  const [ticketPrice, setTicketPrice] = useState("5");
  const [drawDate, setDrawDate] = useState("");
  const [drawTime, setDrawTime] = useState("");
  const [mode, setMode] = useState(0);
  const [isApproving, setIsApproving] = useState(false);

  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { writeContract: createLottery, data: createHash } = useWriteContract();
  
  const { isLoading: isApprovePending } = useWaitForTransactionReceipt({
    hash: approveHash,
  });
  
  const { isLoading: isCreatePending } = useWaitForTransactionReceipt({
    hash: createHash,
  });

  const handleCreate = async () => {
    if (!address || !drawDate || !drawTime) return;

    try {
      // Convert datetime to timestamp
      const drawTimestamp = Math.floor(new Date(`${drawDate}T${drawTime}`).getTime() / 1000);
      
      // First approve
      setIsApproving(true);
      await approve({
        address: leiTokenContract,
        abi: LEITokenAbi,
        functionName: 'approve',
        args: [LOTTERY_FACTORY_ADDRESS, parseEther(initialStake)],
      });
    } catch (error) {
      console.error('Approval error:', error);
      setIsApproving(false);
    }
  };

  // Watch for approval success
  useEffect(() => {
    if (approveHash && !isApprovePending && isApproving) {
      setIsApproving(false);
      // Now create lottery
      const drawTimestamp = Math.floor(new Date(`${drawDate}T${drawTime}`).getTime() / 1000);
      createLottery({
        address: LOTTERY_FACTORY_ADDRESS,
        abi: LotteryFactoryAbi,
        functionName: 'createLottery',
        args: [parseEther(initialStake), parseEther(ticketPrice), BigInt(drawTimestamp), mode],
      });
    }
  }, [approveHash, isApprovePending, isApproving, drawDate, drawTime, initialStake, ticketPrice, mode, createLottery]);

  // Watch for creation success
  useEffect(() => {
    if (createHash && !isCreatePending) {
      onSuccess();
      onClose();
    }
  }, [createHash, isCreatePending, onClose, onSuccess]);

  if (!isOpen) return null;

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-6">Create New Lottery</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Initial Stake (LEI)</label>
            <input
              type="number"
              value={initialStake}
              onChange={(e) => setInitialStake(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="100"
              step="10"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum: 100 LEI</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ticket Price (LEI)</label>
            <input
              type="number"
              value={ticketPrice}
              onChange={(e) => setTicketPrice(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0.1"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Draw Date</label>
            <input
              type="date"
              value={drawDate}
              onChange={(e) => setDrawDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={today}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Draw Time</label>
            <input
              type="time"
              value={drawTime}
              onChange={(e) => setDrawTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Lottery Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={LotteryMode.TeamBased}>Team-Based (50% winner, 50% team)</option>
              <option value={LotteryMode.LastMinter}>Last Minter (5 min timer)</option>
              <option value={LotteryMode.PrizeSplashZone}>Prize Splash Zone (70% winner, 30% next 10)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isApprovePending || isCreatePending}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!address || !drawDate || !drawTime || isApprovePending || isCreatePending}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isApprovePending ? 'Approving...' : isCreatePending ? 'Creating...' : 'Create Lottery'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LotteryCard({ address }: { address: string }) {
  // Validate address
  const isValidAddress = address && address.length === 42 && address.startsWith('0x');
  if (!isValidAddress) {
    console.error('Invalid address format:', address);
    return (
      <div className="border border-red-200 rounded-lg p-6 bg-red-50">
        <p className="text-red-600 text-sm">Invalid address format</p>
        <p className="text-xs text-red-500 mt-1">{address}</p>
      </div>
    );
  }
  
  const { data: lotteryInfo, isLoading, error } = useReadContract({
    address: address as `0x${string}`,
    abi: LotteryAbi,
    functionName: 'getLotteryInfo',
  });

  // Also try reading a simple value to test connectivity
  const { data: creatorTest } = useReadContract({
    address: address as `0x${string}`,
    abi: LotteryAbi,
    functionName: 'creator',
  });

  const { data: statusTest } = useReadContract({
    address: address as `0x${string}`,
    abi: LotteryAbi,
    functionName: 'status',
  });

  // Log key data for debugging
  if (error) {
    console.error('Error reading lottery at', address, ':', error);
  } else if (!isLoading && lotteryInfo) {
    console.log('Lottery loaded:', address, { creatorTest, statusTest });
  }

  if (error) {
    return (
      <div className="border border-red-200 rounded-lg p-6 bg-red-50">
        <p className="text-red-600 text-sm">Error loading lottery</p>
        <p className="text-xs text-red-500 mt-1">{address}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!lotteryInfo) {
    console.log('No lottery info for:', address);
    return null;
  }

  let creator, initialStake, ticketPrice, drawTimestamp, totalPot, mode, status, playerCount;
  
  try {
    // Handle both array and object responses
    if (Array.isArray(lotteryInfo)) {
      [creator, initialStake, ticketPrice, drawTimestamp, totalPot, mode, status, playerCount] = lotteryInfo;
    } else if (lotteryInfo && typeof lotteryInfo === 'object') {
      // If it's an object, extract values in order
      ({ _creator: creator, _initialStake: initialStake, _ticketPrice: ticketPrice, 
        _drawTimestamp: drawTimestamp, _totalPot: totalPot, _mode: mode, 
        _status: status, _playerCount: playerCount } = lotteryInfo as any);
    }
  } catch (e) {
    console.error('Error destructuring lottery info:', e);
    return null;
  }
  
  // Validate we got data
  if (!creator || initialStake === undefined) {
    console.error('Invalid lottery data for', address);
    return null;
  }
  
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = Number(drawTimestamp) - now;
  const isActive = status === LotteryStatus.Open && timeLeft > 0;
  const isPast = status !== LotteryStatus.Open || timeLeft <= 0;

  return (
    <Link href={`/lottery/${address}`}>
      <div className={`border rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer ${
        isPast ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">{getModeName(mode)}</h3>
            <p className="text-sm text-gray-500">by {creator.slice(0, 6)}...{creator.slice(-4)}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isActive ? 'bg-green-100 text-green-800' : 
            status === LotteryStatus.Closed ? 'bg-yellow-100 text-yellow-800' :
            status === LotteryStatus.PaidOut ? 'bg-purple-100 text-purple-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {getStatusName(status)}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Prize Pool:</span>
            <span className="font-semibold">{formatEther(totalPot)} LEI</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Ticket Price:</span>
            <span>{formatEther(ticketPrice)} LEI</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Players:</span>
            <span>{playerCount.toString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">
              {isActive ? 'Time Left:' : 'Draw Time:'}
            </span>
            <span className={isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              {isActive && timeLeft > 0 
                ? `${Math.floor(timeLeft / 3600)}h ${Math.floor((timeLeft % 3600) / 60)}m`
                : new Date(Number(drawTimestamp) * 1000).toLocaleDateString()
              }
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { address, isConnected, chain } = useAccount();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'past'>('active');

  const { data: allLotteries, isLoading, refetch } = useReadContract({
    address: LOTTERY_FACTORY_ADDRESS,
    abi: LotteryFactoryAbi,
    functionName: 'getDeployedLotteries',
  });

  // Get active lotteries if needed for filtering
  const { data: activeLotteries } = useReadContract({
    address: LOTTERY_FACTORY_ADDRESS,
    abi: LotteryFactoryAbi,
    functionName: 'getActiveLotteries',
  });

  // Combine all known lottery addresses
  const knownAddresses = new Set<string>();
  
  if (allLotteries) {
    allLotteries.forEach((addr: string) => knownAddresses.add(addr));
  }
  if (activeLotteries) {
    activeLotteries.forEach((addr: string) => knownAddresses.add(addr));
  }
  
  const allKnownLotteries = Array.from(knownAddresses);
  
  const displayedLotteries = filterStatus === 'active' 
    ? activeLotteries || []
    : filterStatus === 'past'
    ? allKnownLotteries.filter(addr => !activeLotteries?.includes(addr as `0x${string}`))
    : allKnownLotteries;

  // Debug logging
  if (allKnownLotteries.length > 0) {
    console.log(`Found ${allKnownLotteries.length} lotteries, displaying ${displayedLotteries.length} for filter: ${filterStatus}`);
    console.log('Lottery addresses:', allKnownLotteries);
  } else if (!isLoading) {
    console.log('No lotteries found. Chain:', chain?.name, 'Factory:', LOTTERY_FACTORY_ADDRESS);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">LEI Lottery Hub</h1>
          <Wallet>
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address />
                <EthBalance />
              </Identity>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Lotteries</h2>
              <p className="text-gray-600 mt-1">
                {allKnownLotteries ? `${allKnownLotteries.length} total lotteries` : 'Loading...'}
              </p>
            </div>
            {isConnected && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Create Your Own Lottery
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 font-medium transition-colors ${
                filterStatus === 'all' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Lotteries
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-4 py-2 font-medium transition-colors ${
                filterStatus === 'active' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('past')}
              className={`px-4 py-2 font-medium transition-colors ${
                filterStatus === 'past' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Past
            </button>
          </div>
        </div>

        {/* Lottery Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedLotteries && displayedLotteries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...displayedLotteries].reverse().map((lotteryAddress) => (
              <LotteryCard key={lotteryAddress} address={lotteryAddress} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-xl text-gray-600 mb-2">
              {filterStatus === 'active' ? 'No active lotteries' : 
               filterStatus === 'past' ? 'No past lotteries' : 
               'No lotteries created yet'}
            </p>
            {isConnected ? (
              <p className="text-gray-500">Be the first to create a lottery!</p>
            ) : (
              <p className="text-gray-500">Connect your wallet to create a lottery</p>
            )}
          </div>
        )}
      </main>

      {/* Create Lottery Modal */}
      <CreateLotteryModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}