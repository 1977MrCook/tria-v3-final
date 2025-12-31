import { useState } from 'react'
import './App.css'

const AVAILABLE_MODELS = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Modelo más avanzado de OpenAI', icon: '🟢', provider: 'openai' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Versión rápida y económica', icon: '🟢', provider: 'openai' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Equilibrio perfecto', icon: '🟣', provider: 'anthropic' },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Máxima inteligencia', icon: '🟣', provider: 'anthropic' },
  ],
  google: [
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Modelo estable y potente', icon: '🔵', provider: 'google' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Ultrarrápido', icon: '🔵', provider: 'google' },
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
  
  const [currency, setCurrency] = useState('CLP')
  const [budgetLimit, setBudgetLimit] = useState(50000)
  const [totalSpent, setTotalSpent] = useState(0)
  const [responseCount, setResponseCount] = useState(0)

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
          mode: mode === 'collaborative' ? 'roles' : mode === 'voting' ? 'debate' : 'hybrid',
          conversationHistory: messages.slice(-6)
        })
      })

      if (!response.ok) throw new Error('Error en la respuesta')

      const data = await response.json()
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.finalResponse,
        debate: data.debate
      }])

      if (data.debate?.stats?.totalCost) {
        setTotalSpent(prev => prev + (data.debate.stats.totalCost * 800))
      }
      setResponseCount(prev => prev + 1)

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

  const budgetPercentage = Math.min((totalSpent / budgetLimit) * 100, 100)

  return (
    <div className="app-container">
      {showConfig && <div className="overlay" onClick={() => setShowConfig(false)} />}

      {/* Config Modal */}
      <div className={`config-modal ${showConfig ? 'open' : ''}`}>
        <div className="config-header">
          <h2>⚙️ Configuración</h2>
          <button onClick={() => setShowConfig(false)} className="close-btn">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-section">
            <img src="/logo-tria.jpg" alt="TrIA" className="logo" />
            <div>
              <div className="logo-text">TrIA</div>
              <div className="version">Platform v3.0</div>
            </div>
          </div>
          
          <button onClick={() => { setMessages([]); setInputValue(''); setTotalSpent(0); setResponseCount(0) }} className="new-chat-btn">
            + Nueva Conversación
          </button>
        </div>

        <nav className="sidebar-nav">
          <a href="#" className="nav-item active">
            <span>💬</span>
            <span>Chat</span>
            <span className="badge">{messages.length}</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="powered-by">Powered by Multi-AI</div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-area">
        {/* Header */}
        <header className="header">
          <div>
            <h1 className="header-title">Orquestación Multi-IA</h1>
            <p className="header-status">
              <span className="status-indicator" />
              <span className="status-text">LIVE</span>
              <span>·</span>
              <span>Listo para colaborar</span>
            </p>
          </div>
          <div className="header-stats">
            <div className="stat-card green">
              <div className="stat-value">{responseCount}</div>
              <div className="stat-label">respuestas</div>
            </div>
            
            <div className="stat-card blue">
              <div className="stat-value">${(totalSpent / 1000).toFixed(2)}</div>
              <div className="stat-label">gastado</div>
            </div>
            
            <button onClick={() => setShowConfig(true)} className="settings-btn">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Controls */}
        <div className="controls">
          <div className="controls-inner">
            {/* Mode Selector */}
            <div className="control-group">
              <label className="control-label">Modo de colaboración</label>
              <div className="mode-buttons">
                {[
                  { id: 'collaborative', icon: '👥', label: 'Colaborativo' },
                  { id: 'voting', icon: '📋', label: 'Votación' },
                  { id: 'hybrid', icon: '⚡', label: 'Híbrido' }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`mode-btn ${mode === m.id ? 'active' : ''}`}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selector */}
            <div className="control-group">
              <label className="control-label">🤖 Selecciona las IAs</label>
              
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
                        <div className="model-instructions">
                          <textarea
                            value={modelInstructions[model.id] || ''}
                            onChange={(e) => setInstruction(model.id, e.target.value)}
                            placeholder={`Instrucciones para ${model.name}...`}
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
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          <div className="messages">
            {messages.length === 0 && (
              <div className="welcome">
                <h2>¡Bienvenido a TrIA Platform!</h2>
                <p>Selecciona tus IAs y empieza a colaborar</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-content">
                  <p>{msg.content}</p>
                  
                  {msg.debate && msg.debate.rounds && (
                    <div className="debate-info">
                      <h4>📋 Proceso de colaboración:</h4>
                      {msg.debate.rounds.map((round, ridx) => (
                        <div key={ridx} className="round">
                          <strong>Ronda {ridx + 1}:</strong>
                          {round.responses.map((resp, respIdx) => (
                            <div key={respIdx} className="response">
                              <strong>{resp.model}:</strong>
                              <p>{resp.content?.substring(0, 200)}...</p>
                            </div>
                          ))}
                        </div>
                      ))}
                      <div className="stats">
                        <span>💰 ${(msg.debate.stats?.totalCost || 0).toFixed(4)}</span>
                        <span>⏱️ {msg.debate.stats?.totalTime || 0}s</span>
                        <span>🔄 {msg.debate.stats?.totalRounds || 0} rondas</span>
                      </div>
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
                  <span className="typing-text">Las IAs están pensando...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="input-area">
          <div className="input-container">
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
              rows={3}
              disabled={isProcessing}
            />
            <button onClick={handleSend} disabled={!inputValue.trim() || isProcessing} className="send-btn">
              🚀 Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
