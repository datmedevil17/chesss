import { useState, useEffect, useRef } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import MoveList from './components/MoveList';
import PlayerCard from './components/PlayerCard';
import Chat from './components/Chat';

export default function Game() {
  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [optionSquares, setOptionSquares] = useState<Record<string, { background: string; borderRadius?: string }>>({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const socketRef = useRef<WebSocket | null>(null);

  // Generate a random game ID if none provided (mock matchmaking)
  const gameId = searchParams.get('id') || 'test-room'; 
  const isBot = searchParams.get('bot') === 'true';

  useEffect(() => {
    // Connect to WebSocket
    const wsUrl = `ws://localhost:8080/api/v1/game/ws/${gameId}${isBot ? '?bot=true' : ''}`;
    console.log("Connecting to", wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to game server');
    };

    ws.onmessage = (event) => {
        const msg = event.data;
        // Basic protocol: just sending move strings (LAN/SAN) or FEN for now
        // Ideally use JSON { type: 'move', data: ... }
        console.log("Received:", msg);
        
        try {
            // Attempt to apply move
             // We need to sync game state safely
             setGame((prevGame) => {
                 const g = new Chess(prevGame.fen());
                 try {
                     g.move(msg); // Try Notated move
                 } catch {
                     // If it's a raw bestmove string like "e2e4"
                     try {
                        g.move({ from: msg.slice(0,2), to: msg.slice(2,4) });
                     } catch (e2) {
                        console.error("Invalid move received", msg);
                        return prevGame;
                     }
                 }
                 setMoveHistory(g.history());
                 return g;
             });
        } catch (e) {
            console.error("Failed to parse message", e);
        }
    };

    socketRef.current = ws;

    return () => {
      ws.close();
    };
  }, [gameId, isBot]);

  // Timer logic (simplified)
  useEffect(() => {
    if (game.isGameOver()) return;
    const timer = setInterval(() => {
      if (game.turn() === 'w') setWhiteTime(t => Math.max(0, t - 1));
      else setBlackTime(t => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [game]);

  function makeAMove(move: any) {
    try {
      const g = new Chess(game.fen());
      const result = g.move(move);
      setGame(g);
      
      if (result) {
        setMoveHistory(g.history());
        setOptionSquares({});
        
        // Send move to server
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            // Send SAN (e.g. "Nf3") or UCI (e.g. "g1f3")
            // Stockfish prefers UCI "fromto". Chess.js move object has it.
           const uci = result.from + result.to + (result.promotion || '');
           socketRef.current.send(uci);
        }

        return result; 
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  function onDrop(sourceSquare: string, targetSquare: string | null) {
    if (!targetSquare) return false;
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    });
    return move !== null;
  }

  function getMoveOptions(square: Square) {
    const moves = game.moves({
      square,
      verbose: true,
    });
    if (moves.length === 0) {
      setOptionSquares({});
      return;
    }

    const newSquares: Record<string, { background: string; borderRadius?: string }> = {};
    moves.map((move: any) => {
      const targetSquare = move.to as Square;
      const targetPiece = game.get(targetSquare);
      const sourcePiece = game.get(square);
      
      newSquares[move.to] = {
        background:
          targetPiece && sourcePiece && targetPiece.color !== sourcePiece.color
            ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%',
      };
      return move;
    });
    newSquares[square] = {
      background: 'rgba(255, 255, 0, 0.4)',
    };
    setOptionSquares(newSquares);
  }

  function onSquareClick({ square }: { square: string }) {
    getMoveOptions(square as Square);
  }

  function resetGame() {
    setGame(new Chess());
    setMoveHistory([]);
    setWhiteTime(600);
    setBlackTime(600);
    setOptionSquares({});
    // Should probably reconnect to new game ID
  }

  const isGameOver = game.isGameOver();
  const gameStatus = isGameOver 
    ? (game.isCheckmate() ? "Checkmate" : "Draw") 
    : (game.inCheck() ? "Check!" : "Active");

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-7xl flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>
        <div className="text-xl font-bold text-neutral-200 flex items-center gap-4">
           <span>{isBot ? "Vs Stockfish" : "Online Match"}</span>
           <span className="text-xs bg-neutral-800 px-2 py-1 rounded text-neutral-400">10 min</span>
        </div>
        <div className="w-24"></div> 
      </div>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-start h-[800px]">
        <div className="flex flex-col h-full gap-4 order-2 lg:order-1 lg:h-[600px] w-full lg:w-80">
           <PlayerCard 
              name={isBot ? "Stockfish 16" : "Opponent"} 
              rating={isBot ? 3000 : 1200} 
              time={blackTime} 
              isActive={game.turn() === 'b' && !isGameOver}
              isBlack
           />
           <div className="flex-1 min-h-[300px]">
             <Chat />
           </div>
           <PlayerCard 
              name="You" 
              rating={1200} 
              time={whiteTime} 
              isActive={game.turn() === 'w' && !isGameOver}
           />
        </div>

        <div className="order-1 lg:order-2 flex flex-col items-center">
          <div className="bg-neutral-800 p-2 rounded-lg shadow-2xl shadow-black/50 border border-neutral-700">
            <div className="w-[350px] md:w-[600px] aspect-square">
              <Chessboard 
                  {...({ position: game.fen() } as any)}
                  onPieceDrop={onDrop}
                  onSquareClick={onSquareClick}
                  customSquareStyles={optionSquares}
                  customDarkSquareStyle={{ backgroundColor: '#779954' }}
                  customLightSquareStyle={{ backgroundColor: '#e9edcc' }}
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-4">
             <div className={`
               px-4 py-2 rounded font-bold text-white
               ${gameStatus === 'Checkmate' ? 'bg-red-600' : 
                 gameStatus === 'Check!' ? 'bg-amber-600' : 'bg-neutral-800'}
             `}>
               {gameStatus}
             </div>
          </div>
        </div>

        <div className="flex flex-col h-full gap-4 order-3 lg:order-3 lg:h-[600px] w-full lg:w-80">
          <div className="flex-1">
            <MoveList moves={moveHistory} />
          </div>
          <button
            onClick={resetGame}
            className="w-full py-4 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all hover:translate-y-[-2px] active:translate-y-0"
          >
            <RefreshCw size={20} />
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}
