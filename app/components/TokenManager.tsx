'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { LEITokenAbi, leiTokenContract } from '../lib/LEIToken';
import { LOTTERY_FACTORY_ADDRESS } from '../lib/LotteryFactory';

interface Allowance {
  spender: string;
  name: string;
  amount: bigint;
}

export function TokenManager() {
  const { address, isConnected } = useAccount();
  const [approvalAmount, setApprovalAmount] = useState('1000');
  const [selectedSpender, setSelectedSpender] = useState<string>(LOTTERY_FACTORY_ADDRESS);
  const [mintString, setMintString] = useState('');
  const [customSpender, setCustomSpender] = useState('');
  const [showCustomSpender, setShowCustomSpender] = useState(false);

  // Read token data
  const { data: balance } = useReadContract({
    address: leiTokenContract,
    abi: LEITokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: totalSupply } = useReadContract({
    address: leiTokenContract,
    abi: LEITokenAbi,
    functionName: 'totalSupply',
  });

  const { data: mintedSupply } = useReadContract({
    address: leiTokenContract,
    abi: LEITokenAbi,
    functionName: 'mintedSupply',
  });

  const { data: remainingSupply } = useReadContract({
    address: leiTokenContract,
    abi: LEITokenAbi,
    functionName: 'remainingSupply',
  });

  // Check allowances
  const { data: factoryAllowance } = useReadContract({
    address: leiTokenContract,
    abi: LEITokenAbi,
    functionName: 'allowance',
    args: address ? [address, LOTTERY_FACTORY_ADDRESS] : undefined,
  });

  // Check if mint string is used
  const { data: isMintStringUsed } = useReadContract({
    address: leiTokenContract,
    abi: LEITokenAbi,
    functionName: 'isStringUsed',
    args: mintString ? [mintString] : undefined,
  });

  // Write functions
  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { writeContract: mint, data: mintHash } = useWriteContract();

  const { isLoading: isApproving } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isMinting } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  // Handle approval
  const handleApprove = async () => {
    if (!address) return;
    
    const spender = showCustomSpender && customSpender ? customSpender : selectedSpender;
    
    try {
      await approve({
        address: leiTokenContract,
        abi: LEITokenAbi,
        functionName: 'approve',
        args: [spender as `0x${string}`, parseEther(approvalAmount)],
      });
    } catch (error) {
      console.error('Approval error:', error);
    }
  };

  // Handle minting
  const handleMint = async () => {
    if (!address || !mintString || !mintString.includes('Bo')) return;
    
    try {
      await mint({
        address: leiTokenContract,
        abi: LEITokenAbi,
        functionName: 'mintWithString',
        args: [mintString],
      });
      setMintString(''); // Clear on success
    } catch (error) {
      console.error('Minting error:', error);
    }
  };

  // Calculate mint reward
  const calculateMintReward = () => {
    if (!remainingSupply) return '0';
    const reward = remainingSupply / 100n;
    return formatEther(reward);
  };

  if (!isConnected) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">LEI Token Manager</h2>
        <p className="text-gray-500 dark:text-gray-400">Connect your wallet to manage LEI tokens</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">LEI Token Manager</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Token Contract: <a href={`https://sepolia.basescan.org/address/${leiTokenContract}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline font-mono text-xs">
            {leiTokenContract}
          </a>
        </p>
      </div>

      {/* Balance & Supply Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Your Balance</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{balance ? formatEther(balance) : '0'} LEI</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Supply</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{totalSupply ? formatEther(totalSupply) : '0'} LEI</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Minted</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{mintedSupply ? formatEther(mintedSupply) : '0'} LEI</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{remainingSupply ? formatEther(remainingSupply) : '0'} LEI</p>
        </div>
      </div>

      {/* Mint with String */}
      <div className="border-t dark:border-gray-700 pt-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Mint LEI Tokens</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Enter a unique string containing "Bo" to mint tokens. You'll receive 1% of the remaining supply ({calculateMintReward()} LEI).
        </p>
        
        <div className="flex gap-3">
          <input
            type="text"
            value={mintString}
            onChange={(e) => setMintString(e.target.value)}
            placeholder='e.g., "I love Bo!" or "Bo is awesome"'
            className="flex-1 px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={30}
          />
          <button
            onClick={handleMint}
            disabled={!mintString || !mintString.includes('Bo') || isMinting || mintString.length > 30}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isMinting ? 'Minting...' : 'Mint'}
          </button>
        </div>
        
        {mintString && (
          <div className="mt-2 text-sm">
            {!mintString.includes('Bo') && (
              <p className="text-red-500">String must contain "Bo"</p>
            )}
            {mintString.length > 30 && (
              <p className="text-red-500">String too long (max 30 characters)</p>
            )}
            {isMintStringUsed && (
              <p className="text-red-500">This string has already been used</p>
            )}
            {mintString.includes('Bo') && mintString.length <= 30 && !isMintStringUsed && (
              <p className="text-green-500">Valid string! You'll receive {calculateMintReward()} LEI</p>
            )}
          </div>
        )}
      </div>

      {/* Approval Management */}
      <div className="border-t dark:border-gray-700 pt-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Approval Management</h3>
        
        {/* Current Allowances */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Allowances:</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Lottery Factory</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{LOTTERY_FACTORY_ADDRESS}</p>
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">{factoryAllowance ? formatEther(factoryAllowance) : '0'} LEI</p>
            </div>
          </div>
        </div>

        {/* Approve New */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <select
              value={showCustomSpender ? 'custom' : selectedSpender}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setShowCustomSpender(true);
                } else {
                  setShowCustomSpender(false);
                  setSelectedSpender(e.target.value);
                }
              }}
              className="px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={LOTTERY_FACTORY_ADDRESS}>Lottery Factory</option>
              <option value="custom">Custom Address...</option>
            </select>
            
            {showCustomSpender && (
              <input
                type="text"
                value={customSpender}
                onChange={(e) => setCustomSpender(e.target.value)}
                placeholder="0x..."
                className="flex-1 px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            )}
          </div>

          <div className="flex gap-3">
            <input
              type="number"
              value={approvalAmount}
              onChange={(e) => setApprovalAmount(e.target.value)}
              placeholder="Amount to approve"
              className="flex-1 px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="100"
            />
            <button
              onClick={handleApprove}
              disabled={!approvalAmount || Number(approvalAmount) <= 0 || isApproving}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </button>
          </div>

          {/* Quick Approve Buttons */}
          <div className="flex gap-2 flex-wrap">
            <p className="text-sm text-gray-600 dark:text-gray-400 w-full">Quick amounts:</p>
            {['100', '500', '1000', '5000', '10000'].map((amount) => (
              <button
                key={amount}
                onClick={() => setApprovalAmount(amount)}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded transition-colors"
              >
                {amount} LEI
              </button>
            ))}
            <button
              onClick={() => setApprovalAmount('999999999')}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded transition-colors"
            >
              Max
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">💡 How LEI Token Works</h4>
        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
          <li>• Mint tokens by providing unique strings containing "Bo" (max 30 chars)</li>
          <li>• Each mint gives you 1% of the remaining unminted supply</li>
          <li>• Approve tokens before creating lotteries or buying tickets</li>
          <li>• LEI uses 18 decimal places like ETH (1 LEI = 1e18 wei)</li>
        </ul>
      </div>
    </div>
  );
} 