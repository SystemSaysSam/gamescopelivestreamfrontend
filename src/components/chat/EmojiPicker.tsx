import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, Clock, Smile, ThumbsUp, Trees, Utensils, Gamepad2, Car, Zap } from 'lucide-react';
import { ANIMATED_EMOJIS, AnimatedEmoji } from './AnimatedEmoji';

export interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

type EmojiCategory = 
  | 'animated'
  | 'recent'
  | 'smileys'
  | 'gestures'
  | 'animals'
  | 'food'
  | 'activities'
  | 'objects'
  | 'symbols';

interface CategoryConfig {
  id: EmojiCategory;
  name: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryConfig[] = [
  { id: 'animated', name: 'Animated Emojis', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'recent', name: 'Frequently Used', icon: <Clock className="w-3.5 h-3.5" /> },
  { id: 'smileys', name: 'Smileys & Emotion', icon: <Smile className="w-3.5 h-3.5" /> },
  { id: 'gestures', name: 'Reactions & Gestures', icon: <ThumbsUp className="w-3.5 h-3.5" /> },
  { id: 'animals', name: 'Animals & Leonida', icon: <Trees className="w-3.5 h-3.5" /> },
  { id: 'food', name: 'Food & Drink', icon: <Utensils className="w-3.5 h-3.5" /> },
  { id: 'activities', name: 'Activities & Gaming', icon: <Gamepad2 className="w-3.5 h-3.5" /> },
  { id: 'objects', name: 'Objects & Vehicles', icon: <Car className="w-3.5 h-3.5" /> },
  { id: 'symbols', name: 'Symbols & Flags', icon: <Zap className="w-3.5 h-3.5" /> }
];

const EMOJI_DATA: Record<Exclude<EmojiCategory, 'animated'>, string[]> = {
  recent: [
    '🔥', '💀', '⚡', '👑', '🎮', '🌴', '💎', '🚗', '😎', '❤️', '👍', '👏',
    '💯', '✨', '🐊', '🚀', '👀', '🤯', '🥳', '🏆', '🎯', '💰', '💵', '🏎️'
  ],
  smileys: [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '🥹', '☺️', '😊',
    '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😋', '😛', '😜', '🤪',
    '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟',
    '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😮‍💨', '😤', '😠',
    '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
    '🤔', '🫣', '🤭', '🫢', '🫡', '🤫', '🫠', '😶', '😐', '😑', '🫥', '😯',
    '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '😵‍💫', '🤐', '🥴',
    '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺',
    '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃'
  ],
  gestures: [
    '👍', '👎', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳',
    '💪', '🦾', '👊', '✊', '🤛', '🤜', '👋', '🤚', '🖐️', '✋', '🖖', '👌',
    '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇',
    '☝️', '🫵', '👀', '👁️', '👅', '👄', '🫦', '🧠', '🫀', '🫁', '🩸'
  ],
  animals: [
    '🌴', '🐊', '🦈', '🐍', '🦩', '🐆', '🐅', '🦁', '🐺', '🦊', '🦝', '🐱',
    '🐶', '🐵', '🦍', '🦅', '🦉', '🦇', '🐝', '🦋', '🦀', '🦞', '🦐', '🦑',
    '🐙', '🐬', '🐳', '🌊', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌧️', '⛈️', '🌩️',
    '⚡', '❄️', '🌙', '⭐', '🌟', '💫', '✨', '🌺', '🌸', '🌼', '🌻', '🌵'
  ],
  food: [
    '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥗', '🍿',
    '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🥨', '🥐', '🍞', '🧀', '🍳',
    '🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍬', '🍭', '🍦', '🍨', '🍺', '🍻',
    '🥂', '🍷', '🥃', '🍸', '🍹', '🍾', '☕', '🧃', '🥤', '🧋'
  ],
  activities: [
    '🎮', '🕹️', '🎯', '🎲', '🎰', '🎳', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️',
    '🏎️', '🏍️', '🛹', '🛼', '🥊', '🥋', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐',
    '🎱', '🏓', '🏸', '🏒', '⛳', '🏹', '🎣', '🎪', '🎭', '🎨', '🎬', '🎤',
    '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸'
  ],
  objects: [
    '🚗', '🚘', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🏍️', '🛵',
    '🚲', '🚨', '🚔', '🚁', '✈️', '🚀', '🛸', '🛰️', '⛵', '🚤', '🛥️', '🚢',
    '⚓', '⛽', '💰', '🪙', '💵', '💳', '💎', '🔫', '💣', '🧨', '🗡️', '⚔️',
    '🛡️', '🔑', '🗝️', '📱', '💻', '🖥️', '📷', '📹', '💡', '🕶️', '👑'
  ],
  symbols: [
    '⚡', '💥', '💫', '💦', '💨', '💣', '💬', '🗯️', '💭', '💤', '🛑', '⛔',
    '🚫', '🔞', '☢️', '☣️', '⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️',
    '🎵', '🎶', '➕', '➖', '✖️', '🟰', '♾️', '💲', '✔️', '☑️', '🔘', '⚪',
    '⚫', '🔴', '🔵', '🟡', '🟢', '🟣', '🏁', '🚩', '🏴', '🏳️', '🏴‍☠️', '🇺🇸'
  ]
};

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  isOpen,
  onClose,
  onSelectEmoji
}) => {
  const [activeCategory, setActiveCategory] = useState<EmojiCategory>('animated');
  const [searchQuery, setSearchQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Search filtering
  const isSearching = searchQuery.trim().length > 0;
  const filteredEmojis = isSearching
    ? Object.values(EMOJI_DATA).flat().filter(e => e.includes(searchQuery))
    : [];

  const filteredAnimated = isSearching
    ? ANIMATED_EMOJIS.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.token.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ANIMATED_EMOJIS;

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full mb-2 left-0 sm:left-auto right-0 sm:right-0 w-full sm:w-80 h-[320px] rounded-2xl bg-[#0b0e17] border border-white/10 shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* 1. Telegram-Style Top Category Tabs */}
      <div className="flex items-center justify-between px-2 pt-2 pb-1.5 bg-[#0e121a] border-b border-white/10 gap-1 overflow-x-auto scrollbar-none flex-shrink-0">
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.id && !isSearching;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setSearchQuery('');
              }}
              title={cat.name}
              className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-[#1e2538] text-[#00f0ff] border border-white/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat.icon}
            </button>
          );
        })}
      </div>

      {/* 2. Search Bar Header */}
      <div className="p-2 border-b border-white/5 bg-[#0b0e17] flex items-center space-x-1.5 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search emoji or reaction..."
            className="w-full bg-[#141926] border border-white/10 focus:border-[#00f0ff] rounded-lg pl-8 pr-7 py-1 text-xs text-white placeholder-slate-500 focus:outline-none font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          title="Close Picker"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. Emoji Content Grid */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
        {isSearching ? (
          <div>
            {/* Filtered Animated Emojis */}
            {filteredAnimated.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                  ANIMATED REACTIONS
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {filteredAnimated.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectEmoji(item.token);
                      }}
                      title={item.label}
                      className="p-2 rounded-xl bg-[#141926] hover:bg-[#1c2438] border border-white/10 flex flex-col items-center justify-center space-y-1 hover:border-[#00f0ff]/40 transition-all group"
                    >
                      <AnimatedEmoji type={item.id} className="w-5 h-5" />
                      <span className="text-[9px] font-mono text-slate-400 group-hover:text-white truncate max-w-full">
                        {item.id}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filtered Normal Unicode Emojis */}
            {filteredEmojis.length > 0 && (
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                  STANDARD EMOJIS
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {filteredEmojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectEmoji(emoji)}
                      className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-lg hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredAnimated.length === 0 && filteredEmojis.length === 0 && (
              <div className="text-center py-8 text-xs font-mono text-slate-500">
                NO MATCHING EMOJIS FOUND
              </div>
            )}
          </div>
        ) : activeCategory === 'animated' ? (
          /* Dedicated Animated Emojis Showcase (Section 6) */
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold text-[#ff2a85] uppercase tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-[#ff2a85]" />
                <span>EXPRESSIVE ANIMATED REACTIONS</span>
              </span>
              <span className="text-[9px] font-mono text-slate-400">8 AVAILABLE</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ANIMATED_EMOJIS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectEmoji(item.token)}
                  className="p-2.5 rounded-xl bg-[#121622] hover:bg-[#181f2e] border border-white/10 hover:border-[#ff2a85]/50 flex items-center space-x-2.5 transition-all text-left group active:scale-95"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#181f2e] border border-white/5 flex items-center justify-center flex-shrink-0">
                    <AnimatedEmoji type={item.id} className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-display font-bold text-white group-hover:text-[#00f0ff] transition-colors truncate">
                      {item.label}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 truncate">
                      {item.token}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-3 p-2 rounded-lg bg-[#121622] border border-white/5 text-[9px] font-mono text-slate-400 leading-relaxed text-center">
              Animated reactions render smoothly inline inside live messages.
            </div>
          </div>
        ) : (
          /* Standard Categorized Emojis (Telegram Style) */
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>{CATEGORIES.find(c => c.id === activeCategory)?.name}</span>
              <span className="text-[9px] text-slate-400">{EMOJI_DATA[activeCategory as Exclude<EmojiCategory, 'animated'>]?.length} EMOJIS</span>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {EMOJI_DATA[activeCategory as Exclude<EmojiCategory, 'animated'>]?.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectEmoji(emoji)}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-lg hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
