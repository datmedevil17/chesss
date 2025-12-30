import { useState, useEffect, useRef } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Crown } from 'lucide-react';
import MoveList from './components/MoveList';
import PlayerCard from './components/PlayerCard';
import Chat from './components/Chat';
import { useAuth } from './context/AuthContext';

export default function Game() {
  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [status, setStatus] = useState("Connecting...");
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [optionSquares, setOptionSquares] = useState<Record<string, { background: string; borderRadius?: string }>>({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const socketRef = useRef<WebSocket | null>(null);
  const { token } = useAuth();

  // Generate a random game ID if none provided (mock matchmaking)
  const gameId = searchParams.get('id') || 'test-room'; 
  const isBot = searchParams.get('bot') === 'true';
  const [playerColor, setPlayerColor] = useState(searchParams.get('color') || 'white'); 


  useEffect(() => {
    // Connect to WebSocket
    const wsUrl = `ws://localhost:8080/api/v1/game/ws/${gameId}?token=${token}${isBot ? '&bot=true' : ''}`;
    console.log("Connecting to", wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to game server');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log("WS Data:", data);

            switch (data.type) {
                case 'init':
                    // Initialize game state
                    const { fen, history, color, status } = data.payload;
                    const newGame = new Chess(fen);
                    setGame(newGame);
                    if (color) setPlayerColor(color);
                    setMoveHistory(history || []);
                    if (status) setStatus(status === 'active' ? 'Active' : 'Waiting for opponent');
                    break;

                case 'move':
                    // Handle opponent move
                    const moveStr = data.payload; // UCI string e.g. "e2e4"
                    setGame((prevGame) => {
                        const g = new Chess(prevGame.fen());
                        try {
                           // Try raw move first (San)
                           g.move(moveStr);
                        } catch {
                           try {
                             // Try UCI
                             g.move({ from: moveStr.slice(0,2), to: moveStr.slice(2,4), promotion: moveStr.length > 4 ? moveStr[4] : 'q' });
                           } catch (e) {
                             console.error("Invalid move", moveStr);
                             return prevGame;
                           }
                        }
                        setMoveHistory(g.history());
                        return g;
                    });
                    break;

                case 'chat':
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        sender: data.payload.sender, // "white" or "black"
                        text: data.payload.text,
                        timestamp: new Date(),
                        isSystem: false
                    }]);
                    break;
            }
        } catch (e) {
            console.error("Failed to parse WS message", e);
        }
    };

    socketRef.current = ws;

    return () => {
      ws.close();
    };
  }, [gameId, isBot, token]);

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
      
      if (result) {
        setGame(g);
        setMoveHistory(g.history());
        setOptionSquares({});
        
        // Send move to server
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
           const uci = result.from + result.to + (result.promotion || '');
           console.log("Sending move:", uci);
           socketRef.current.send(JSON.stringify({
               type: 'move',
               payload: uci
           }));
        } else {
            console.error("Socket not connected or not open");
        }

        return result; 
      } else {
          console.warn("Move invalid in chess.js:", move);
      }
    } catch (e) {
      console.error("makeAMove error:", e);
      return null;
    }
    return null;
  }

  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  function addLog(msg: string) {
      setDebugLogs(prev => [msg, ...prev].slice(0, 5));
      console.log(msg);
  }

  useEffect(() => {
    addLog(`Status: ${status} | Color: ${playerColor} | Turn: ${game.turn()}`);
  }, [status, playerColor, game]);

  function onDrop({ sourceSquare, targetSquare }: { sourceSquare: string, targetSquare: string | null }) {
    addLog(`Drop: ${sourceSquare}->${targetSquare}`);
    
    // Prevent moving if not my turn
    const currentTurnColor = game.turn() === 'w' ? 'white' : 'black';
    if (currentTurnColor !== playerColor) {
        addLog(`Ignored: Not your turn (Turn: ${currentTurnColor})`);
        return false;
    }

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
    console.log("onSquareClick:", square);
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

  useEffect(() => {
    console.log("Game Render - Status:", status, "FEN:", game.fen(), "MyColor:", playerColor);
  }, [status, game, playerColor]);

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
             <Chat messages={messages} onSendMessage={(text) => {
                if (socketRef.current) {
                    socketRef.current.send(JSON.stringify({
                        type: 'chat',
                        payload: { text }
                    }));
                }
             }} />
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
            <div 
                className="w-[350px] md:w-[600px] aspect-square relative block"
            >
              <Chessboard 
                  options={{
                    position: game.fen(),
                    onPieceDrop: onDrop,
                    onSquareClick: onSquareClick,
                    onPieceClick: ({ piece }) => addLog(`Piece Click: ${piece.pieceType}`),
                    squareStyles: optionSquares,
                    darkSquareStyle: { backgroundColor: '#779954' },
                    lightSquareStyle: { backgroundColor: '#e9edcc' },
                    boardOrientation: playerColor === 'black' ? 'black' : 'white',
                    allowDragging: true,
                  }}
              />
              {status !== 'Active' && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-lg z-10" onClick={() => addLog("Overlay Clicked")}>
                      <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in">
                          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                          <div className="text-xl font-bold text-white">{status}</div>
                          {status === 'Waiting for opponent' && (
                              <div className="text-sm text-neutral-400">Share this URL to invite a friend</div>
                          )}
                      </div>
                  </div>
              )}
              {isGameOver && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-20 animate-in fade-in zoom-in">
                      <div className="bg-neutral-800 p-8 rounded-2xl border border-amber-500/20 shadow-2xl flex flex-col items-center gap-6 text-center">
                          <Crown size={48} className="text-amber-500" />
                          <div>
                              <div className="text-4xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent mb-2">
                                  {game.isCheckmate() 
                                      ? (game.turn() === (playerColor === 'white' ? 'b' : 'w') ? "VICTORY" : "DEFEAT") 
                                      : "DRAW"}
                              </div>
                              <div className="text-neutral-400">
                                  {game.isCheckmate() 
                                      ? `by Checkmate` 
                                      : `by ${game.isDraw() ? 'Insufficient Material' : 'Stalemate'}`}
                              </div>
                          </div>
                          <button 
                            onClick={resetGame}
                            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-transform hover:scale-105"
                          >
                            Play Again
                          </button>
                      </div>
                  </div>
              )}
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
