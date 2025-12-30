import { useState } from 'react'
import { CheckCircle2, Circle, Sparkles, MessageSquare } from 'lucide-react'
import { AVAILABLE_MODELS } from '../../config/models'

export default function ModelSelector({ selectedModels, onModelToggle, customInstructions, onInstructionChange }) {
  const [expandedModel, setExpandedModel] = useState(null)

  const handleToggle = (model) => {
    onModelToggle(model)
    if (!selectedModels.find(m => m.id === model.id)) {
      setExpandedModel(model.id)
    }
  }

  const isSelected = (modelId) => {
    return selectedModels.some(m => m.id === modelId)
  }

  const getInstruction = (modelId) => {
    return customInstructions[modelId] || ''
  }

  return (
    <div className="model-selector">
      <div className="selector-header">
        <Sparkles size={20} />
        <h3>Modelos</h3>
        <span className="model-count">{selectedModels.length} seleccionados</span>
      </div>

      <div className="models-grid">
        {AVAILABLE_MODELS.filter(m => m.available).map(model => {
          const selected = isSelected(model.id)
          const expanded = expandedModel === model.id

          return (
            <div key={model.id} className={`model-card ${selected ? 'selected' : ''}`}>
              <div className="model-main" onClick={() => handleToggle(model)}>
                <div className="model-icon" style={{ background: model.color + '20', color: model.color }}>
                  {model.icon}
                </div>

                <div className="model-info">
                  <div className="model-name">{model.displayName}</div>
                  <div className="model-desc">{model.description}</div>
                  <div className="model-meta">
                    <span className="model-tier">{model.tier}</span>
                    <span className="model-pricing">
                      ${model.pricing.input}/${model.pricing.output}
                    </span>
                  </div>
                </div>

                <div className="model-checkbox">
                  {selected ? (
                    <CheckCircle2 size={24} style={{ color: model.color }} />
                  ) : (
                    <Circle size={24} style={{ color: '#475569' }} />
                  )}
                </div>
              </div>

              {selected && (
                <div className="model-instructions">
                  <div 
                    className="instructions-toggle"
                    onClick={() => setExpandedModel(expanded ? null : model.id)}
                  >
                    <MessageSquare size={16} />
                    <span>Instrucciones personalizadas</span>
                    <span className="toggle-icon">{expanded ? '▼' : '▶'}</span>
                  </div>

                  {expanded && (
                    <div className="instructions-input">
                      <textarea
                        value={getInstruction(model.id)}
                        onChange={(e) => onInstructionChange(model.id, e.target.value)}
                        placeholder={`Rol específico para ${model.displayName}...\n\nEjemplo: "Actúa como experto en análisis financiero con enfoque en mercados latinoamericanos."`}
                        rows={4}
                      />
                      <div className="instructions-hint">
                        Define el rol, expertise o perspectiva específica que quieres que tenga esta IA
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style jsx>{`
        .model-selector {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 12px;
          padding: 16px;
        }

        .selector-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          color: #e2e8f0;
        }

        .selector-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          flex: 1;
        }

        .model-count {
          font-size: 12px;
          color: #64748b;
          padding: 4px 8px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 12px;
        }

        .models-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 500px;
          overflow-y: auto;
          padding-right: 8px;
        }

        .model-card {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 8px;
          transition: all 0.2s;
          overflow: hidden;
        }

        .model-card:hover {
          border-color: rgba(71, 85, 105, 0.8);
          background: rgba(30, 41, 59, 0.7);
        }

        .model-card.selected {
          border-color: rgba(59, 130, 246, 0.5);
          background: rgba(59, 130, 246, 0.05);
        }

        .model-main {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          cursor: pointer;
        }

        .model-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-size: 20px;
          flex-shrink: 0;
        }

        .model-info {
          flex: 1;
          min-width: 0;
        }

        .model-name {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 2px;
        }

        .model-desc {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .model-meta {
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 10px;
        }

        .model-tier {
          padding: 2px 6px;
          background: rgba(100, 116, 139, 0.2);
          color: #94a3b8;
          border-radius: 4px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .model-pricing {
          color: #64748b;
        }

        .model-checkbox {
          flex-shrink: 0;
        }

        .model-instructions {
          border-top: 1px solid rgba(51, 65, 85, 0.5);
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 300px;
          }
        }

        .instructions-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          cursor: pointer;
          color: #94a3b8;
          font-size: 13px;
          transition: all 0.2s;
        }

        .instructions-toggle:hover {
          color: #e2e8f0;
          background: rgba(59, 130, 246, 0.05);
        }

        .toggle-icon {
          margin-left: auto;
          font-size: 10px;
        }

        .instructions-input {
          padding: 0 12px 12px;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .instructions-input textarea {
          width: 100%;
          padding: 10px;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s;
        }

        .instructions-input textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .instructions-input textarea::placeholder {
          color: #475569;
        }

        .instructions-hint {
          margin-top: 6px;
          font-size: 11px;
          color: #64748b;
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
