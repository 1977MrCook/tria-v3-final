import { getPerformanceStats, getMLSettings, saveMLSettings, clearEvaluations } from './mlEngine'

export default function MLDashboard({ evaluations, models, onClose }) {
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
    <div className="ml-dashboard">
      <div className="dashboard-header">
        <h2>🤖 Machine Learning</h2>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      <div className="dashboard-body">
        {/* Estado actual */}
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

        {/* Performance de sintetizadores */}
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

        {/* Configuración */}
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

        {/* Acciones */}
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
