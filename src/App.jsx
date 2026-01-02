import { useState, useEffect } from 'react'

// ============================================================================
// ML ENGINE (INLINE)
// ============================================================================

const STORAGE_KEY = 'tria_evaluations'
const ML_SETTINGS_KEY = 'tria_ml_settings'

const PHASES = {
  LEARNING: 'learning',
  SUGGESTED: 'suggested',
  OPTIMIZED: 'optimized'
}

function saveEvaluation(evaluation) {
  const evaluations = getEvaluations()
  evaluations.push({
    ...evaluation,
    timestamp: Date.now(),
    id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(evaluations))
  return evaluations
}

function getEvaluations() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error loading evaluations:', error)
    return []
  }
}

function clearEvaluations() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(ML_SETTINGS_KEY)
}

function getMLSettings() {
  try {
    const data = localStorage.getItem(ML_SETTINGS_KEY)
    return data ? JSON.parse(data) : {
      mode: 'auto',
      fixedSynthesizer: null,
      acceptedRecommendation: false
    }
  } catch (error) {
    return {
      mode: 'auto',
      fixedSynthesizer: null,
      acceptedRecommendation: false
    }
  }
}

function saveMLSettings(settings) {
  localStorage.setItem(ML_SETTINGS_KEY, JSON.stringify(settings))
}

function analyzeSynthesizerPerformance(evaluations) {
  if (!evaluations || evaluations.length === 0) return {}

  const performance = {}
  
  evaluations.forEach(e => {
    const synth = e.synthesizer
    if (!synth) return
    
    if (!performance[synth]) {
      performance[synth] = {
        count: 0,
        totalRating: 0,
        totalCost: 0,
        totalTime: 0,
        ratings: [],
        byMode: {}
      }
    }
    
    const avgRating = e.avgRating || calculateAvgRating(e.ratings)
    
    performance[synth].count++
    performance[synth].totalRating += avgRating
    performance[synth].totalCost += e.cost || 0
    performance[synth].totalTime += e.time || 0
    performance[synth].ratings.push(avgRating)
    
    const mode = e.mode || 'unknown'
    if (!performance[synth].byMode[mode]) {
      performance[synth].byMode[mode] = { count: 0, totalRating: 0 }
    }
    performance[synth].byMode[mode].count++
    performance[synth].byMode[mode].totalRating += avgRating
  })
  
  Object.keys(performance).forEach(synth => {
    const p = performance[synth]
    
    p.avgRating = p.totalRating / p.count
    p.avgCost = p.totalCost / p.count
    p.avgTime = p.totalTime / p.count
    
    const variance = p.ratings.reduce((sum, r) => {
      return sum + Math.pow(r - p.avgRating, 2)
    }, 0) / p.count
    p.stdDev = Math.sqrt(variance)
    p.consistency = Math.max(0, 10 - p.stdDev)
    
    p.score = (
      p.avgRating * 0.60 +
      p.consistency * 0.20 +
      (1 / Math.max(p.avgCost, 0.001)) * 0.10 * 0.10 +
      (1 / Math.max(p.avgTime, 1)) * 0.10 * 10
    )
    
    Object.keys(p.byMode).forEach(mode => {
      const modeData = p.byMode[mode]
      modeData.avgRating = modeData.totalRating / modeData.count
    })
  })
  
  return performance
}

function calculateAvgRating(ratings) {
  if (!ratings || typeof ratings !== 'object') return 5
  const values = Object.values(ratings)
  if (values.length === 0) return 5
  return values.reduce((a, b) => a + b, 0) / values.length
}

function getCurrentPhase(evaluations) {
  const count = evaluations.length
  
  if (count < 20) {
    return {
      phase: PHASES.LEARNING,
      progress: (count / 20) * 100,
      count: count,
      target: 20,
      message: `Aprendiendo... ${count}/20 evaluaciones`
    }
  }
  
  if (count < 50) {
    return {
      phase: PHASES.SUGGESTED,
      progress: ((count - 20) / 30) * 100,
      count: count,
      target: 50,
      message: `Recopilando datos... ${count}/50 evaluaciones`
    }
  }
  
  return {
    phase: PHASES.OPTIMIZED,
    progress: 100,
    count: count,
    target: count,
    message: `Sistema optimizado con ${count} evaluaciones`
  }
}

function getPerformanceStats(evaluations) {
  const performance = analyzeSynthesizerPerformance(evaluations)
  const phase = getCurrentPhase(evaluations)
  
  const sorted = Object.keys(performance)
    .map(id => ({
      id,
      ...performance[id]
    }))
    .sort((a, b) => b.score - a.score)
  
  return {
    phase,
    synthesizers: sorted,
    totalEvaluations: evaluations.length,
    avgRatingOverall: evaluations.length > 0
      ? evaluations.reduce((sum, e) => sum + (e.avgRating || 5), 0) / evaluations.length
      : 0
  }
}

// ============================================================================
// RATING MODAL (INLINE)
// ============================================================================

const RATING_CRITERIA = [
  { key: 'quality', label: 'Calidad General', icon: '📊' },
  { key: 'speed', label: 'Velocidad', icon: '⚡' },
  { key: 'costBenefit', label: 'Costo-Beneficio', icon: '💰' },
  { key: 'clarity', label: 'Claridad', icon: '💡' },
  { key: 'completeness', label: 'Completitud', icon: '✅' },
  { key: 'accuracy', label: 'Precisión', icon: '🎯' }
]

function RatingModal({ isOpen, onClose, onSubmit, debate }) {
  const [ratings, setRatings] = useState({
    quality: 7,
    speed: 7,
    costBenefit: 7,
    clarity: 7,
    completeness: 7,
    accuracy: 7
  })
  const [comment, setComment] = useState('')
  const [hoveredCriterion, setHoveredCriterion] = useState(null)
  const [hoveredValue, setHoveredValue] = useState(null)

  if (!isOpen) return null

  const handleSubmit = () => {
    const avgRating = Object.values(ratings).reduce((a, b) => a + b, 0) / 6
    onSubmit({
      ratings,
      avgRating,
      comment: comment.trim(),
      cost: debate?.stats?.totalCost || 0,
      time: parseFloat(debate?.stats?.totalTime || 0),
      synthesizer: debate?.synthesizer?.synthesizer || null,
      synthesizerName: debate?.synthesizer?.synthesizerName || null
    })
    onClose()
  }

  const handleSkip = () => {
    onClose()
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="rating-modal" style={{ display: 'flex' }}>
        <div className="modal-header">
          <h2>⭐ Evalúa esta respuesta</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="modal-body">
          <div className="rating-criteria">
            {RATING_CRITERIA.map(criterion => (
              <div key={criterion.key} className="criterion-row">
                <div className="criterion-label">
                  <span className="criterion-icon">{criterion.icon}</span>
                  <span className="criterion-name">{criterion.label}</span>
                </div>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
                    <button
                      key={value}
                      className={`star ${value <= ratings[criterion.key] ? 'filled' : ''} ${
                        hoveredCriterion === criterion.key && value <= hoveredValue ? 'hovered' : ''
                      }`}
                      onClick={() => setRatings({ ...ratings, [criterion.key]: value })}
                      onMouseEnter={() => {
                        setHoveredCriterion(criterion.key)
                        setHoveredValue(value)
                      }}
                      onMouseLeave={() => {
                        setHoveredCriterion(null)
                        setHoveredValue(null)
                      }}
                    >
                      ⭐
                    </button>
                  ))}
                  <span className="rating-value">{ratings[criterion.key]}/10</span>
                </div>
              </div>
            ))}
          </div>

          <div className="comment-section">
            <label>💬 Comentario (opcional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="¿Qué te gustó o qué mejorarías?"
              rows={3}
            />
          </div>

          {debate?.synthesizer && (
            <div className="synthesis-info">
              <small>
                🤖 Síntesis: <strong>{debate.synthesizer.synthesizerName}</strong>
                {debate.synthesizer.wasRandom && ' (aleatorio)'}
                {debate.synthesizer.wonVoting && ` (ganó ${debate.synthesizer.votes}/${debate.synthesizer.totalVotes} votos)`}
              </small>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={handleSkip} className="btn-secondary">
            Omitir
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            Enviar Evaluación
          </button>
        </div>
      </div>
    </>
  )
}

// ============================================================================
// ML DASHBOARD (INLINE)
// ============================================================================

function MLDashboard({ evaluations, models, onClose }) {
  const stats = getPerformanceStats(evaluations)
  const settings = getMLSettings()

  const handleModeChange = (mode) => {
    saveMLSettings({ ...settings, mode, acceptedRecommendation: mode !== 'auto' })
  }

  const handleFixedSynthesizerChange = (synthesizerId) => {
    saveMLSettings({ ...settings, fixedSynthesizer: synthesizerId })
  }

  const handleClearData = () => {
    if (confirm('¿Seguro que quieres borrar todos los datos de aprendizaje? Esta acción no se puede deshacer.')) {
      clearEvaluations()
      alert('Datos borrados. El sistema comenzará a aprender desde cero.')
      onClose()
    }
  }

  return (
    <div className="ml-dashboard" style={{ display: 'flex' }}>
      <div className="dashboard-header">
        <h2>🤖 Machine Learning</h2>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      <div className="dashboard-body">
        <div className="ml-status">
          <h3>📊 Estado del Sistema</h3>
          <div className="phase-indicator">
            <div className="phase-badge" data-phase={stats.phase.phase}>
              {stats.phase.phase === 'learning' && '🌱 Aprendiendo'}
              {stats.phase.phase === 'suggested' && '📈 Recopilando'}
              {stats.phase.phase === 'optimized' && '✅ Optimizado'}
            </div>
            <p>{stats.phase.message}</p>
          </div>
          
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.min(stats.phase.progress, 100)}%` }}
              />
            </div>
            <span className="progress-label">{Math.round(stats.phase.progress)}%</span>
          </div>
        </div>

        {stats.synthesizers.length > 0 && (
          <div className="synthesizer-stats">
            <h3>⭐ Rendimiento de Sintetizadores</h3>
            <div className="stats-table">
              {stats.synthesizers.map((synth, idx) => {
                const model = models.find(m => m.id === synth.id)
                return (
                  <div key={synth.id} className="stat-row" data-rank={idx + 1}>
                    <div className="stat-rank">#{idx + 1}</div>
                    <div className="stat-info">
                      <div className="stat-name">
                        {model?.name || synth.id}
                        {idx === 0 && <span className="badge-best">MEJOR</span>}
                      </div>
                      <div className="stat-metrics">
                        <span>⭐ {synth.avgRating.toFixed(1)}/10</span>
                        <span>📊 Consistencia: {synth.consistency.toFixed(1)}/10</span>
                        <span>🔢 {synth.count} veces</span>
                        <span>💰 ${synth.avgCost.toFixed(4)}</span>
                        <span>⏱️ {synth.avgTime.toFixed(1)}s</span>
                      </div>
                    </div>
                    <div className="stat-score">
                      <div className="score-circle">{synth.score.toFixed(1)}</div>
                      <small>Score</small>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="ml-settings">
          <h3>⚙️ Configuración</h3>
          
          <div className="setting-group">
            <label>Modo de Síntesis</label>
            <div className="radio-group">
              <label>
                <input 
                  type="radio" 
                  name="ml-mode" 
                  value="auto"
                  checked={settings.mode === 'auto'}
                  onChange={() => handleModeChange('auto')}
                />
                <span>Automático (ML Inteligente) ✨</span>
              </label>
              <label>
                <input 
                  type="radio" 
                  name="ml-mode" 
                  value="random"
                  checked={settings.mode === 'random'}
                  onChange={() => handleModeChange('random')}
                />
                <span>Siempre Aleatorio 🎲</span>
              </label>
              <label>
                <input 
                  type="radio" 
                  name="ml-mode" 
                  value="fixed"
                  checked={settings.mode === 'fixed'}
                  onChange={() => handleModeChange('fixed')}
                />
                <span>Forzar Específico 🎯</span>
              </label>
            </div>
          </div>

          {settings.mode === 'fixed' && (
            <div className="setting-group">
              <label>Sintetizador Fijo</label>
              <select 
                value={settings.fixedSynthesizer || ''}
                onChange={(e) => handleFixedSynthesizerChange(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="ml-actions">
          <button onClick={handleClearData} className="btn-danger">
            🗑️ Borrar Datos de Aprendizaje
          </button>
          <p className="warning-text">
            <small>⚠️ Esto reiniciará el sistema desde cero</small>
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN APP
// ============================================================================

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
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Rápido y eficiente', icon: '🔵', provider: 'google' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Máxima capacidad', icon: '🔵', provider: 'google' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', description: 'Ultra rápido', icon: '🔵', provider: 'google' },
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
          systemPrompt: modelInstructions[id] || `Eres ${model.name}. IMPORTANTE: Estás en TrIA Platform, un sistema de orquestación multi-IA donde múltiples modelos colaboran en tiempo real. Cuando veas respuestas de otras IAs, léelas atentamente y construye sobre ellas para crear una respuesta mejorada y más completa.`
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, sans-serif;
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
        }
        
        body, html {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
        }
        
        :root {
          --electric-blue: #0ea5e9;
          --cyan: #06b6d4;
          --success: #10b981;
          --text-primary: #0f172a;
          --text-secondary: #64748b;
          --border: #e2e8f0;
        }
        
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-8px); opacity: 1; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .app-container {
          display: flex;
          height: 100vh;
          overflow: hidden;
          background: linear-gradient(180deg, #f0f9ff 0%, #ecfeff 100%);
        }
        
        .sidebar {
          width: 280px;
          min-width: 280px;
          background: white;
          border-right: 2px solid var(--border);
          display: flex;
          flex-direction: column;
          box-shadow: 4px 0 20px rgba(14, 165, 233, 0.08);
        }
        
        .sidebar-header {
          padding: 24px 20px;
          border-bottom: 2px solid var(--border);
        }
        
        .logo {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          object-fit: cover;
          box-shadow: 0 10px 30px rgba(14, 165, 233, 0.3);
          border: 3px solid white;
        }
        
        .logo-text {
          margin-top: 12px;
          font-weight: 900;
          font-size: 24px;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        
        .new-chat-btn {
          margin-top: 16px;
          width: 100%;
          border: none;
          border-radius: 16px;
          padding: 14px;
          font-weight: 800;
          font-size: 14px;
          color: white;
          cursor: pointer;
          background: linear-gradient(135deg, var(--electric-blue), var(--cyan));
          box-shadow: 0 12px 28px rgba(14, 165, 233, 0.3);
          transition: all 0.3s;
        }
        
        .new-chat-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 36px rgba(14, 165, 233, 0.4);
        }
        
        .sidebar-nav {
          padding: 12px;
        }
        
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 6px;
        }
        
        .nav-item:hover {
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(6, 182, 212, 0.08));
          color: var(--electric-blue);
        }
        
        .nav-item.active {
          color: var(--electric-blue);
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(6, 182, 212, 0.12));
          border: 2px solid rgba(14, 165, 233, 0.2);
        }
        
        .badge {
          margin-left: auto;
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 800;
          background: var(--electric-blue);
          color: white;
        }
        
        .ml-mini-status {
          padding: 16px;
          margin: 16px 12px;
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.05), rgba(6, 182, 212, 0.05));
          border-radius: 16px;
          border: 2px solid rgba(14, 165, 233, 0.15);
        }
        
        .ml-mini-status h4 {
          margin: 0 0 10px 0;
          font-size: 13px;
          font-weight: 800;
          color: var(--text-primary);
        }
        
        .mini-phase-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 10px;
        }
        
        .mini-phase-badge[data-phase="learning"] {
          background: rgba(16, 185, 129, 0.12);
          color: #047857;
        }
        
        .mini-phase-badge[data-phase="suggested"] {
          background: rgba(14, 165, 233, 0.12);
          color: #0369a1;
        }
        
        .mini-phase-badge[data-phase="optimized"] {
          background: rgba(16, 185, 129, 0.15);
          color: #047857;
        }
        
        .mini-progress {
          height: 6px;
          background: rgba(226, 232, 240, 0.5);
          border-radius: 999px;
          margin-bottom: 10px;
          overflow: hidden;
        }
        
        .mini-progress-fill {
          height: 100%;
          background: linear-gradient(to right, var(--electric-blue), var(--cyan));
          border-radius: 999px;
          transition: width 0.4s;
        }
        
        .ml-mini-status small {
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 600;
        }
        
        .main-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .header {
          padding: 20px 28px;
          border-bottom: 2px solid var(--border);
          background: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 16px rgba(14, 165, 233, 0.06);
        }
        
        .header-title {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        
        .header-stats {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .stat-card {
          padding: 12px 16px;
          border-radius: 16px;
          border: 2px solid;
          background: white;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
          font-weight: 800;
          font-size: 13px;
          transition: all 0.2s;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
        }
        
        .stat-card.green {
          border-color: rgba(16, 185, 129, 0.3);
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.06));
          color: #047857;
        }
        
        .stat-card.blue {
          border-color: rgba(14, 165, 233, 0.3);
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(6, 182, 212, 0.06));
          color: #0369a1;
        }
        
        .stat-value {
          font-size: 18px;
          font-weight: 900;
        }
        
        .stat-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        
        .settings-btn {
          border: 2px solid var(--border);
          background: white;
          width: 44px;
          height: 44px;
          border-radius: 16px;
          cursor: pointer;
          font-size: 20px;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }
        
        .settings-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
          border-color: var(--electric-blue);
        }
        
        .controls-bar {
          padding: 16px 28px;
          border-bottom: 2px solid var(--border);
          background: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        
        .mode-buttons-compact {
          display: flex;
          gap: 10px;
        }
        
        .mode-btn-compact {
          border: 2px solid var(--border);
          background: white;
          padding: 12px 16px;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 800;
          font-size: 13px;
          transition: all 0.2s;
          color: var(--text-secondary);
        }
        
        .mode-btn-compact:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(14, 165, 233, 0.15);
          color: var(--electric-blue);
        }
        
        .mode-btn-compact.active {
          color: white;
          background: linear-gradient(135deg, var(--electric-blue), var(--cyan));
          box-shadow: 0 12px 28px rgba(14, 165, 233, 0.3);
          border-color: transparent;
        }
        
        .toggle-models-btn {
          border: 2px solid var(--border);
          background: white;
          padding: 12px 16px;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 800;
          font-size: 13px;
          transition: all 0.2s;
          color: var(--text-primary);
        }
        
        .toggle-models-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(14, 165, 233, 0.15);
          border-color: var(--electric-blue);
        }
        
        .controls {
          padding: 20px 28px;
          overflow: auto;
          max-height: 400px;
          background: white;
          border-bottom: 2px solid var(--border);
        }
        
        .controls-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        
        .provider-section {
          margin-bottom: 20px;
        }
        
        .provider-label {
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-bottom: 12px;
          letter-spacing: 0.05em;
        }
        
        .model-card {
          border: 2px solid var(--border);
          background: white;
          border-radius: 18px;
          padding: 16px;
          margin-bottom: 12px;
          transition: all 0.2s;
          animation: fadeIn 0.3s;
        }
        
        .model-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(14, 165, 233, 0.12);
        }
        
        .model-card.selected {
          border-color: var(--electric-blue);
          box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2), 0 12px 28px rgba(14, 165, 233, 0.2);
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.03), rgba(6, 182, 212, 0.03));
        }
        
        .model-header {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }
        
        .model-header input[type="checkbox"] {
          width: 20px;
          height: 20px;
          accent-color: var(--electric-blue);
          cursor: pointer;
        }
        
        .model-info {
          flex: 1;
        }
        
        .model-name {
          font-weight: 900;
          color: var(--text-primary);
          font-size: 15px;
        }
        
        .model-desc {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 2px;
          font-weight: 600;
        }
        
        .model-icon {
          font-size: 22px;
        }
        
        .model-instructions-container {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 2px solid var(--border);
        }
        
        .model-instructions {
          width: 100%;
          min-height: 70px;
          border-radius: 14px;
          border: 2px solid var(--border);
          background: linear-gradient(135deg, rgba(248, 250, 252, 0.8), white);
          padding: 12px;
          resize: vertical;
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 600;
          outline: none;
          transition: all 0.2s;
        }
        
        .model-instructions::placeholder {
          color: var(--text-secondary);
        }
        
        .model-instructions:focus {
          border-color: var(--electric-blue);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }
        
        .chat-area {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px 28px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .welcome {
          text-align: center;
          padding: 100px 20px;
        }
        
        .welcome h2 {
          font-size: 28px;
          font-weight: 900;
          margin-bottom: 12px;
          color: var(--text-primary);
        }
        
        .welcome p {
          color: var(--text-secondary);
          font-size: 16px;
          font-weight: 600;
        }
        
        .ml-welcome-hint {
          font-size: 15px;
          color: var(--electric-blue);
          margin-top: 16px;
          font-weight: 700;
        }
        
        .message {
          display: flex;
          width: 100%;
          animation: fadeIn 0.3s;
        }
        
        .message.user {
          justify-content: flex-end;
        }
        
        .message.assistant {
          justify-content: flex-start;
        }
        
        .message-content {
          max-width: 760px;
          border-radius: 20px;
          padding: 16px 18px;
          font-size: 15px;
          line-height: 1.6;
          font-weight: 600;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        }
        
        .message.user .message-content {
          color: white;
          background: linear-gradient(135deg, var(--electric-blue), var(--cyan));
          box-shadow: 0 12px 28px rgba(14, 165, 233, 0.3);
        }
        
        .message.assistant .message-content {
          background: white;
          border: 2px solid var(--border);
          color: var(--text-primary);
        }
        
        .message.assistant .message-content p {
          margin: 0 0 10px 0;
        }
        
        .debate-info {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 2px solid var(--border);
          font-size: 13px;
        }
        
        .debate-info details {
          cursor: pointer;
        }
        
        .debate-info summary {
          font-weight: 800;
          color: var(--electric-blue);
          margin-bottom: 10px;
        }
        
        .round {
          margin-top: 10px;
          padding: 10px;
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.05), rgba(6, 182, 212, 0.05));
          border-radius: 12px;
          border: 2px solid rgba(14, 165, 233, 0.1);
        }
        
        .round strong {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          color: var(--text-primary);
          font-weight: 800;
        }
        
        .response {
          margin: 8px 0;
          padding: 8px;
          background: white;
          border-radius: 10px;
          font-size: 12px;
          border: 2px solid var(--border);
        }
        
        .response strong {
          color: var(--electric-blue);
          font-weight: 800;
        }
        
        .response p {
          margin: 6px 0 0 0;
          color: var(--text-primary);
          font-weight: 600;
        }
        
        .stats {
          font-size: 12px;
          font-weight: 800;
          color: var(--text-secondary);
          padding: 8px 12px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(6, 182, 212, 0.08));
          display: inline-block;
          margin-top: 10px;
          border: 2px solid rgba(14, 165, 233, 0.15);
        }
        
        .typing {
          display: inline-flex;
          gap: 8px;
          padding: 10px;
        }
        
        .typing span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--electric-blue);
          animation: bounce 1.4s infinite;
        }
        
        .typing span:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .typing span:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        .typing-text {
          font-size: 13px;
          font-weight: 800;
          color: var(--electric-blue);
          margin-left: 10px;
        }
        
        .input-area {
          padding: 20px 28px;
          border-top: 2px solid var(--border);
          background: white;
          display: flex;
          gap: 14px;
          align-items: flex-end;
          box-shadow: 0 -4px 16px rgba(14, 165, 233, 0.06);
        }
        
        .input-area textarea {
          flex: 1;
          min-height: 54px;
          max-height: 180px;
          padding: 14px 16px;
          border-radius: 18px;
          border: 2px solid var(--border);
          resize: none;
          font-size: 15px;
          color: var(--text-primary);
          font-weight: 600;
          outline: none;
          transition: all 0.2s;
          background: linear-gradient(135deg, rgba(248, 250, 252, 0.5), white);
        }
        
        .input-area textarea::placeholder {
          color: var(--text-secondary);
        }
        
        .input-area textarea:focus {
          border-color: var(--electric-blue);
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1);
          background: white;
        }
        
        .send-btn {
          border: none;
          cursor: pointer;
          padding: 14px 20px;
          border-radius: 18px;
          font-weight: 900;
          font-size: 15px;
          color: white;
          background: linear-gradient(135deg, var(--electric-blue), var(--cyan));
          transition: all 0.2s;
          box-shadow: 0 12px 28px rgba(14, 165, 233, 0.3);
        }
        
        .send-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 16px 36px rgba(14, 165, 233, 0.4);
        }
        
        .send-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 40;
        }
        
        .config-modal, .ml-dashboard, .rating-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          background: white;
          border-radius: 24px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
          z-index: 50;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .config-modal.open {
          animation: fadeIn 0.3s;
        }
        
        .modal-header, .config-header, .dashboard-header {
          padding: 28px;
          border-bottom: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .modal-header h2, .config-header h2, .dashboard-header h2 {
          font-size: 22px;
          font-weight: 900;
          margin: 0;
          color: var(--text-primary);
        }
        
        .close-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 32px;
          line-height: 1;
          padding: 0;
          width: 36px;
          height: 36px;
          transition: all 0.2s;
        }
        
        .close-btn:hover {
          color: var(--text-primary);
          transform: rotate(90deg);
        }
        
        .modal-body, .config-content, .dashboard-body {
          flex: 1;
          overflow-y: auto;
          padding: 28px;
        }
        
        .budget-display {
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.05), rgba(6, 182, 212, 0.05));
          padding: 20px;
          border-radius: 16px;
          margin-top: 16px;
          border: 2px solid rgba(14, 165, 233, 0.15);
        }
        
        .budget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }
        
        .budget-header .percentage {
          font-size: 16px;
          font-weight: 900;
          color: var(--electric-blue);
        }
        
        .progress-bar {
          width: 100%;
          height: 10px;
          background: rgba(226, 232, 240, 0.5);
          border-radius: 999px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(to right, var(--electric-blue), var(--cyan));
          transition: width 0.4s;
        }
        
        .budget-values {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          font-size: 13px;
          font-weight: 700;
        }
        
        .budget-values span:first-child {
          color: var(--text-primary);
        }
        
        .budget-values span:last-child {
          color: var(--text-secondary);
        }
        
        .form-group {
          margin-bottom: 16px;
        }
        
        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        
        .form-group select, .form-group input {
          width: 100%;
          padding: 12px 14px;
          border: 2px solid var(--border);
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          outline: none;
          transition: all 0.2s;
        }
        
        .form-group select:focus, .form-group input:focus {
          border-color: var(--electric-blue);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }
        
        .config-section {
          margin-bottom: 28px;
        }
        
        .config-section h3 {
          font-size: 14px;
          font-weight: 900;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-bottom: 16px;
          letter-spacing: 0.05em;
        }
        
        .rating-criteria {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .criterion-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        
        .criterion-label {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 140px;
        }
        
        .criterion-icon {
          font-size: 20px;
        }
        
        .criterion-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .star-rating {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .star {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          opacity: 0.3;
          transition: all 0.15s;
          padding: 0;
        }
        
        .star.filled, .star.hovered {
          opacity: 1;
          transform: scale(1.1);
        }
        
        .rating-value {
          font-size: 14px;
          font-weight: 700;
          color: var(--electric-blue);
          margin-left: 8px;
          min-width: 40px;
        }
        
        .comment-section {
          margin-top: 20px;
        }
        
        .comment-section label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--text-primary);
        }
        
        .comment-section textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid var(--border);
          border-radius: 14px;
          resize: vertical;
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 600;
          outline: none;
          transition: all 0.2s;
        }
        
        .comment-section textarea:focus {
          border-color: var(--electric-blue);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }
        
        .synthesis-info {
          margin-top: 16px;
          padding: 12px;
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.05), rgba(6, 182, 212, 0.05));
          border-radius: 10px;
        }
        
        .synthesis-info small {
          color: var(--text-primary);
          font-weight: 600;
        }
        
        .modal-footer {
          padding: 16px 24px;
          border-top: 2px solid var(--border);
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        
        .btn-primary, .btn-secondary, .btn-danger {
          padding: 12px 24px;
          border-radius: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          border: none;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, var(--electric-blue), var(--cyan));
          color: white;
          box-shadow: 0 8px 20px rgba(14, 165, 233, 0.3);
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(14, 165, 233, 0.4);
        }
        
        .btn-secondary {
          background: var(--border);
          color: var(--text-secondary);
        }
        
        .btn-secondary:hover {
          background: #cbd5e1;
        }
        
        .btn-danger {
          background: #ef4444;
          color: white;
        }
        
        .btn-danger:hover {
          background: #dc2626;
        }
        
        .ml-status, .synthesizer-stats, .ml-settings {
          margin-bottom: 24px;
        }
        
        .ml-status h3, .synthesizer-stats h3, .ml-settings h3 {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 12px;
          color: var(--text-primary);
        }
        
        .phase-indicator p {
          color: var(--text-secondary);
          font-weight: 600;
          margin: 8px 0;
        }
        
        .phase-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        
        .phase-badge[data-phase="learning"] {
          background: rgba(16, 185, 129, 0.1);
          color: #065f46;
        }
        
        .phase-badge[data-phase="suggested"] {
          background: rgba(14, 165, 233, 0.1);
          color: #0b4f74;
        }
        
        .phase-badge[data-phase="optimized"] {
          background: rgba(16, 185, 129, 0.15);
          color: #065f46;
        }
        
        .progress-bar-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
        }
        
        .progress-label {
          font-size: 14px;
          font-weight: 700;
          color: var(--electric-blue);
        }
        
        .stats-table {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .stat-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.03), rgba(6, 182, 212, 0.03));
          border-radius: 12px;
          border: 2px solid var(--border);
        }
        
        .stat-row[data-rank="1"] {
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(6, 182, 212, 0.06));
          border-color: var(--electric-blue);
        }
        
        .stat-rank {
          font-size: 20px;
          font-weight: 900;
          color: var(--text-secondary);
          min-width: 40px;
          text-align: center;
        }
        
        .stat-info {
          flex: 1;
        }
        
        .stat-name {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
        }
        
        .badge-best {
          background: var(--electric-blue);
          color: white;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 10px;
        }
        
        .stat-metrics {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 600;
        }
        
        .stat-score {
          text-align: center;
        }
        
        .score-circle {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--electric-blue), var(--cyan));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 900;
        }
        
        .score-circle + small {
          margin-top: 4px;
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 700;
        }
        
        .setting-group {
          margin-bottom: 16px;
        }
        
        .setting-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--text-primary);
        }
        
        .radio-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .radio-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: normal;
          cursor: pointer;
          color: var(--text-primary);
        }
        
        .radio-group input[type="radio"] {
          width: 18px;
          height: 18px;
          accent-color: var(--electric-blue);
        }
        
        .setting-group select {
          width: 100%;
          padding: 12px 14px;
          border: 2px solid var(--border);
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          outline: none;
          transition: all 0.2s;
        }
        
        .setting-group select:focus {
          border-color: var(--electric-blue);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }
        
        .ml-actions {
          text-align: center;
        }
        
        .warning-text {
          margin-top: 8px;
          color: #ef4444;
        }
      `}</style>
      
      <div className="app-container">
        {showConfig && <div className="overlay" onClick={() => setShowConfig(false)} />}
        {showMLDashboard && <div className="overlay" onClick={() => setShowMLDashboard(false)} />}

        <div className={`config-modal ${showConfig ? 'open' : ''}`} style={{ display: showConfig ? 'flex' : 'none' }}>
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

        {showMLDashboard && (
          <MLDashboard 
            evaluations={evaluations}
            models={allModels}
            onClose={() => setShowMLDashboard(false)}
          />
        )}

        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          onSubmit={handleRatingSubmit}
          debate={pendingRating?.debate}
        />

        <aside className="sidebar">
          <div className="sidebar-header">
            <img src="/logo-tria.jpg" alt="TrIA" className="logo" />
            <div className="logo-text">TrIA</div>
            <button onClick={() => { setMessages([]); setInputValue(''); setTotalSpent(0); setResponseCount(0) }} className="new-chat-btn">
              + Nueva Conversación
            </button>
          </div>

          <nav className="sidebar-nav">
            <a href="#" className="nav-item active" onClick={(e) => e.preventDefault()}>
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

        <div className="main-area">
          <header className="header">
            <div>
              <h1 className="header-title">TrIA Platform v4.2 FIXED</h1>
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

          <div className="chat-area">
            <div className="messages">
              {messages.length === 0 && (
                <div className="welcome">
                  <h2>¡Bienvenido a TrIA Platform v4.2!</h2>
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
    </>
  )
}
