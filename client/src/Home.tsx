import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { useAuth } from './context/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white">
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
                          onClick={() => navigate('/game')}
                          className="px-8 py-4 bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-xl rounded-lg transition-all shadow-lg hover:scale-105"
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
