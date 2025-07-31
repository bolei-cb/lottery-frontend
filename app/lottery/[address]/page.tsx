'use client';

import { useParams } from 'next/navigation';
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet";
import { Address, Avatar, EthBalance, Identity, Name } from "@coinbase/onchainkit/identity";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { useState, useEffect } from "react";
import { formatEther, parseEther } from "viem";
import { baseSepolia } from "wagmi/chains";
import { LotteryAbi, LotteryMode, LotteryStatus, getModeName, getStatusName } from "../../lib/Lottery";
import { LEITokenAbi, leiTokenContract } from "../../lib/LEIToken";
import Link from "next/link";

// Helper function to format LEI with proper precision
const formatLEI = (amount: bigint, precision: number = 6): string => {
  const formatted = formatEther(amount);
  const num = parseFloat(formatted);
  return num.toFixed(precision).replace(/\.?0+$/, '');
};

export default function LotteryDetailPage() {
  const params = useParams();
  const lotteryAddress = params.address as string;
  const { address: userAddress, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  
  const [ticketCount, setTicketCount] = useState("1");
  const [teamId, setTeamId] = useState("0");
  const [isApproving, setIsApproving] = useState(false);

  // Check if user is on correct network
  const isOnCorrectNetwork = chain?.id === baseSepolia.id;
  const canInteract = userAddress && isOnCorrectNetwork;

  // Read lottery info
  const { data: lotteryInfo, refetch: refetchInfo } = useReadContract({
    address: lotteryAddress as `0x${string}`,
    abi: LotteryAbi,
    functionName: 'getLotteryInfo',
  });

  // Read user tickets
  const { data: userTickets } = useReadContract({
    address: lotteryAddress as `0x${string}`,
    abi: LotteryAbi,
    functionName: 'ticketCounts',
    args: [userAddress || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!userAddress,
    },
  });

  // Read user team
  const { data: userTeam } = useReadContract({
    address: lotteryAddress as `0x${string}`,
    abi: LotteryAbi,
    functionName: 'playerTeam',
    args: [userAddress || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!userAddress,
    },
  });

  // Read players
  const { data: players } = useReadContract({
    address: lotteryAddress as `0x${string}`,
    abi: LotteryAbi,
    functionName: 'getPlayers',
  });

  // Read winners
  const { data: winners } = useReadContract({
    address: lotteryAddress as `0x${string}`,
    abi: LotteryAbi,
    functionName: 'getWinners',
  });

  // Read main winner
  const { data: mainWinner } = useReadContract({
    address: lotteryAddress as `0x${string}`,
    abi: LotteryAbi,
    functionName: 'mainWinner',
  });

  // Read user prize
  const { data: userPrize } = useReadContract({
    address: lotteryAddress as `0x${string}`,
    abi: LotteryAbi,
    functionName: 'winnerPrizes',
    args: [userAddress || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!userAddress,
    },
  });

  // Last minter specific
  const { data: lastMinter } = useReadContract({
    address: lotteryAddress as `0x${string}`,
    abi: LotteryAbi,
    functionName: 'lastMinter',
  });

  const { data: lastEntryTimestamp } = useReadContract({
    address: lotteryAddress as `0x${string}`,
    abi: LotteryAbi,
    functionName: 'lastEntryTimestamp',
  });

  // Read token allowance
  const { data: tokenAllowance } = useReadContract({
    address: leiTokenContract,
    abi: LEITokenAbi,
    functionName: 'allowance',
    args: [
      userAddress || '0x0000000000000000000000000000000000000000', 
      lotteryAddress as `0x${string}`
    ],
    query: {
      enabled: !!userAddress,
    },
  });

  // Write functions
  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { writeContract: buyTickets, data: buyHash } = useWriteContract();
  const { writeContract: executeDraw, data: drawHash } = useWriteContract();
  const { writeContract: claimPrize, data: claimHash } = useWriteContract();
  const { writeContract: claimLastMinter, data: lastMinterHash } = useWriteContract();
  const { writeContract: claimCreatorStake } = useWriteContract();

  const { isLoading: isApprovePending } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isBuyPending } = useWaitForTransactionReceipt({ hash: buyHash });
  const { isLoading: isDrawPending } = useWaitForTransactionReceipt({ hash: drawHash });
  const { isLoading: isClaimPending } = useWaitForTransactionReceipt({ hash: claimHash });
  const { isLoading: isLastMinterPending } = useWaitForTransactionReceipt({ hash: lastMinterHash });

  if (!lotteryInfo) return <div>Loading...</div>;

  const [creator, initialStake, ticketPrice, drawTimestamp, totalPot, mode, status, playerCount] = lotteryInfo;
  
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = Number(drawTimestamp) - now;
  const isActive = status === LotteryStatus.Open && timeLeft > 0;
  const canDraw = timeLeft <= 0 && status === LotteryStatus.Open;
  
  // Last minter specific checks
  const lastMinterTimeLeft = lastEntryTimestamp ? now - Number(lastEntryTimestamp) : 0;
  const canClaimLastMinter = mode === LotteryMode.LastMinter && 
    status === LotteryStatus.Open && 
    lastMinter && 
    lastMinterTimeLeft > 300; // 5 minutes

  const handleSwitchNetwork = async () => {
    try {
      await switchChain({ chainId: baseSepolia.id });
    } catch (error) {
      console.error('Failed to switch network:', error);
      alert('Failed to switch to Base Sepolia. Please switch manually in your wallet.');
    }
  };

  const handleExecuteDraw = async () => {
    if (!userAddress) return;

    // Ensure we're on the correct network
    if (!isOnCorrectNetwork) {
      await handleSwitchNetwork();
      return;
    }

    try {
      console.log('Executing draw for lottery:', lotteryAddress, 'on chain:', chain?.name);
      await executeDraw({
        address: lotteryAddress as `0x${string}`,
        abi: LotteryAbi,
        functionName: 'executeDraw',
        chainId: baseSepolia.id, // Explicitly specify chain
      });
    } catch (error) {
      console.error('Execute draw error:', error);
      alert('Failed to execute draw. Please ensure you are on Base Sepolia network and try again.');
    }
  };

  const handleBuyTickets = async () => {
    if (!userAddress || !ticketCount) return;

    // Ensure we're on the correct network
    if (!isOnCorrectNetwork) {
      await handleSwitchNetwork();
      return;
    }

    try {
      const totalCost = BigInt(ticketCount) * ticketPrice;
      
      console.log('Buying tickets on chain:', chain?.name);
      
      // Check if we need to approve
      if (!tokenAllowance || tokenAllowance < totalCost) {
        // First approve
        setIsApproving(true);
        await approve({
          address: leiTokenContract,
          abi: LEITokenAbi,
          functionName: 'approve',
          args: [lotteryAddress as `0x${string}`, totalCost],
          chainId: baseSepolia.id, // Explicitly specify chain
        });
      } else {
        // We have enough allowance, buy directly
        if (mode === LotteryMode.TeamBased) {
          await buyTickets({
            address: lotteryAddress as `0x${string}`,
            abi: LotteryAbi,
            functionName: 'buyTicketsForTeam',
            args: [BigInt(ticketCount), BigInt(teamId)],
            chainId: baseSepolia.id,
          });
        } else {
          await buyTickets({
            address: lotteryAddress as `0x${string}`,
            abi: LotteryAbi,
            functionName: 'buyTickets',
            args: [BigInt(ticketCount)],
            chainId: baseSepolia.id,
          });
        }
      }
    } catch (error) {
      console.error('Buy tickets error:', error);
      setIsApproving(false);
    }
  };

  // Watch for approval success
  useEffect(() => {
    if (approveHash && !isApprovePending && isApproving) {
      setIsApproving(false);
      // Now buy tickets
      if (mode === LotteryMode.TeamBased) {
        buyTickets({
          address: lotteryAddress as `0x${string}`,
          abi: LotteryAbi,
          functionName: 'buyTicketsForTeam',
          args: [BigInt(ticketCount), BigInt(teamId)],
          chainId: baseSepolia.id, // Explicitly specify chain
        });
      } else {
        buyTickets({
          address: lotteryAddress as `0x${string}`,
          abi: LotteryAbi,
          functionName: 'buyTickets',
          args: [BigInt(ticketCount)],
          chainId: baseSepolia.id, // Explicitly specify chain
        });
      }
    }
  }, [approveHash, isApprovePending, isApproving]);

  // Refetch after buy
  useEffect(() => {
    if (buyHash && !isBuyPending) {
      refetchInfo();
    }
  }, [buyHash, isBuyPending]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
            <h1 className="text-2xl font-bold">Lottery Details</h1>
          </div>
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
      </div>

      {/* Network Warning */}
      {userAddress && !isOnCorrectNetwork && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-4 mt-4 rounded">
          <div className="flex justify-between items-center">
            <div>
              <strong>Wrong Network!</strong> You're on {chain?.name || 'unknown network'}. 
              Please switch to Base Sepolia to interact with this lottery.
            </div>
            <button
              onClick={handleSwitchNetwork}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Switch to Base Sepolia
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lottery Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{getModeName(mode)} Lottery</h1>
                  <p className="text-gray-600">Created by {creator.slice(0, 6)}...{creator.slice(-4)}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  isActive ? 'bg-green-100 text-green-800' : 
                  status === LotteryStatus.Closed ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {getStatusName(status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Prize Pool</p>
                  <p className="text-2xl font-bold">{formatLEI(totalPot)} LEI</p>
                  <p className="text-xs text-gray-500">
                    {totalPot.toString()} wei (18 decimals)
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Ticket Price</p>
                  <p className="text-2xl font-bold">{formatLEI(ticketPrice)} LEI</p>
                  <p className="text-xs text-gray-500">
                    {ticketPrice.toString()} wei (18 decimals)
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Players</p>
                  <p className="text-2xl font-bold">{playerCount.toString()}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">
                    {isActive ? 'Time Left' : 'Draw Time'}
                  </p>
                  <p className="text-2xl font-bold">
                    {isActive && timeLeft > 0 
                      ? `${Math.floor(timeLeft / 3600)}h ${Math.floor((timeLeft % 3600) / 60)}m`
                      : new Date(Number(drawTimestamp) * 1000).toLocaleString()
                    }
                  </p>
                </div>
              </div>

              {/* Mode specific info */}
              {mode === LotteryMode.LastMinter && lastMinter && (
                <div className="mt-4 p-4 bg-blue-50 rounded">
                  <p className="text-sm text-gray-600">Last Minter</p>
                  <p className="font-semibold">{lastMinter}</p>
                  {canClaimLastMinter && (
                    <p className="text-sm text-red-600 mt-2">
                      5 minutes passed! Anyone can claim the win now.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Buy Tickets */}
            {isActive && canInteract && (
              <div className="bg-white rounded-lg p-6 shadow">
                <h2 className="text-xl font-bold mb-4">Buy Tickets</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Tickets</label>
                    <input
                      type="number"
                      value={ticketCount}
                      onChange={(e) => setTicketCount(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      min="1"
                      max="100"
                    />
                  </div>

                  {mode === LotteryMode.TeamBased && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Team ID (0 for new team)
                      </label>
                      <input
                        type="number"
                        value={teamId}
                        onChange={(e) => setTeamId(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        min="0"
                      />
                      {userTeam && Number(userTeam) > 0 && (
                        <p className="text-sm text-gray-600 mt-1">
                          You're in team #{userTeam.toString()}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="pt-2">
                    <p className="text-sm text-gray-600 mb-2">
                      Total Cost: {formatLEI(BigInt(ticketCount || 0) * ticketPrice)} LEI
                    </p>
                    <p className="text-xs text-gray-500 mb-1">
                      Wei amount: {(BigInt(ticketCount || 0) * ticketPrice).toString()}
                    </p>
                    
                    {/* Allowance Status */}
                    <div className="text-xs mb-3 p-2 bg-gray-50 rounded">
                      <p className="text-gray-600">
                        Current Allowance: {tokenAllowance ? formatLEI(tokenAllowance) : '0'} LEI
                      </p>
                      {ticketCount && Number(ticketCount) > 0 && (
                        <p className={`mt-1 ${
                          tokenAllowance && tokenAllowance >= BigInt(ticketCount) * ticketPrice 
                            ? 'text-green-600' 
                            : 'text-orange-600'
                        }`}>
                          {tokenAllowance && tokenAllowance >= BigInt(ticketCount) * ticketPrice
                            ? '✓ Sufficient allowance'
                            : '⚠ Approval needed'}
                        </p>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-3">
                      LEI uses 18 decimals like ETH. Precise amounts supported (e.g., 5.50 LEI).
                    </p>
                    <button
                      onClick={handleBuyTickets}
                      disabled={!ticketCount || isApprovePending || isBuyPending}
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
                    >
                      {isApprovePending ? 'Approving...' : 
                       isBuyPending ? 'Buying...' : 
                       (tokenAllowance && tokenAllowance >= BigInt(ticketCount || 0) * ticketPrice) ? 'Buy Tickets' : 
                       'Approve & Buy Tickets'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Actions */}
            {canInteract && (
              <>
                {canDraw && (
                  <div className="bg-white rounded-lg p-6 shadow">
                    <h2 className="text-xl font-bold mb-4">Draw Winner</h2>
                    <p className="text-gray-600 mb-4">
                      The draw time has passed. Anyone can execute the draw.
                    </p>
                    <button
                      onClick={handleExecuteDraw}
                      disabled={isDrawPending}
                      className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                    >
                      {isDrawPending ? 'Drawing...' : 'Execute Draw'}
                    </button>
                  </div>
                )}

                {canClaimLastMinter && (
                  <div className="bg-white rounded-lg p-6 shadow">
                    <h2 className="text-xl font-bold mb-4">Claim Last Minter Win</h2>
                    <p className="text-gray-600 mb-4">
                      5 minutes have passed since the last entry. The last minter can be declared winner.
                    </p>
                    <button
                      onClick={() => claimLastMinter({
                        address: lotteryAddress as `0x${string}`,
                        abi: LotteryAbi,
                        functionName: 'claimLastMinterWin',
                        chainId: baseSepolia.id,
                      })}
                      disabled={isLastMinterPending}
                      className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                    >
                      {isLastMinterPending ? 'Claiming...' : 'Claim Last Minter Win'}
                    </button>
                  </div>
                )}

                {userPrize && userPrize > BigInt(0) && status === LotteryStatus.PaidOut && (
                  <div className="bg-white rounded-lg p-6 shadow">
                    <h2 className="text-xl font-bold mb-4">Your Prize</h2>
                    <p className="text-2xl font-bold text-green-600 mb-2">
                      {formatLEI(userPrize)} LEI
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Wei amount: {userPrize.toString()} (18 decimal precision)
                    </p>
                    <button
                      onClick={() => claimPrize({
                        address: lotteryAddress as `0x${string}`,
                        abi: LotteryAbi,
                        functionName: 'claimPrize',
                        chainId: baseSepolia.id,
                      })}
                      disabled={isClaimPending}
                      className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                    >
                      {isClaimPending ? 'Claiming...' : 'Claim Prize'}
                    </button>
                  </div>
                )}

                {userAddress === creator && status === LotteryStatus.PaidOut && (
                  <div className="bg-white rounded-lg p-6 shadow">
                    <h2 className="text-xl font-bold mb-4">Creator Actions</h2>
                    <button
                      onClick={() => claimCreatorStake({
                        address: lotteryAddress as `0x${string}`,
                        abi: LotteryAbi,
                        functionName: 'claimCreatorStake',
                        chainId: baseSepolia.id,
                      })}
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Reclaim Initial Stake
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Your Stats */}
            {userAddress && userTickets && userTickets > BigInt(0) && (
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="text-lg font-bold mb-4">Your Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tickets Owned</span>
                    <span className="font-semibold">{userTickets.toString()}</span>
                  </div>
                  {mode === LotteryMode.TeamBased && userTeam && Number(userTeam) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Team</span>
                      <span className="font-semibold">#{userTeam.toString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Winners */}
            {status === LotteryStatus.PaidOut && winners && winners.length > 0 && (
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="text-lg font-bold mb-4">Winners</h3>
                <div className="space-y-2">
                  {mainWinner && (
                    <div className="pb-2 border-b">
                      <p className="text-sm text-gray-600">Main Winner</p>
                      <p className="font-semibold text-green-600">
                        {mainWinner.slice(0, 6)}...{mainWinner.slice(-4)}
                      </p>
                    </div>
                  )}
                  {winners.length > 1 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Other Winners</p>
                      {winners.filter(w => w !== mainWinner).slice(0, 5).map((winner, i) => (
                        <p key={i} className="text-sm">
                          {winner.slice(0, 6)}...{winner.slice(-4)}
                        </p>
                      ))}
                      {winners.length > 6 && (
                        <p className="text-sm text-gray-500">
                          and {winners.length - 6} more...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Players */}
            {players && players.length > 0 && (
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="text-lg font-bold mb-4">
                  Players ({players.length})
                </h3>
                <div className="space-y-1">
                  {players.slice(0, 10).map((player, i) => (
                    <p key={i} className="text-sm text-gray-600">
                      {player.slice(0, 6)}...{player.slice(-4)}
                    </p>
                  ))}
                  {players.length > 10 && (
                    <p className="text-sm text-gray-500">
                      and {players.length - 10} more...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}