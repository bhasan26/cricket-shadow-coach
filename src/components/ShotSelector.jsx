import { unlockMobileAudio } from '../audioCoaching';
import { NANO_ICONS } from '../shotIcons';

// "Choose Shot" drill grid (Step 01 of the live journey).
export default function ShotSelector({ availableShots, selectedShot, isRecording, onSelect, className }) {
  return (
    <div className={`cyber-card ${className || ''}`} style={{ padding: '24px' }}>
      <div className="step-header">
        <span className="step-number">01</span>
        <h2>Choose Shot</h2>
      </div>
      <div className="drills-grid">
        {Object.entries(availableShots).map(([key, shot]) => {
          const isSelected = selectedShot === key;
          const isElite = shot.difficulty === 'Elite';
          return (
            <button
              key={key}
              onClick={() => { unlockMobileAudio(); onSelect(key); }}
              disabled={isRecording}
              className={`shot-card-btn ${isSelected ? 'active' : ''}`}
              style={{ opacity: isRecording ? 0.4 : 1, cursor: isRecording ? 'not-allowed' : 'pointer' }}
            >
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '38px', height: '38px', borderRadius: '10px',
                background: isSelected ? 'rgba(0, 245, 160, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                border: isSelected ? '1px solid rgba(0, 245, 160, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                overflow: 'hidden',
                filter: isSelected ? 'none' : 'drop-shadow(0 0 8px rgba(0, 245, 160, 0.25))',
                transition: 'all 0.3s', flexShrink: 0,
              }}>
                <img
                  src={NANO_ICONS[key]}
                  alt={shot.name}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    filter: isSelected ? 'none' : 'grayscale(35%) brightness(85%)',
                  }}
                />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isSelected ? '#00f5a0' : '#f8fafc' }}>
                  {shot.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: isSelected ? '#33f7b3' : '#94a3b8', marginTop: '2.5px', lineHeight: '1.25' }}>
                  {shot.description}
                </div>
              </div>
              <span style={{
                fontSize: '0.58rem', padding: '4px 8px', borderRadius: '8px', fontWeight: 900,
                background: isElite ? 'rgba(255, 51, 102, 0.12)' : 'rgba(255, 159, 13, 0.12)',
                color: isElite ? '#ff3366' : '#ff9f0d',
                border: isElite ? '1px solid rgba(255, 51, 102, 0.25)' : '1px solid rgba(255, 159, 13, 0.25)',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                {shot.difficulty}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
