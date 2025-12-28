import { User, Trophy } from 'lucide-react';
import Clock from './Clock';

interface PlayerCardProps {
  name: string;
  rating?: number;
  time: number;
  isActive: boolean;
  isBlack?: boolean;
}

export default function PlayerCard({ name, rating, time, isActive, isBlack }: PlayerCardProps) {
  return (
    <div className={`
      flex items-center justify-between p-3 rounded-xl border transition-all duration-300
      ${isActive 
        ? 'bg-neutral-800 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
        : 'bg-neutral-800/50 border-neutral-700/50'}
    `}>
      <div className="flex items-center gap-3">
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center
          ${isBlack ? 'bg-neutral-900 text-neutral-400' : 'bg-neutral-200 text-neutral-800'}
        `}>
          <User size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{name}</span>
            {rating && (
              <span className="text-xs text-neutral-400 font-mono bg-neutral-900/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Trophy size={10} className="text-amber-500" />
                {rating}
              </span>
            )}
          </div>
          <div className="text-xs text-neutral-500 flex items-center gap-1">
             {isActive ? 'Thinking...' : 'Waiting'}
          </div>
        </div>
      </div>

      <Clock 
        time={time} 
        isActive={isActive} 
        isLowTime={time < 30} 
      />
    </div>
  );
}
