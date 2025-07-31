'use client';

import { useParams } from 'next/navigation';
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet";
import { Address, Avatar, EthBalance, Identity, Name } from "@coinbase/onchainkit/identity";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";
import { formatEther, parseEther } from "viem";
import { LotteryAbi, LotteryMode, LotteryStatus, getModeName, getStatusName } from "../../lib/Lottery";
import { LEITokenAbi, leiTokenContract } from "../../lib/LEIToken";
import Link from "next/link";

export default function LotteryDetailPage() {
  const params = useParams();
  const lotteryAddress = params.address as string;
  const { address: userAddress } = useAccount();
  
  const [ticketCount, setTicketCount] = useState("1");
  const [teamId, setTeamId] = useState("0");
  const [isApproving, setIsApproving] = useState(false);

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
    args: userAddress ? [userAddress] : undefined,
  });

  // Read user team
  const { data: userTeam } = useReadContract({
    address: lotteryAddress as `0x${string}`,
    abi: LotteryAbi,
    functionName: 'playerTeam',
    args: userAddress ? [userAddress] : undefined,
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
    args: userAddress ? [userAddress] : undefined,
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

  const handleBuyTickets = async () => {
    if (!userAddress || !ticketCount) return;

    try {
      const totalCost = BigInt(ticketCount) * ticketPrice;
      
      // First approve
      setIsApproving(true);
      await approve({
        address: leiTokenContract,
        abi: LEITokenAbi,
        functionName: 'approve',
        args: [lotteryAddress as `0x${string}`, totalCost],
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
      // Now buy tickets
      if (mode === LotteryMode.TeamBased) {
        buyTickets({
          address: lotteryAddress as `0x${string}`,
          abi: LotteryAbi,
          functionName: 'buyTicketsForTeam',
          args: [BigInt(ticketCount), BigInt(teamId)],
        });
      } else {
        buyTickets({
          address: lotteryAddress as `0x${string}`,
          abi: LotteryAbi,
          functionName: 'buyTickets',
          args: [BigInt(ticketCount)],
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
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold hover:text-blue-600">
            LEI Lottery Hub
          </Link>
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
                  <p className="text-2xl font-bold">{formatEther(totalPot)} LEI</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Ticket Price</p>
                  <p className="text-2xl font-bold">{formatEther(ticketPrice)} LEI</p>
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
            {isActive && userAddress && (
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
                      Total Cost: {formatEther(BigInt(ticketCount || 0) * ticketPrice)} LEI
                    </p>
                    <button
                      onClick={handleBuyTickets}
                      disabled={!ticketCount || isApprovePending || isBuyPending}
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
                    >
                      {isApprovePending ? 'Approving...' : isBuyPending ? 'Buying...' : 'Buy Tickets'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Actions */}
            {userAddress && (
              <>
                {canDraw && (
                  <div className="bg-white rounded-lg p-6 shadow">
                    <h2 className="text-xl font-bold mb-4">Draw Winner</h2>
                    <p className="text-gray-600 mb-4">
                      The draw time has passed. Anyone can execute the draw.
                    </p>
                    <button
                      onClick={() => executeDraw({
                        address: lotteryAddress as `0x${string}`,
                        abi: LotteryAbi,
                        functionName: 'executeDraw',
                      })}
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
                    <p className="text-2xl font-bold text-green-600 mb-4">
                      {formatEther(userPrize)} LEI
                    </p>
                    <button
                      onClick={() => claimPrize({
                        address: lotteryAddress as `0x${string}`,
                        abi: LotteryAbi,
                        functionName: 'claimPrize',
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
      </main>
    </div>
  );
} 