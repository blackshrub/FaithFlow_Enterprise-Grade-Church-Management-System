/**
 * Offline Indicator Component
 *
 * Shows a banner when the user loses internet connection.
 * Uses native browser events for reliable offline detection.
 */
import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './button';

/**
 * Hook to detect online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * OfflineIndicator - Shows banner when offline
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Track when user comes back online
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-2"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            <WifiOff className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">
              You're offline. Some features may not work correctly.
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-white hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </motion.div>
      )}

      {showReconnected && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white px-4 py-2"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <span className="text-sm font-medium">
              You're back online!
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OfflineIndicator;
