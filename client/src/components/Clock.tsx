import { Timer } from 'lucide-react';

interface ClockProps {
  time: number; // in seconds
  isActive: boolean;
  isLowTime?: boolean;
}

export default function Clock({ time, isActive, isLowTime }: ClockProps) {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  
  return (
    <div 
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xl font-bold transition-all
        ${isActive 
          ? 'bg-neutral-200 text-neutral-900 shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
          : 'bg-neutral-800 text-neutral-400'}
        ${isLowTime && isActive ? 'bg-red-500 text-white animate-pulse' : ''}
      `}
    >
      <Timer size={20} className={isActive ? 'animate-pulse' : ''} />
      <span>
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
