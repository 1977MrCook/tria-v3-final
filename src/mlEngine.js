// TrIA v4.0 - Machine Learning Engine

export const STORAGE_KEY = 'tria_evaluations'
export const ML_SETTINGS_KEY = 'tria_ml_settings'

export const PHASES = {
  LEARNING: 'learning',      // 0-20 evaluaciones
  SUGGESTED: 'suggested',    // 20-50 evaluaciones
  OPTIMIZED: 'optimized'     // 50+ evaluaciones
}

export function saveEvaluation(evaluation) {
  const evaluations = getEvaluations()
  evaluations.push({
    ...evaluation,
    timestamp: Date.now(),
    id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(evaluations))
  return evaluations
}

export function getEvaluations() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error loading evaluations:', error)
    return []
  }
}

export function clearEvaluations() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(ML_SETTINGS_KEY)
}

export function getMLSettings() {
  try {
    const data = localStorage.getItem(ML_SETTINGS_KEY)
    return data ? JSON.parse(data) : {
      mode: 'auto', // 'auto', 'random', 'fixed'
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

export function saveMLSettings(settings) {
  localStorage.setItem(ML_SETTINGS_KEY, JSON.stringify(settings))
}

export function analyzeSynthesizerPerformance(evaluations) {
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
    
    // Track por modo
    const mode = e.mode || 'unknown'
    if (!performance[synth].byMode[mode]) {
      performance[synth].byMode[mode] = { count: 0, totalRating: 0 }
    }
    performance[synth].byMode[mode].count++
    performance[synth].byMode[mode].totalRating += avgRating
  })
  
  // Calcular métricas
  Object.keys(performance).forEach(synth => {
    const p = performance[synth]
    
    p.avgRating = p.totalRating / p.count
    p.avgCost = p.totalCost / p.count
    p.avgTime = p.totalTime / p.count
    
    // Calcular desviación estándar (consistencia)
    const variance = p.ratings.reduce((sum, r) => {
      return sum + Math.pow(r - p.avgRating, 2)
    }, 0) / p.count
    p.stdDev = Math.sqrt(variance)
    p.consistency = Math.max(0, 10 - p.stdDev) // 10 = perfecto, 0 = inconsistente
    
    // Score ponderado
    p.score = (
      p.avgRating * 0.60 +           // 60% calidad
      p.consistency * 0.20 +         // 20% consistencia
      (1 / Math.max(p.avgCost, 0.001)) * 0.10 * 0.10 + // 10% eficiencia de costo
      (1 / Math.max(p.avgTime, 1)) * 0.10 * 10         // 10% velocidad
    )
    
    // Métricas por modo
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

export function getCurrentPhase(evaluations) {
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

export function getRecommendation(models, evaluations) {
  const phase = getCurrentPhase(evaluations)
  const performance = analyzeSynthesizerPerformance(evaluations)
  const settings = getMLSettings()
  
  // Si usuario forzó un sintetizador
  if (settings.mode === 'fixed' && settings.fixedSynthesizer) {
    const model = models.find(m => m.id === settings.fixedSynthesizer)
    return {
      mode: 'fixed',
      synthesizer: model || models[0],
      confidence: 'user-defined',
      message: `Usando ${model?.name || 'modelo seleccionado'} (configuración manual)`
    }
  }
  
  // Si usuario forzó aleatorio
  if (settings.mode === 'random') {
    return {
      mode: 'random',
      synthesizer: null,
      confidence: 'random',
      message: 'Selección aleatoria (configuración manual)'
    }
  }
  
  // Modo automático (ML)
  if (phase.phase === PHASES.LEARNING) {
    // Fase 1: Aleatorio
    return {
      mode: 'random',
      synthesizer: null,
      confidence: 'learning',
      message: phase.message,
      phase: phase
    }
  }
  
  // Encontrar mejor sintetizador
  const synthIds = Object.keys(performance)
  if (synthIds.length === 0) {
    return {
      mode: 'random',
      synthesizer: null,
      confidence: 'no-data',
      message: 'Sin datos suficientes, usando aleatorio'
    }
  }
  
  const bestId = synthIds.reduce((a, b) => 
    performance[a].score > performance[b].score ? a : b
  )
  
  const bestModel = models.find(m => m.id === bestId)
  const bestPerf = performance[bestId]
  
  if (phase.phase === PHASES.SUGGESTED) {
    // Fase 2: Sugerencia
    return {
      mode: 'suggested',
      synthesizer: bestModel,
      confidence: 'medium',
      message: `Basado en ${phase.count} evaluaciones, ${bestModel?.name || bestId} sintetiza mejor`,
      stats: bestPerf,
      phase: phase,
      canOverride: true
    }
  }
  
  // Fase 3: Optimizado
  return {
    mode: 'recommended',
    synthesizer: bestModel,
    confidence: 'high',
    message: `Con ${phase.count} evaluaciones, ${bestModel?.name || bestId} es el mejor sintetizador`,
    stats: bestPerf,
    phase: phase,
    canOverride: true
  }
}

export function selectSynthesizer(models, evaluations) {
  const recommendation = getRecommendation(models, evaluations)
  
  if (recommendation.mode === 'random') {
    const randomIndex = Math.floor(Math.random() * models.length)
    return {
      model: models[randomIndex],
      index: randomIndex,
      wasRandom: true,
      recommendation: recommendation
    }
  }
  
  if (recommendation.synthesizer) {
    const index = models.findIndex(m => m.id === recommendation.synthesizer.id)
    return {
      model: recommendation.synthesizer,
      index: index >= 0 ? index : 0,
      wasRandom: false,
      recommendation: recommendation
    }
  }
  
  // Fallback
  return {
    model: models[0],
    index: 0,
    wasRandom: true,
    recommendation: recommendation
  }
}

export function getPerformanceStats(evaluations) {
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
