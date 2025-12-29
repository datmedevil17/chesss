import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import api from './api/client';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const pollRef = useRef<any>(null);

  async function handleFindMatch() {
      setIsSearching(true);
      try {
          // Join queue
          await api.post('/matchmaking/join', {
              mode: 'rapid',
              time_control: '10+0',
              rating: 1200
          });
          
          // Poll for active match
          pollRef.current = setInterval(async () => {
              try {
                  const res = await api.get('/matchmaking/active');
                  if (res.data.success && res.data.data) {
                      const { game_id, color } = res.data.data;
                      if (pollRef.current) clearInterval(pollRef.current);
                      navigate(`/game?id=${game_id}&color=${color}`);
                  }
              } catch (e) {
                  // Keep polling
              }
          }, 2000);

          // Stop polling after 60 seconds (timeout)
          setTimeout(() => {
              if (pollRef.current) clearInterval(pollRef.current);
              setIsSearching(false);
          }, 60000);

      } catch (e) {
          console.error("Matchmaking failed", e);
          setIsSearching(false);
      }
  }

  async function handleLeaveQueue() {
      if (pollRef.current) clearInterval(pollRef.current);
      try {
          await api.post('/matchmaking/leave');
      } catch (e) {
          console.error("Failed to leave queue", e);
      } finally {
          setIsSearching(false);
      }
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white relative">
      {isSearching && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-neutral-800 p-8 rounded-2xl border border-neutral-700 shadow-2xl flex flex-col items-center gap-6 animate-in fade-in zoom-in">
                  <div className="relative">
                      <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                          <Crown size={24} className="text-amber-500/50" />
                      </div>
                  </div>
                  <div className="text-center">
                      <h2 className="text-2xl font-bold text-white mb-2">Finding Opponent</h2>
                      <p className="text-neutral-400">Waiting for other players to join lobby...</p>
                  </div>
                  <button 
                      onClick={handleLeaveQueue}
                      className="px-6 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-600/50 hover:border-red-500 font-bold rounded-lg transition-all"
                  >
                      Leave Queue
                  </button>
              </div>
          </div>
      )}

      <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center gap-4">
          <Crown size={64} className="text-amber-500" />
          <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
            MASTER CHESS
          </h1>
          <p className="text-neutral-400 text-xl">
            Experience the royal game in its purest form
          </p>
        </div>

        <div className="flex flex-col gap-4 items-center">
            {isAuthenticated ? (
                <>
                    <div className="text-lg">Welcome back, <span className="text-amber-500 font-bold">{user?.username}</span></div>
                    <div className="flex gap-4">
                        <button
                          onClick={() => navigate('/game?bot=true')}
                          className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xl rounded-lg transition-all shadow-lg hover:scale-105"
                        >
                          PLAY STOCKFISH
                        </button>
                        <button
                          onClick={handleFindMatch}
                          className="px-8 py-4 bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-xl rounded-lg transition-all shadow-lg hover:scale-105 flex items-center gap-2"
                        >
                          PLAY ONLINE
                        </button>
                    </div>
                </>
            ) : (
                <div className="flex gap-4">
                    <button
                      onClick={() => navigate('/login')}
                      className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xl rounded-lg transition-all shadow-lg hover:scale-105"
                    >
                      LOGIN
                    </button>
                    <button
                      onClick={() => navigate('/register')}
                      className="px-8 py-4 bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-xl rounded-lg transition-all shadow-lg hover:scale-105"
                    >
                      REGISTER
                    </button>
                </div>
            )}
        </div>
      </div>

      <footer className="absolute bottom-8 text-neutral-500 text-sm">
        Professional Chess Interface
      </footer>
    </div>
  );
}
