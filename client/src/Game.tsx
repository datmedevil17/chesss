import { useState, useEffect, useRef, useMemo } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Crown, Share2, LogOut, Flag } from 'lucide-react';
import MoveList from './components/MoveList';
import PlayerCard from './components/PlayerCard';
import Chat from './components/Chat';
import { useAuth } from './context/AuthContext';
// @ts-ignore - js-chess-engine doesn't have types
import { Game as ChessAI } from 'js-chess-engine';

export default function Game() {
  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [status, setStatus] = useState("Connecting...");
  
  // Timestamp-based clock state (server values)
  const [frozenWhiteTime, setFrozenWhiteTime] = useState(600);
  const [frozenBlackTime, setFrozenBlackTime] = useState(600);
  const [lastMoveAt, setLastMoveAt] = useState(Date.now());
  const [currentTurn, setCurrentTurn] = useState<'white' | 'black'>('white');
  
  // Displayed times - perspective-based (computed from player's view)
  const [myTime, setMyTime] = useState(600);
  const [opponentTime, setOpponentTime] = useState(600);
  
  const [optionSquares, setOptionSquares] = useState<Record<string, { background: string; borderRadius?: string }>>({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const socketRef = useRef<WebSocket | null>(null);
  const { token } = useAuth();

  // Check if this is a bot game
  const isBot = searchParams.get('bot') === 'true';
  
  // Generate a stable game ID - use useMemo to prevent regeneration on re-renders
  const gameId = useMemo(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl) return idFromUrl;
    // For bot games, generate a unique ID to prevent spectators
    if (isBot) return `bot-${crypto.randomUUID()}`;
    return 'test-room';
  }, [searchParams, isBot]);
  const [playerColor, setPlayerColor] = useState(searchParams.get('color') || 'white');
  const [isSpectator, setIsSpectator] = useState(false);
  const [whiteName, setWhiteName] = useState('White Player');
  const [blackName, setBlackName] = useState('Black Player');
  const [gameResult, setGameResult] = useState<{ winner: string; reason: string } | null>(null);
  const lastSentMoveRef = useRef<string | null>(null); // Track last move we sent to skip echo
  const aiEngineRef = useRef<any>(null); // Reference to AI engine for bot games
  const AI_GAME_KEY = 'chess_ai_game';
  const aiGameInitialized = useRef(false);

  // Helper to clear AI game from localStorage
  const clearAIGameStorage = () => {
    localStorage.removeItem(AI_GAME_KEY);
    console.log('AI game cleared from localStorage');
  };

  // Helper to save AI game to localStorage
  const saveAIGame = (fen: string, history: string[]) => {
    if (!isBot) return;
    const gameState = { fen, history };
    localStorage.setItem(AI_GAME_KEY, JSON.stringify(gameState));
    console.log('AI game saved to localStorage:', fen);
  };

  // Initialize AI engine for bot games + restore from localStorage
  useEffect(() => {
    if (isBot) {
      aiEngineRef.current = new ChessAI();
      setStatus('Active');
      setPlayerColor('white'); // Player is always white vs AI
      
      // Try to restore saved game
      const saved = localStorage.getItem(AI_GAME_KEY);
      if (saved) {
        try {
          const { fen, history } = JSON.parse(saved);
          console.log('Restoring AI game from localStorage:', fen, history);
          const restoredGame = new Chess(fen);
          setGame(restoredGame);
          setMoveHistory(history || []);
          setCurrentTurn(restoredGame.turn() === 'w' ? 'white' : 'black');
          console.log('AI game restored successfully');
        } catch (e) {
          console.error('Failed to restore AI game:', e);
          clearAIGameStorage();
        }
      }
      
      // Mark as initialized AFTER restoring
      aiGameInitialized.current = true;
      console.log('AI Engine initialized for bot game');
    }
  }, [isBot]);

  // AI move effect - triggers when game changes and it's AI's turn
  useEffect(() => {
    if (!isBot || game.isGameOver() || gameResult) return;
    if (!aiGameInitialized.current) return; // Wait for initialization
    
    // Only make AI move if it's black's turn
    if (game.turn() !== 'b') return;

    console.log('AI thinking... Current FEN:', game.fen());
    
    const timeoutId = setTimeout(() => {
      try {
        // Create fresh AI engine with current position
        const aiEngine = new ChessAI(game.fen());
        
        // Get AI move (difficulty 2 = medium)
        const aiMove = aiEngine.aiMove(2);
        console.log('AI calculated move:', aiMove);
        
        // aiMove is like { E7: 'E5' } - convert to chess.js format
        const fromSquare = Object.keys(aiMove)[0];
        const toSquare = aiMove[fromSquare];
        
        if (fromSquare && toSquare) {
          const g = new Chess(game.fen());
          const result = g.move({
            from: fromSquare.toLowerCase(),
            to: toSquare.toLowerCase(),
            promotion: 'q' // Always promote to queen
          });
          
          if (result) {
            setGame(g);
            setMoveHistory(g.history());
            setCurrentTurn('white');
            console.log('AI moved:', result.san);
            // Save after AI move
            saveAIGame(g.fen(), g.history());
          } else {
            console.error('AI move was invalid:', fromSquare, toSquare);
          }
        }
      } catch (e) {
        console.error('AI move failed:', e);
      }
    }, 500); // Small delay to feel more natural
    
    return () => clearTimeout(timeoutId);
  }, [isBot, game, gameResult]);

  // WebSocket connection for online games only (not bot games)
  useEffect(() => {
    // Skip WebSocket for bot games - AI runs locally
    if (isBot) return;

    // Connect to WebSocket
    const wsUrl = `ws://localhost:8080/api/v1/game/ws/${gameId}?token=${token}`;
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
                    const { fen, history, color, status, white_time, black_time, last_move_at, current_turn, white_name, black_name } = data.payload;
                    const newGame = new Chess(fen);
                    
                    // Replay move history to reconstruct board state
                    if (history && history.length > 0) {
                        for (const uciMove of history) {
                            try {
                                // Try UCI format (e2e4)
                                const from = uciMove.slice(0, 2);
                                const to = uciMove.slice(2, 4);
                                const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
                                newGame.move({ from, to, promotion });
                            } catch (e) {
                                console.error("Failed to replay move:", uciMove, e);
                            }
                        }
                        console.log("Replayed", history.length, "moves. FEN:", newGame.fen());
                    }
                    
                    setGame(newGame);
                    if (color) {
                        setPlayerColor(color);
                        setIsSpectator(color === 'spectator');
                    }
                    setMoveHistory(newGame.history()); // Use game's history for SAN notation
                    if (status) setStatus(status === 'active' ? 'Active' : 'Waiting for opponent');
                    
                    // Set player names
                    if (white_name) setWhiteName(white_name);
                    if (black_name) setBlackName(black_name);
                    
                    // Set frozen times and clock state from server
                    if (white_time !== undefined) setFrozenWhiteTime(white_time);
                    if (black_time !== undefined) setFrozenBlackTime(black_time);
                    if (last_move_at !== undefined) setLastMoveAt(last_move_at);
                    if (current_turn) setCurrentTurn(current_turn);
                    console.log("Clock init - White:", white_time, "Black:", black_time, "LastMove:", last_move_at, "Turn:", current_turn);
                    break;

                case 'move':
                    // Handle opponent move - payload is now {move, white_time, black_time}
                    const movePayload = data.payload;
                    const moveStr = typeof movePayload === 'string' ? movePayload : movePayload.move;
                    
                    // Skip if this is our own move echoed back (we already applied it locally)
                    if (lastSentMoveRef.current === moveStr) {
                        lastSentMoveRef.current = null; // Clear it
                        // Still sync frozen times from server even for our own move
                        if (typeof movePayload === 'object') {
                            if (movePayload.white_time !== undefined) setFrozenWhiteTime(movePayload.white_time);
                            if (movePayload.black_time !== undefined) setFrozenBlackTime(movePayload.black_time);
                            if (movePayload.last_move_at !== undefined) setLastMoveAt(movePayload.last_move_at);
                            if (movePayload.current_turn) setCurrentTurn(movePayload.current_turn);
                        }
                        break;
                    }
                    
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
                    
                    // Sync clock state from server (frozen times + timestamp)
                    if (typeof movePayload === 'object') {
                        if (movePayload.white_time !== undefined) setFrozenWhiteTime(movePayload.white_time);
                        if (movePayload.black_time !== undefined) setFrozenBlackTime(movePayload.black_time);
                        if (movePayload.last_move_at !== undefined) setLastMoveAt(movePayload.last_move_at);
                        if (movePayload.current_turn) setCurrentTurn(movePayload.current_turn);
                        console.log("Clock sync - White:", movePayload.white_time, "Black:", movePayload.black_time, "Turn:", movePayload.current_turn);
                    }
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

                case 'game_over':
                    // Handle game over from server (when opponent resigns/timeouts)
                    const { winner, reason } = data.payload;
                    console.log("Game over received:", winner, reason);
                    setGameResult({ winner, reason });
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

  // Timer logic - perspective-based calculation
  // If it's MY turn: my clock decrements, opponent's is frozen
  // If it's OPPONENT's turn: opponent's clock decrements, mine is frozen
  useEffect(() => {
    if (game.isGameOver() || gameResult) return;
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastMoveAt) / 1000);
      
      // Determine my frozen time and opponent's frozen time based on my color
      const myFrozenTime = playerColor === 'white' ? frozenWhiteTime : frozenBlackTime;
      const oppFrozenTime = playerColor === 'white' ? frozenBlackTime : frozenWhiteTime;
      
      // Is it my turn?
      const isMyTurn = currentTurn === playerColor;
      
      let newMyTime = myTime;
      let newOpponentTime = opponentTime;
      
      if (isMyTurn) {
        // My clock is running
        newMyTime = Math.max(0, myFrozenTime - elapsedSeconds);
        newOpponentTime = oppFrozenTime;
        setMyTime(newMyTime);
        setOpponentTime(newOpponentTime);
        
        // Timeout detection - I ran out of time
        if (newMyTime <= 0 && !isSpectator) {
          const winner = playerColor === 'white' ? 'black' : 'white';
          setGameResult({ winner, reason: 'timeout' });
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              type: 'game_over',
              payload: { result: winner === 'white' ? '1-0' : '0-1', reason: 'timeout', winner }
            }));
          }
        }
      } else {
        // Opponent's clock is running
        newOpponentTime = Math.max(0, oppFrozenTime - elapsedSeconds);
        newMyTime = myFrozenTime;
        setOpponentTime(newOpponentTime);
        setMyTime(newMyTime);
        
        // Opponent timeout - I win
        if (newOpponentTime <= 0 && !isSpectator) {
          const winner = playerColor;
          setGameResult({ winner, reason: 'timeout' });
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              type: 'game_over',
              payload: { result: winner === 'white' ? '1-0' : '0-1', reason: 'timeout', winner }
            }));
          }
        }
      }
    }, 100);
    return () => clearInterval(timer);
  }, [game, frozenWhiteTime, frozenBlackTime, lastMoveAt, currentTurn, playerColor, gameResult, isSpectator]);

  // Resign function
  function handleResign() {
    if (isSpectator || game.isGameOver() || gameResult) return;
    
    const winner = playerColor === 'white' ? 'black' : 'white';
    setGameResult({ winner, reason: 'resign' });
    
    // Clear AI game from localStorage on resign
    if (isBot) {
      clearAIGameStorage();
    }
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'game_over',
        payload: { result: winner === 'white' ? '1-0' : '0-1', reason: 'resign', winner }
      }));
    }
  }

  // Handle leaving/navigating away from AI game
  function handleLeaveGame() {
    if (isBot) {
      clearAIGameStorage();
    }
    navigate('/');
  }

  function makeAMove(move: any) {
    try {
      const g = new Chess(game.fen());
      const result = g.move(move);
      
      if (result) {
        setGame(g);
        setMoveHistory(g.history());
        setOptionSquares({});
        setCurrentTurn(g.turn() === 'w' ? 'white' : 'black');
        
        // For bot games, trigger AI move instead of sending to server
        if (isBot) {
          // Save game state after player move
          saveAIGame(g.fen(), g.history());
          
          // Check if game is over after player move
          if (g.isGameOver()) {
            let winner = "";
            let reason = "unknown";
            if (g.isCheckmate()) {
              reason = "checkmate";
              winner = g.turn() === 'w' ? 'black' : 'white';
            } else if (g.isDraw() || g.isStalemate()) {
              reason = "draw";
            }
            if (winner || reason === "draw") {
              setGameResult({ winner, reason });
              clearAIGameStorage(); // Clear completed game
            }
          } else {
            // AI move is triggered automatically by useEffect watching game state
            console.log('Player moved, AI will respond via useEffect');
          }
          return result;
        }
        
        // Send move to server (for online games only)
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
           const uci = result.from + result.to + (result.promotion || '');
           console.log("Sending move:", uci);
           lastSentMoveRef.current = uci; // Track to skip echo
           socketRef.current.send(JSON.stringify({
               type: 'move',
               payload: uci
           }));

           // Check if game is over and notify server
           if (g.isGameOver()) {
               let resultStr = "*";
               let reason = "unknown";
               let winner = "";

               if (g.isCheckmate()) {
                   reason = "checkmate";
                   // The player who just moved wins (opposite of whose turn it is now)
                   winner = g.turn() === 'w' ? 'black' : 'white';
                   resultStr = winner === 'white' ? '1-0' : '0-1';
               } else if (g.isDraw()) {
                   reason = "draw";
                   resultStr = "1/2-1/2";
               } else if (g.isStalemate()) {
                   reason = "stalemate";
                   resultStr = "1/2-1/2";
               }

               console.log("Game over:", resultStr, reason, winner);
               socketRef.current.send(JSON.stringify({
                   type: 'game_over',
                   payload: { result: resultStr, reason, winner }
               }));
           }
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

  const [_debugLogs, setDebugLogs] = useState<string[]>([]);

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
          onClick={() => isBot ? handleLeaveGame() : navigate('/')}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>
        <div className="text-xl font-bold text-neutral-200 flex items-center gap-4">
           <span>{isBot ? "AI Match" : "Online Match"}</span>
           {!isBot && <span className="text-xs bg-neutral-800 px-2 py-1 rounded text-neutral-400">10 min</span>}
        </div>
        <div className="flex items-center gap-3">
          {isSpectator && (
            <>
              <span className="px-2 py-1 bg-purple-600/80 text-white text-xs font-semibold rounded-md flex items-center gap-1">
                👁 Spectator
              </span>
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 text-sm font-medium rounded-md transition-colors border border-red-600/30"
              >
                <LogOut size={14} />
                Leave
              </button>
            </>
          )}
          <button
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url);
              alert('Game link copied to clipboard!');
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-white text-sm font-medium rounded-md transition-colors"
          >
            <Share2 size={14} />
            Share
          </button>
        </div> 
      </div>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-start h-[800px]">
        <div className="flex flex-col h-full gap-4 order-2 lg:order-1 lg:h-[600px] w-full lg:w-80">
           {/* Top player card - for spectators: black player, for players: opponent */}
           <PlayerCard 
              name={
                isSpectator 
                  ? blackName 
                  : (isBot ? "Stockfish 16" : (playerColor === 'white' ? blackName : whiteName))
              } 
              rating={isBot ? 3000 : 1200} 
              time={isSpectator ? (playerColor === 'white' ? opponentTime : myTime) : opponentTime}
              isActive={
                isSpectator 
                  ? currentTurn === 'black' && !isGameOver 
                  : currentTurn !== playerColor && !isGameOver
              }
              isBlack={isSpectator ? true : playerColor === 'white'}
              hideTime={isBot}
           />
           <div className="flex-1 min-h-[300px]">
             {!isBot ? (
               <Chat messages={messages} onSendMessage={(text) => {
                  if (socketRef.current) {
                      socketRef.current.send(JSON.stringify({
                          type: 'chat',
                          payload: { text }
                      }));
                  }
               }} />
             ) : (
               <div className="h-full bg-neutral-800/50 rounded-lg border border-neutral-700/50 flex items-center justify-center">
                 <div className="text-center text-neutral-500">
                   <p className="text-lg font-medium mb-1">Playing vs Stockfish</p>
                   <p className="text-sm">No chat available in AI mode</p>
                 </div>
               </div>
             )}
           </div>
           {/* Bottom player card - for spectators: white player, for players: you */}
           <PlayerCard 
              name={
                isSpectator 
                  ? whiteName 
                  : "You"
              } 
              rating={1200} 
              time={isSpectator ? (playerColor === 'white' ? myTime : opponentTime) : myTime}
              isActive={
                isSpectator 
                  ? currentTurn === 'white' && !isGameOver 
                  : currentTurn === playerColor && !isGameOver
              }
              isBlack={isSpectator ? false : playerColor !== 'white'}
              hideTime={isBot}
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
              {(isGameOver || gameResult) && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-20 animate-in fade-in zoom-in">
                      <div className="bg-neutral-800 p-8 rounded-2xl border border-amber-500/20 shadow-2xl flex flex-col items-center gap-6 text-center">
                          <Crown size={48} className="text-amber-500" />
                          <div>
                              <div className="text-4xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent mb-2">
                                  {(() => {
                                    // Determine the result text
                                    if (gameResult) {
                                      if (isSpectator) {
                                        return `${gameResult.winner.toUpperCase()} WINS`;
                                      }
                                      return gameResult.winner === playerColor ? "VICTORY" : "DEFEAT";
                                    }
                                    if (game.isCheckmate()) {
                                      if (isSpectator) {
                                        const winner = game.turn() === 'w' ? 'black' : 'white';
                                        return `${winner.toUpperCase()} WINS`;
                                      }
                                      return game.turn() === (playerColor === 'white' ? 'b' : 'w') ? "VICTORY" : "DEFEAT";
                                    }
                                    return "DRAW";
                                  })()}
                              </div>
                              <div className="text-neutral-400">
                                  {gameResult 
                                    ? `by ${gameResult.reason.charAt(0).toUpperCase() + gameResult.reason.slice(1)}`
                                    : game.isCheckmate() 
                                      ? `by Checkmate` 
                                      : `by ${game.isDraw() ? 'Insufficient Material' : 'Stalemate'}`}
                              </div>
                          </div>
                          <button 
                            onClick={() => navigate('/')}
                            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-transform hover:scale-105"
                          >
                            Back to Lobby
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
          {/* Resign button - only for players, not spectators */}
          {!isSpectator && (
            <button
              onClick={handleResign}
              disabled={isGameOver || !!gameResult}
              className={`w-full py-4 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all
                ${isGameOver || gameResult 
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' 
                  : 'bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 hover:translate-y-[-2px] active:translate-y-0'}`}
            >
              <Flag size={20} />
              Resign
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
