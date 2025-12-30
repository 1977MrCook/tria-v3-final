import Logo from './Logo'
import { Settings, Zap } from 'lucide-react'

export default function Header({ liveCount, budget, onSettingsClick }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <Logo size={48} />
        <div className="header-title">
          <h1>TrIA</h1>
          <span className="subtitle">MULTI-AI ORCHESTRATION</span>
        </div>
      </div>

      <div className="header-center">
        <div className="live-indicator">
          <div className="pulse-dot"></div>
          <span className="live-label">LIVE</span>
          <span className="live-count">{liveCount}</span>
          <span className="live-text">RESPUESTAS</span>
        </div>
      </div>

      <div className="header-right">
        <div className="budget-display">
          <span className="budget-icon">💰</span>
          <div className="budget-info">
            <span className="budget-spent">${budget.spent.toFixed(2)}</span>
            <span className="budget-limit">/ ${budget.limit}</span>
          </div>
        </div>

        <button className="ml-toggle" title="ML Optimization">
          <Zap size={20} />
          <span>ML</span>
        </button>

        <button className="settings-btn" onClick={onSettingsClick}>
          <Settings size={20} />
        </button>
      </div>

      <style jsx>{`
        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(51, 65, 85, 0.5);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-title h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #06B6D4, #3B82F6, #A855F7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 2px;
        }

        .subtitle {
          display: block;
          font-size: 10px;
          color: #64748b;
          letter-spacing: 3px;
          margin-top: -2px;
        }

        .header-center {
          flex: 1;
          display: flex;
          justify-content: center;
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 20px;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.3);
          }
        }

        .live-label {
          font-size: 12px;
          font-weight: 700;
          color: #10b981;
          letter-spacing: 1px;
        }

        .live-count {
          font-size: 20px;
          font-weight: 700;
          color: #e2e8f0;
          min-width: 32px;
          text-align: center;
        }

        .live-text {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .budget-display {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 8px;
        }

        .budget-icon {
          font-size: 18px;
        }

        .budget-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1.2;
        }

        .budget-spent {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
        }

        .budget-limit {
          font-size: 10px;
          color: #64748b;
        }

        .ml-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          color: #3b82f6;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .ml-toggle:hover {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.5);
        }

        .settings-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 8px;
          color: #94a3b8;
          transition: all 0.2s;
        }

        .settings-btn:hover {
          background: rgba(51, 65, 85, 0.5);
          color: #e2e8f0;
        }
      `}</style>
    </header>
  )
}
