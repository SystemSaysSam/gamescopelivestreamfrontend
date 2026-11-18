import React from 'react';

/**
 * GameScope Live — Solid Charcoal Atmospheric Environment
 * Clean, restrained dark surface with subtle telemetry depth.
 * Zero generic AI purple-pink gradients or neon glow washes.
 */
export const AmbientGradientBackground: React.FC = () => {
  return (
    <div 
      aria-hidden="true" 
      className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-[#07090e]"
    >
      {/* Deep Solid Charcoal Base */}
      <div className="absolute inset-0 bg-[#07090e]" />

      {/* Subtle Restrained Radial Depth (Charcoal to Deep Navy-Black) */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 10%, #0d111a 0%, #07090e 100%)'
        }}
      />

      {/* Subtle Cinematic Vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5, 7, 11, 0.85) 100%)'
        }}
      />

      {/* Ultra-subtle scanlines for display texture (3% opacity) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:100%_4px] opacity-25 pointer-events-none" />
    </div>
  );
};
