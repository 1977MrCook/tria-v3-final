import { useState, useEffect } from 'react'
import './App.css'
import RatingModal from './RatingModal.jsx'
import MLDashboard from './MLDashboard.jsx'
import { saveEvaluation, getEvaluations, getCurrentPhase } from './mlEngine.js'

const AVAILABLE_MODELS = {
  openai: [
    { id: 'o1-preview', name: 'o1-preview', description: 'Razonamiento profundo máximo', icon: '🟢', provider: 'openai' },
    { id: 'o1-mini', name: 'o1-mini', description: 'Razonamiento rápido', icon: '🟢', provider: 'openai' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Equilibrado y potente', icon: '🟢', provider: 'openai' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Rápido y económico', icon: '🟢', provider: 'openai' },
  ],
  anthropic: [
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Máxima inteligencia', icon: '🟣', provider: 'anthropic' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Equilibrio perfecto', icon: '🟣', provider: 'anthropic' },
    { id: 'claude-haiku-4-20250514', name: 'Claude Haiku 4', description: 'Velocidad extrema', icon: '🟣', provider: 'anthropic' },
  ],
  google: [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', description: 'Experimental más rápido', icon: '🔵', provider: 'google' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Máxima capacidad', icon: '🔵', provider: 'google' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Rápido y eficiente', icon: '🔵', provider: 'google' },
  ]
}

export default function App() {
  const [mode, setMode] = useState('collaborative')
  const [selectedModels, setSelectedModels] = useState({
    'gpt-4o': true,
    'claude-sonnet-4-20250514': true
  })
  const [modelInstructions, setModelInstructions] = useState({})
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [showMLDashboard, setShowMLDashboard] = useState(false)
  
  const [currency, setCurrency] = useState('CLP')
  const [budgetLimit, setBudgetLimit] = useState(50000)
  const [totalSpent, setTotalSpent] = useState(0)
  const [responseCount, setResponseCount] = useState(0)

  // Rating & ML
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [pendingRating, setPendingRating] = useState(null)
  const [evaluations, setEvaluations] = useState([])
  const [mlPhase, setMlPhase] = useState(null)

  useEffect(() => {
    const evals = getEvaluations()
    setEvaluations(evals)
    if (evals.length > 0) {
      const phase = getCurrentPhase(evals)
      setMlPhase(phase)
    }
  }, [])

  const toggleModel = (modelId) => {
    setSelectedModels(prev => ({ ...prev, [modelId]: !prev[modelId] }))
  }

  const setInstruction = (modelId, instruction) => {
    setModelInstructions(prev => ({ ...prev, [modelId]: instruction }))
  }

  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return

    const selectedModelsList = Object.entries(selectedModels)
      .filter(([_, selected]) => selected)
      .map(([id]) => {
        const allModels = [...AVAILABLE_MODELS.openai, ...AVAILABLE_MODELS.anthropic, ...AVAILABLE_MODELS.google]
        const model = allModels.find(m => m.id === id)
        return {
          id: model.id,
          provider: model.provider,
          name: model.name,
          displayName: model.name,
          systemPrompt: modelInstructions[id] || `Eres ${model.name}. Colabora con las otras IAs para dar la mejor respuesta.`
        }
      })

    if (selectedModelsList.length === 0) {
      alert('Selecciona al menos un modelo')
      return
    }

    const userMessage = { role: 'user', content: inputValue.trim() }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsProcessing(true)

    try {
      const response = await fetch('/.netlify/functions/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          models: selectedModelsList,
          mode: mode,
          conversationHistory: messages.slice(-6)
        })
      })

      if (!response.ok) throw new Error('Error en la respuesta')

      const data = await response.json()
      
      const assistantMessage = {
        role: 'assistant',
        content: data.finalResponse,
        debate: data.debate
      }
      
      setMessages(prev => [...prev, assistantMessage])

      if (data.debate?.stats?.totalCost) {
        setTotalSpent(prev => prev + (data.debate.stats.totalCost * 800))
      }
      setResponseCount(prev => prev + 1)

      // Mostrar modal de rating
      setPendingRating({
        models: selectedModelsList.map(m => m.id),
        mode: mode,
        debate: data.debate
      })
      setShowRatingModal(true)

    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        role: 'error',
        content: 'Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.'
      }])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRatingSubmit = (ratingData) => {
    if (!pendingRating) return

    const evaluation = {
      ...ratingData,
      models: pendingRating.models,
      mode: pendingRating.mode,
      timestamp: Date.now()
    }

    const newEvals = saveEvaluation(evaluation)
    setEvaluations(newEvals)
    
    const phase = getCurrentPhase(newEvals)
    setMlPhase(phase)
    
    setPendingRating(null)
  }

  const budgetPercentage = Math.min((totalSpent / budgetLimit) * 100, 100)
  const selectedCount = Object.values(selectedModels).filter(Boolean).length
  const allModels = [...AVAILABLE_MODELS.openai, ...AVAILABLE_MODELS.anthropic, ...AVAILABLE_MODELS.google]

  return (
    <div className="app-container">
      {showConfig && <div className="overlay" onClick={() => setShowConfig(false)} />}
      {showMLDashboard && <div className="overlay" onClick={() => setShowMLDashboard(false)} />}

      {/* Config Modal */}
      <div className={`config-modal ${showConfig ? 'open' : ''}`}>
        <div className="config-header">
          <h2>⚙️ Configuración</h2>
          <button onClick={() => setShowConfig(false)} className="close-btn">×</button>
        </div>
        
        <div className="config-content">
          <div className="config-section">
            <h3>💰 Presupuesto</h3>
            <div className="form-group">
              <label>Moneda</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="CLP">🇨🇱 CLP</option>
                <option value="USD">🇺🇸 USD</option>
                <option value="EUR">🇪🇺 EUR</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Límite</label>
              <input type="number" value={budgetLimit} onChange={(e) => setBudgetLimit(Number(e.target.value))} />
            </div>
            
            <div className="budget-display">
              <div className="budget-header">
                <span>Usado</span>
                <span className="percentage">{budgetPercentage.toFixed(0)}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${budgetPercentage}%` }} />
              </div>
              <div className="budget-values">
                <span>${totalSpent.toFixed(0)} {currency}</span>
                <span>/ ${budgetLimit.toLocaleString()} {currency}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ML Dashboard Modal */}
      {showMLDashboard && (
        <MLDashboard 
          evaluations={evaluations}
          models={allModels}
          onClose={() => setShowMLDashboard(false)}
        />
      )}

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleRatingSubmit}
        debate={pendingRating?.debate}
      />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/logo-tria.jpg" alt="TrIA" className="logo" />
          <div className="logo-text">TrIA</div>
          <button onClick={() => { setMessages([]); setInputValue(''); setTotalSpent(0); setResponseCount(0) }} className="new-chat-btn">
            + Nueva Conversación
          </button>
        </div>

        <nav className="sidebar-nav">
          <a href="#" className="nav-item active">
            <span>💬</span>
            <span>Chat</span>
            {messages.length > 0 && <span className="badge">{messages.length}</span>}
          </a>
          <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setShowMLDashboard(true) }}>
            <span>🤖</span>
            <span>Machine Learning</span>
            {mlPhase && <span className="badge">{evaluations.length}</span>}
          </a>
        </nav>

        {/* ML Mini Status */}
        {mlPhase && (
          <div className="ml-mini-status">
            <h4>🤖 ML Status</h4>
            <div className="mini-phase-badge" data-phase={mlPhase.phase}>
              {mlPhase.phase === 'learning' && '🌱'}
              {mlPhase.phase === 'suggested' && '📈'}
              {mlPhase.phase === 'optimized' && '✅'}
              <span>{mlPhase.count}/{mlPhase.target}</span>
            </div>
            <div className="mini-progress">
              <div className="mini-progress-fill" style={{ width: `${mlPhase.progress}%` }} />
            </div>
            <small>{mlPhase.message}</small>
          </div>
        )}
      </aside>

      {/* Main Area */}
      <div className="main-area">
        {/* Header */}
        <header className="header">
          <div>
            <h1 className="header-title">Orquestación Multi-IA</h1>
          </div>
          <div className="header-stats">
            <div className="stat-card green">
              <div className="stat-value">{responseCount.toLocaleString()}</div>
              <div className="stat-label">respuestas</div>
            </div>
            
            <div className="stat-card blue">
              <div className="stat-value">${(totalSpent / 1000).toFixed(2)}</div>
              <div className="stat-label">gastado</div>
            </div>
            
            <button onClick={() => setShowConfig(true)} className="settings-btn">
              ⚙️
            </button>
          </div>
        </header>

        {/* Controls Bar */}
        <div className="controls-bar">
          <div className="mode-buttons-compact">
            {[
              { id: 'collaborative', icon: '👥', label: 'Colaborativo' },
              { id: 'voting', icon: '📋', label: 'Votación' },
              { id: 'hybrid', icon: '⚡', label: 'Híbrido' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`mode-btn-compact ${mode === m.id ? 'active' : ''}`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="toggle-models-btn"
          >
            {showModelSelector ? '▲ Ocultar' : '▼ Seleccionar'} Modelos ({selectedCount})
          </button>
        </div>

        {/* Model Selector - Colapsable */}
        {showModelSelector && (
          <div className="controls">
            <div className="controls-inner">
              {Object.entries(AVAILABLE_MODELS).map(([provider, models]) => (
                <div key={provider} className="provider-section">
                  <div className="provider-label">
                    {provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'Google'}
                  </div>
                  
                  {models.map(model => (
                    <div key={model.id} className={`model-card ${selectedModels[model.id] ? 'selected' : ''}`}>
                      <div className="model-header" onClick={() => toggleModel(model.id)}>
                        <input type="checkbox" checked={selectedModels[model.id] || false} onChange={() => {}} />
                        <div className="model-info">
                          <div className="model-name">{model.name}</div>
                          <div className="model-desc">{model.description}</div>
                        </div>
                        <span className="model-icon">{model.icon}</span>
                      </div>
                      
                      {selectedModels[model.id] && (
                        <div className="model-instructions-container">
                          <textarea
                            className="model-instructions"
                            value={modelInstructions[model.id] || ''}
                            onChange={(e) => setInstruction(model.id, e.target.value)}
                            placeholder={`Instrucciones personalizadas para ${model.name}...`}
                            rows="2"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="chat-area">
          <div className="messages">
            {messages.length === 0 && (
              <div className="welcome">
                <h2>¡Bienvenido a TrIA Platform v4.0!</h2>
                <p>Colaboración real entre IAs con Machine Learning</p>
                {mlPhase && (
                  <p className="ml-welcome-hint">
                    🤖 {mlPhase.message}
                  </p>
                )}
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-content">
                  <p>{msg.content}</p>
                  
                  {msg.debate && msg.debate.rounds && (
                    <div className="debate-info">
                      <details>
                        <summary>📊 Ver debate completo ({msg.debate.rounds.length} rondas)</summary>
                        {msg.debate.rounds.map((round, ridx) => (
                          <div key={ridx} className="round">
                            <strong>
                              Ronda {ridx + 1}
                              {round.isCritique && ' - Crítica'}
                              {round.isVoting && ' - Votación'}
                              {round.responses?.[0]?.isSynthesis && ' - Síntesis Final'}
                            </strong>
                            {round.responses.map((resp, respIdx) => (
                              <div key={respIdx} className="response">
                                <strong>{resp.model}:</strong>
                                <p>{resp.content?.substring(0, 300)}{resp.content?.length > 300 ? '...' : ''}</p>
                              </div>
                            ))}
                          </div>
                        ))}
                      </details>
                      
                      {msg.debate.stats && (
                        <div className="stats">
                          💰 ${(msg.debate.stats.totalCost || 0).toFixed(4)} · 
                          ⏱️ {msg.debate.stats.totalTime || 0}s · 
                          🔄 {msg.debate.stats.totalRounds || 0} rondas
                          {msg.debate.synthesizer && (
                            <>
                              {' · '}
                              🤖 Síntesis: {msg.debate.synthesizer.synthesizerName}
                              {msg.debate.synthesizer.wasRandom && ' (🎲)'}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="message assistant">
                <div className="message-content">
                  <div className="typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="typing-text">
                    {mode === 'voting' ? 'Debatiendo y votando...' : 'Las IAs están colaborando...'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="input-area">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Escribe tu mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
            rows={2}
            disabled={isProcessing}
          />
          <button onClick={handleSend} disabled={!inputValue.trim() || isProcessing} className="send-btn">
            🚀 Enviar
          </button>
        </div>
      </div>
    </div>
  )
}
