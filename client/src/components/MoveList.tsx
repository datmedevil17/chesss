import { useEffect, useRef } from 'react';
import { Scroll } from 'lucide-react';

interface MoveListProps {
  moves: string[]; // Array of SAN moves
}

export default function MoveList({ moves }: MoveListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves]);

  // Group moves into pairs (White, Black)
  const movePairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1] || '',
    });
  }

  return (
    <div className="bg-neutral-800 rounded-lg border border-neutral-700 flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-neutral-700 bg-neutral-800/50 flex items-center gap-2">
        <Scroll size={16} className="text-neutral-400" />
        <h3 className="font-bold text-neutral-300 text-sm uppercase tracking-wider">Move History</h3>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-0 customize-scrollbar"
      >
        <table className="w-full text-sm">
          <thead className="bg-neutral-900/30 sticky top-0 text-neutral-500 text-xs font-mono">
            <tr>
              <th className="py-2 pl-4 text-left w-12 text-neutral-600">#</th>
              <th className="py-2 text-left w-24">White</th>
              <th className="py-2 text-left">Black</th>
            </tr>
          </thead>
          <tbody>
            {movePairs.map((pair) => (
              <tr key={pair.number} className="odd:bg-white/5 even:bg-transparent hover:bg-white/10 transition-colors">
                <td className="py-2 pl-4 text-neutral-500 font-mono tracking-wide">{pair.number}.</td>
                <td className="py-2 font-medium text-neutral-200">{pair.white}</td>
                <td className="py-2 font-medium text-neutral-200">{pair.black}</td>
              </tr>
            ))}
            {moves.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-neutral-500 italic">
                  Game hasn't started yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
