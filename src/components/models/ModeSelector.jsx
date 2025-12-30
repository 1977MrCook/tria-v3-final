import { Users, MessageCircle, Zap } from 'lucide-react'

const COLLABORATION_MODES = [
  {
    id: 'roles',
    name: 'Roles Expertos',
    icon: Users,
    color: '#3b82f6',
    description: 'Cada IA asume un rol específico y colabora iterativamente',
    details: 'Las IAs trabajan juntas refinando la solución en múltiples rondas',
    rounds: '3-5 rondas'
  },
  {
    id: 'debate',
    name: 'Debate Democrático',
    icon: MessageCircle,
    color: '#8b5cf6',
    description: 'Las IAs proponen, critican y votan la mejor solución',
    details: 'Proceso completo: Propuesta → Crítica → Síntesis → Votación',
    rounds: '3 rondas + votación'
  },
  {
    id: 'hybrid',
    name: 'Híbrido Adaptativo',
    icon: Zap,
    color: '#f59e0b',
    description: 'Combina colaboración y debate según la complejidad',
    details: 'ML decide la mejor estrategia basándose en el contexto',
    rounds: 'Variable'
  }
]

export default function ModeSelector({ selectedMode, onModeChange }) {
  return (
    <div className="mode-selector">
      <div className="selector-header">
        <h3>Modo de Colaboración</h3>
      </div>

      <div className="modes-grid">
        {COLLABORATION_MODES.map(mode => {
          const Icon = mode.icon
          const isSelected = selectedMode === mode.id

          return (
            <div
              key={mode.id}
              className={`mode-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onModeChange(mode.id)}
              style={{
                borderColor: isSelected ? mode.color + '80' : 'rgba(51, 65, 85, 0.5)'
              }}
            >
              <div className="mode-header">
                <div 
                  className="mode-icon"
                  style={{
                    background: mode.color + '20',
                    color: mode.color
                  }}
                >
                  <Icon size={24} />
                </div>
                <div className="mode-name">{mode.name}</div>
                {isSelected && (
                  <div className="mode-badge" style={{ background: mode.color }}>
                    ✓
                  </div>
                )}
              </div>

              <div className="mode-description">
                {mode.description}
              </div>

              <div className="mode-details">
                <div className="detail-item">
                  <span className="detail-label">Proceso:</span>
                  <span className="detail-value">{mode.details}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Rondas:</span>
                  <span className="detail-value">{mode.rounds}</span>
                </div>
              </div>

              {isSelected && (
                <div className="mode-active-indicator">
                  <div className="pulse-ring" style={{ borderColor: mode.color }}></div>
                  <span style={{ color: mode.color }}>MODO ACTIVO</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style jsx>{`
        .mode-selector {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 12px;
          padding: 16px;
        }

        .selector-header h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #e2e8f0;
        }

        .modes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 12px;
        }

        .mode-card {
          background: rgba(30, 41, 59, 0.5);
          border: 2px solid;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .mode-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
          background: rgba(30, 41, 59, 0.7);
        }

        .mode-card.selected {
          background: rgba(59, 130, 246, 0.08);
        }

        .mode-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .mode-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }

        .mode-name {
          flex: 1;
          font-size: 16px;
          font-weight: 700;
          color: #e2e8f0;
        }

        .mode-badge {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: white;
          font-size: 14px;
          font-weight: 700;
        }

        .mode-description {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .mode-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .detail-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12px;
        }

        .detail-label {
          color: #64748b;
          min-width: 60px;
          font-weight: 600;
        }

        .detail-value {
          color: #cbd5e1;
          flex: 1;
        }

        .mode-active-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(51, 65, 85, 0.5);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .pulse-ring {
          width: 10px;
          height: 10px;
          border: 2px solid;
          border-radius: 50%;
          animation: pulse-ring 1.5s ease-out infinite;
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
