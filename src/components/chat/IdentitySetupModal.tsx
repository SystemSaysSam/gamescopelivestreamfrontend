import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { HudShield, HudRadar } from '../icons/GameIcons';
import { UserGender, UserIdentity } from '../../types';
import { generateIdentity } from '../../data/mockData';
import { ViceButton } from '../ViceButton';

interface IdentitySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIdentityAssigned: (identity: UserIdentity) => void;
}

export const IdentitySetupModal: React.FC<IdentitySetupModalProps> = ({ 
  isOpen, 
  onClose, 
  onIdentityAssigned 
}) => {
  const [selectedGender, setSelectedGender] = useState<UserGender | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [assignedPreview, setAssignedPreview] = useState<UserIdentity | null>(null);

  if (!isOpen) return null;

  const handleConfirmIdentity = () => {
    if (!selectedGender) return;
    setIsGenerating(true);

    // Micro-delay simulation for security handshake
    setTimeout(() => {
      const identity = generateIdentity(selectedGender);
      setAssignedPreview(identity);
      setIsGenerating(false);

      // Save to localStorage
      try {
        localStorage.setItem('gamescope_live_user', JSON.stringify(identity));
      } catch {}

      setTimeout(() => {
        onIdentityAssigned(identity);
        setAssignedPreview(null);
        setSelectedGender(null);
      }, 700);
    }, 400);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md rounded-2xl bg-[#0b0e17] border border-white/10 shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Tactical Ambient Auras */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f0ff]/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#ff2a85]/10 blur-2xl pointer-events-none" />

        {/* Modal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#131926] border border-[#ff2a85]/50 flex items-center justify-center">
            <HudShield className="w-4.5 h-4.5 text-[#ff2a85]" />
          </div>
          <div>
            <h3 className="font-display font-black text-base text-white uppercase tracking-wider">
              ASSIGN TEMPORARY IDENTITY
            </h3>
            <p className="text-[11px] font-mono text-[#00f0ff]">
              ENTER COMMUNITY CHAT FREQUENCY
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 font-light mb-5 leading-relaxed">
          To preserve broadcast integrity and community safety, GameScope automatically provisions an encrypted callsign and tactical operative avatar.
        </p>

        {!assignedPreview ? (
          <div className="space-y-4">
            <div className="text-[11px] font-mono text-[#00f0ff] uppercase tracking-wider flex items-center gap-1.5">
              <HudRadar className="w-3.5 h-3.5" />
              <span>Select Call-Sign Protocol:</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedGender('male')}
                className={`p-3 rounded-xl border text-xs font-mono transition-all text-center ${
                  selectedGender === 'male'
                    ? 'bg-[#00f0ff]/15 border-[#00f0ff] text-white shadow-[0_0_12px_rgba(0,240,255,0.3)] font-bold'
                    : 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                MALE
              </button>

              <button
                type="button"
                onClick={() => setSelectedGender('female')}
                className={`p-3 rounded-xl border text-xs font-mono transition-all text-center ${
                  selectedGender === 'female'
                    ? 'bg-[#ff2a85]/15 border-[#ff2a85] text-white shadow-[0_0_12px_rgba(255,42,133,0.3)] font-bold'
                    : 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                FEMALE
              </button>

              <button
                type="button"
                onClick={() => setSelectedGender('unspecified')}
                className={`p-3 rounded-xl border text-xs font-mono transition-all text-center ${
                  selectedGender === 'unspecified'
                    ? 'bg-[#00ff88]/15 border-[#00ff88] text-white shadow-[0_0_12px_rgba(0,255,136,0.3)] font-bold'
                    : 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                PREFER NOT TO SAY
              </button>
            </div>

            <div className="pt-2">
              <ViceButton
                variant="pink"
                size="md"
                disabled={!selectedGender || isGenerating}
                onClick={handleConfirmIdentity}
                className="w-full justify-center !py-2.5"
                icon={<Sparkles className="w-3.5 h-3.5 ml-1" />}
              >
                {isGenerating ? 'ASSIGNING CALLSIGN...' : 'ACTIVATE CHAT IDENTITY'}
              </ViceButton>
            </div>

            <div className="pt-2 text-[10px] font-mono text-slate-400 space-y-1">
              <p>• User identities displayed in chat are session-scoped and temporary.</p>
              <p>• Identities cannot be manually modified or rerolled once assigned.</p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#131926] border border-[#00ff88]/40 flex items-center space-x-4 animate-in fade-in">
            <div 
              className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
              dangerouslySetInnerHTML={{ __html: assignedPreview.avatarSvg }}
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display font-black text-white text-base">
                  {assignedPreview.username}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00ff88]/20 text-[#00ff88] font-bold">
                  VERIFIED
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#00ff88]">
                OPERATIVE FREQUENCY CONNECTED
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
