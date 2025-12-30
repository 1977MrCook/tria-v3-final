import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Clock, DollarSign, Zap } from 'lucide-react'

export default function DebateViewer({ debate, isActive }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [debate])

  if (!debate || debate.rounds.length === 0) {
    return (
      <div className="debate-viewer empty">
        <div className="empty-state">
          <MessageSquare size={48} style={{ color: '#475569' }} />
          <h3>Panel de Debate</h3>
          <p>Aquí verás el proceso de colaboración en tiempo real</p>
        </div>

        <style jsx>{`
          .debate-viewer.empty {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(51, 65, 85, 0.5);
            border-radius: 12px;
            padding: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
          }

          .empty-state {
            text-align: center;
            color: #64748b;
          }

          .empty-state h3 {
            margin: 16px 0 8px;
            color: #94a3b8;
            font-size: 18px;
          }

          .empty-state p {
            margin: 0;
            font-size: 14px;
          }
        `}</style>
      </div>
    )
  }

  const getModelColor = (modelId) => {
    const colors = {
      'gpt': '#10b981',
      'claude': '#a855f7',
      'gemini': '#3b82f6'
    }
    
    for (const key in colors) {
      if (modelId.includes(key)) return colors[key]
    }
    return '#64748b'
  }

  const getRoundLabel = (round) => {
    const labels = {
      'initial-proposal': 'Propuesta Inicial',
      'constructive-critique': 'Crítica Constructiva',
      'synthesis': 'Síntesis',
      'final-consensus': 'Consenso Final',
      'collaboration': 'Colaboración',
      'voting': 'Votación'
    }
    return labels[round.roundType] || `Ronda ${round.roundNumber}`
  }

  return (
    <div className="debate-viewer">
      <div className="viewer-header">
        <MessageSquare size={20} />
        <h3>Debate en Tiempo Real</h3>
        {isActive && (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <span>Procesando...</span>
          </div>
        )}
      </div>

      <div className="debate-stats">
        <div className="stat-item">
          <Clock size={14} />
          <span>{debate.stats?.totalTime || 0}s</span>
        </div>
        <div className="stat-item">
          <DollarSign size={14} />
          <span>${(debate.stats?.totalCost || 0).toFixed(4)}</span>
        </div>
        <div className="stat-item">
          <Zap size={14} />
          <span>{debate.stats?.totalRounds || 0} rondas</span>
        </div>
      </div>

      <div className="debate-rounds" ref={scrollRef}>
        {debate.rounds.map((round, index) => (
          <div key={index} className="round-card">
            <div className="round-header">
              <div 
                className="round-badge"
                style={{ background: getModelColor(round.modelId) + '20', color: getModelColor(round.modelId) }}
              >
                {round.roundNumber}
              </div>
              <div className="round-info">
                <div className="round-title">{getRoundLabel(round)}</div>
                <div className="round-meta">
                  <span className="model-name">{round.modelName}</span>
                  {round.assignedRole && (
                    <>
                      <span className="separator">•</span>
                      <span className="role-badge">{round.assignedRole}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="round-stats">
                <span className="time-stat">{round.responseTime}s</span>
                <span className="cost-stat">${round.cost.toFixed(4)}</span>
              </div>
            </div>

            <div className="round-response">
              {round.response}
            </div>
          </div>
        ))}

        {debate.validation && (
          <div className="validation-card">
            <h4>Resultado de Votación</h4>
            <div className="vote-results">
              <div className="vote-bar">
                <div 
                  className="vote-fill yes"
                  style={{ width: `${(debate.validation.yes / (debate.validation.yes + debate.validation.no)) * 100}%` }}
                >
                  ✓ {debate.validation.yes}
                </div>
                <div 
                  className="vote-fill no"
                  style={{ width: `${(debate.validation.no / (debate.validation.yes + debate.validation.no)) * 100}%` }}
                >
                  ✗ {debate.validation.no}
                </div>
              </div>
              <div className={`validation-status ${debate.validation.approved ? 'approved' : 'rejected'}`}>
                {debate.validation.approved ? '✓ APROBADO' : '✗ RECHAZADO'}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .debate-viewer {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .viewer-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          color: #e2e8f0;
        }

        .viewer-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          flex: 1;
        }

        .processing-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #3b82f6;
        }

        .spinner {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .debate-stats {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(51, 65, 85, 0.5);
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #94a3b8;
        }

        .debate-rounds {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-right: 8px;
        }

        .round-card {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 8px;
          padding: 12px;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .round-header {
          display: flex;
          gap: 12px;
          margin-bottom: 10px;
        }

        .round-badge {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }

        .round-info {
          flex: 1;
          min-width: 0;
        }

        .round-title {
          font-size: 13px;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 2px;
        }

        .round-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #94a3b8;
        }

        .model-name {
          font-weight: 600;
        }

        .separator {
          color: #475569;
        }

        .role-badge {
          padding: 2px 6px;
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border-radius: 4px;
          font-weight: 600;
        }

        .round-stats {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          font-size: 11px;
        }

        .time-stat {
          color: #94a3b8;
        }

        .cost-stat {
          color: #64748b;
        }

        .round-response {
          font-size: 13px;
          color: #cbd5e1;
          line-height: 1.6;
          padding: 10px;
          background: rgba(15, 23, 42, 0.5);
          border-radius: 6px;
          white-space: pre-wrap;
        }

        .validation-card {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 8px;
          padding: 12px;
          margin-top: 8px;
        }

        .validation-card h4 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #e2e8f0;
        }

        .vote-results {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .vote-bar {
          display: flex;
          height: 32px;
          border-radius: 6px;
          overflow: hidden;
          background: rgba(15, 23, 42, 0.5);
        }

        .vote-fill {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: white;
          transition: width 0.3s ease;
        }

        .vote-fill.yes {
          background: #10b981;
        }

        .vote-fill.no {
          background: #ef4444;
        }

        .validation-status {
          text-align: center;
          padding: 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .validation-status.approved {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .validation-status.rejected {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
      `}</style>
    </div>
  )
}
