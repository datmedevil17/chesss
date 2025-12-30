import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Tv, X, Zap, Timer, Clock, Swords } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import api from './api/client';

// Game mode categories with their time controls
const GAME_MODE_CATEGORIES = [
  { 
    id: 'bullet', 
    name: 'Bullet', 
    icon: Zap, 
    description: 'Fast & furious',
    color: 'text-red-500', 
    bgColor: 'bg-red-500/20', 
    borderColor: 'border-red-500/50',
    hoverColor: 'hover:border-red-400',
    options: [
      { timeControl: '1+0', seconds: 60 },
      { timeControl: '2+1', seconds: 120 },
    ]
  },
  { 
    id: 'blitz', 
    name: 'Blitz', 
    icon: Timer, 
    description: 'Quick thinking',
    color: 'text-yellow-500', 
    bgColor: 'bg-yellow-500/20', 
    borderColor: 'border-yellow-500/50',
    hoverColor: 'hover:border-yellow-400',
    options: [
      { timeControl: '3+0', seconds: 180 },
      { timeControl: '5+0', seconds: 300 },
    ]
  },
  { 
    id: 'rapid', 
    name: 'Rapid', 
    icon: Clock, 
    description: 'Deep strategy',
    color: 'text-green-500', 
    bgColor: 'bg-green-500/20', 
    borderColor: 'border-green-500/50',
    hoverColor: 'hover:border-green-400',
    options: [
      { timeControl: '10+0', seconds: 600 },
      { timeControl: '15+10', seconds: 900 },
    ]
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [gameLink, setGameLink] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<typeof GAME_MODE_CATEGORIES[0] | null>(null);
  const pollRef = useRef<any>(null);

  async function handleFindMatch(mode: string, timeControl: string) {
      setShowPlayModal(false);
      setIsSearching(true);
      try {
          // Join queue with selected mode
          await api.post('/matchmaking/join', {
              mode: mode.toLowerCase(),
              time_control: timeControl,
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

  function handleWatchStream() {
      // Extract game ID from link or use as-is
      let gameId = gameLink.trim();
      // If user pasted a full URL, extract the id parameter
      if (gameId.includes('id=')) {
          const match = gameId.match(/id=([^&]+)/);
          if (match) gameId = match[1];
      }
      if (gameId) {
          setShowStreamModal(false);
          setGameLink('');
          navigate(`/game?id=${gameId}`);
      }
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white relative">
      {/* Play Online Modal */}
      {showPlayModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-neutral-800 p-8 rounded-2xl border border-neutral-700 shadow-2xl flex flex-col items-center gap-6 animate-in fade-in zoom-in w-[480px] relative">
                  <button 
                      onClick={() => { setShowPlayModal(false); setSelectedCategory(null); }}
                      className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
                  >
                      <X size={20} />
                  </button>
                  <div className="flex items-center gap-3">
                      <Swords size={32} className="text-amber-500" />
                      <h2 className="text-2xl font-bold text-white">Select Game Mode</h2>
                  </div>
                  
                  {!selectedCategory ? (
                    // Step 1: Choose category
                    <div className="grid grid-cols-3 gap-4 w-full">
                      {GAME_MODE_CATEGORIES.map((category) => {
                        const Icon = category.icon;
                        return (
                          <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category)}
                            className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${category.bgColor} ${category.borderColor} ${category.hoverColor} hover:scale-105`}
                          >
                            <Icon size={40} className={category.color} />
                            <span className={`text-xl font-bold ${category.color}`}>{category.name}</span>
                            <span className="text-xs text-neutral-400">{category.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    // Step 2: Choose time control
                    <>
                      <button 
                        onClick={() => setSelectedCategory(null)}
                        className="text-neutral-400 hover:text-white text-sm flex items-center gap-1"
                      >
                        ← Back to modes
                      </button>
                      <div className={`flex items-center gap-2 ${selectedCategory.color}`}>
                        {(() => { const Icon = selectedCategory.icon; return <Icon size={24} />; })()}
                        <span className="text-xl font-bold">{selectedCategory.name}</span>
                      </div>
                      <div className="flex gap-4 w-full">
                        {selectedCategory.options.map((option) => (
                          <button
                            key={option.timeControl}
                            onClick={() => handleFindMatch(selectedCategory.name, option.timeControl)}
                            className={`flex-1 py-6 px-4 rounded-xl border-2 transition-all text-center ${selectedCategory.bgColor} ${selectedCategory.borderColor} ${selectedCategory.hoverColor} hover:scale-105`}
                          >
                            <span className={`text-3xl font-bold ${selectedCategory.color}`}>{option.timeControl}</span>
                            <p className="text-sm text-neutral-400 mt-2">
                              {Math.floor(option.seconds / 60)} min{option.timeControl.includes('+') ? ' + ' + option.timeControl.split('+')[1] + 's' : ''}
                            </p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
              </div>
          </div>
      )}

      {/* Stream Modal */}
      {showStreamModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-neutral-800 p-8 rounded-2xl border border-neutral-700 shadow-2xl flex flex-col items-center gap-6 animate-in fade-in zoom-in w-96 relative">
                  <button 
                      onClick={() => setShowStreamModal(false)}
                      className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
                  >
                      <X size={20} />
                  </button>
                  <div className="flex items-center gap-3">
                      <Tv size={32} className="text-purple-500" />
                      <h2 className="text-2xl font-bold text-white">Watch a Game</h2>
                  </div>
                  <p className="text-neutral-400 text-center">Enter a game link or ID to spectate</p>
                  <input
                      type="text"
                      value={gameLink}
                      onChange={(e) => setGameLink(e.target.value)}
                      placeholder="Game ID or URL"
                      className="w-full px-4 py-3 bg-neutral-900 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
                      onKeyDown={(e) => e.key === 'Enter' && handleWatchStream()}
                  />
                  <button 
                      onClick={handleWatchStream}
                      className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-all"
                  >
                      Watch Stream
                  </button>
              </div>
          </div>
      )}

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
                          onClick={() => setShowPlayModal(true)}
                          className="px-8 py-4 bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-xl rounded-lg transition-all shadow-lg hover:scale-105 flex items-center gap-2"
                        >
                          <Swords size={24} />
                          PLAY ONLINE
                        </button>
                        <button
                          onClick={() => setShowStreamModal(true)}
                          className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xl rounded-lg transition-all shadow-lg hover:scale-105 flex items-center gap-2"
                        >
                          <Tv size={24} />
                          WATCH STREAM
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

