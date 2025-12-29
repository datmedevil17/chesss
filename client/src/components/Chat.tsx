import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
  isSystem?: boolean;
}

interface ChatProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
}

export default function Chat({ messages, onSendMessage }: ChatProps) {
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  return (
    <div className="bg-neutral-800 rounded-lg border border-neutral-700 flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-neutral-700 bg-neutral-800/50 flex items-center gap-2">
        <MessageSquare size={16} className="text-neutral-400" />
        <h3 className="font-bold text-neutral-300 text-sm uppercase tracking-wider">Chat Room</h3>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-900/20"
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
             {!msg.isSystem && (
               <span className="text-xs text-neutral-500 mb-1 ml-1">{msg.sender}</span>
             )}
             <div 
               className={`
                 max-w-[85%] px-3 py-2 rounded-lg text-sm
                 ${msg.isSystem 
                   ? 'bg-neutral-700/50 text-neutral-400 italic text-center w-full max-w-full' 
                   : msg.sender === 'You'
                     ? 'bg-blue-600 text-white rounded-br-none'
                     : 'bg-neutral-700 text-neutral-200 rounded-bl-none'}
               `}
             >
               {msg.text}
             </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-neutral-700 bg-neutral-800 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500 transition-colors"
        />
        <button 
          type="submit"
          className="bg-neutral-700 hover:bg-neutral-600 text-white p-2 rounded transition-colors"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
