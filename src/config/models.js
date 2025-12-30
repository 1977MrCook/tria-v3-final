// src/config/models.js
// Catálogo completo de modelos de IA disponibles en TrIA Platform v3.0

export const AVAILABLE_MODELS = [
  // ═══════════════════════════════════════════════════════════
  // OPENAI MODELS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'gpt-5.2-pro',
    provider: 'openai',
    name: 'GPT-5.2 Pro',
    displayName: 'GPT-5.2 Pro',
    description: 'Modelo más avanzado con razonamiento extendido',
    icon: '🔵',
    color: '#3B82F6',
    tier: 'ultra',
    capabilities: {
      reasoning: 'advanced',
      coding: 'expert',
      analysis: 'expert',
      creativity: 'high',
      multimodal: true
    },
    strengths: [
      'Razonamiento lógico profundo',
      'Análisis de datos complejos',
      'Generación de código avanzado',
      'Solución de problemas matemáticos'
    ],
    bestFor: [
      'Análisis financiero',
      'Desarrollo de software',
      'Investigación científica',
      'Planificación estratégica'
    ],
    defaultRole: 'Analista Principal',
    pricing: {
      input: 1.75,  // por 1M tokens
      output: 14.0
    },
    contextWindow: 128000,
    responseSpeed: 'medium',
    available: true
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'gpt-4o',
    displayName: 'GPT-4o',
    description: 'Multimodal rápido y eficiente',
    icon: '🔷',
    color: '#60A5FA',
    tier: 'premium',
    capabilities: {
      reasoning: 'high',
      coding: 'high',
      analysis: 'high',
      creativity: 'high',
      multimodal: true
    },
    strengths: [
      'Procesamiento de imágenes',
      'Velocidad de respuesta',
      'Balance costo-calidad',
      'Versatilidad'
    ],
    bestFor: [
      'Asistencia general',
      'Análisis de documentos',
      'Procesamiento de imágenes',
      'Tareas cotidianas'
    ],
    defaultRole: 'Asistente General',
    pricing: {
      input: 2.5,
      output: 10.0
    },
    contextWindow: 128000,
    responseSpeed: 'fast',
    available: true
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    description: 'Modelo pequeño, rápido y económico',
    icon: '🔹',
    color: '#93C5FD',
    tier: 'standard',
    capabilities: {
      reasoning: 'medium',
      coding: 'medium',
      analysis: 'medium',
      creativity: 'medium',
      multimodal: false
    },
    strengths: [
      'Muy económico',
      'Respuestas instantáneas',
      'Bajo consumo',
      'Eficiente'
    ],
    bestFor: [
      'Consultas simples',
      'Chat casual',
      'Resúmenes rápidos',
      'Prototipado'
    ],
    defaultRole: 'Asistente Rápido',
    pricing: {
      input: 0.15,
      output: 0.6
    },
    contextWindow: 128000,
    responseSpeed: 'very-fast',
    available: true
  },

  // ═══════════════════════════════════════════════════════════
  // ANTHROPIC MODELS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'claude-opus-4-20250514',
    provider: 'anthropic',
    model: 'claude-opus-4-20250514',
    name: 'claude-opus-4-20250514',
    displayName: 'Claude Opus 4',
    description: 'Máxima inteligencia para tareas complejas',
    icon: '🟣',
    color: '#A855F7',
    tier: 'ultra',
    capabilities: {
      reasoning: 'expert',
      coding: 'expert',
      analysis: 'expert',
      creativity: 'expert',
      multimodal: true
    },
    strengths: [
      'Razonamiento profundo',
      'Precisión técnica',
      'Análisis exhaustivo',
      'Creatividad sofisticada'
    ],
    bestFor: [
      'Investigación compleja',
      'Arquitectura de software',
      'Análisis legal',
      'Decisiones críticas'
    ],
    defaultRole: 'Estratega Principal',
    pricing: {
      input: 15.0,
      output: 75.0
    },
    contextWindow: 200000,
    responseSpeed: 'slow',
    available: true
  },
  {
    id: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    name: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4',
    description: 'Balance ideal entre inteligencia y velocidad',
    icon: '🟢',
    color: '#10B981',
    tier: 'premium',
    capabilities: {
      reasoning: 'high',
      coding: 'expert',
      analysis: 'expert',
      creativity: 'high',
      multimodal: true
    },
    strengths: [
      'Validación técnica',
      'Código seguro y robusto',
      'Análisis de riesgos',
      'Documentación clara'
    ],
    bestFor: [
      'Code review',
      'Validación técnica',
      'Análisis de seguridad',
      'Arquitectura de sistemas'
    ],
    defaultRole: 'Validador Técnico',
    pricing: {
      input: 3.0,
      output: 15.0
    },
    contextWindow: 200000,
    responseSpeed: 'medium',
    available: true
  },
  {
    id: 'claude-haiku-4-20250514',
    provider: 'anthropic',
    model: 'claude-haiku-4-20250514',
    name: 'claude-haiku-4-20250514',
    displayName: 'Claude Haiku 4',
    description: 'Rápido y eficiente para tareas cotidianas',
    icon: '🟩',
    color: '#34D399',
    tier: 'standard',
    capabilities: {
      reasoning: 'medium',
      coding: 'high',
      analysis: 'high',
      creativity: 'medium',
      multimodal: false
    },
    strengths: [
      'Velocidad excepcional',
      'Muy económico',
      'Eficiente',
      'Confiable'
    ],
    bestFor: [
      'Tareas rutinarias',
      'Respuestas rápidas',
      'Asistencia cotidiana',
      'Procesamiento en lote'
    ],
    defaultRole: 'Asistente Eficiente',
    pricing: {
      input: 0.25,
      output: 1.25
    },
    contextWindow: 200000,
    responseSpeed: 'very-fast',
    available: true
  },

  // ═══════════════════════════════════════════════════════════
  // GOOGLE MODELS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'gemini-2.5-pro',
    provider: 'google',
    name: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    description: 'Pensamiento creativo y multimodal avanzado',
    icon: '🟠',
    color: '#F59E0B',
    tier: 'premium',
    capabilities: {
      reasoning: 'high',
      coding: 'high',
      analysis: 'high',
      creativity: 'expert',
      multimodal: true
    },
    strengths: [
      'Pensamiento lateral',
      'Creatividad excepcional',
      'Procesamiento multimodal',
      'Síntesis de información'
    ],
    bestFor: [
      'Brainstorming',
      'Diseño creativo',
      'Soluciones innovadoras',
      'Análisis de tendencias'
    ],
    defaultRole: 'Pensador Creativo',
    pricing: {
      input: 1.25,
      output: 5.0
    },
    contextWindow: 1000000,
    responseSpeed: 'medium',
    available: true
  },
  {
    id: 'gemini-1.5-pro',
    provider: 'google',
    name: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    description: 'Contexto extenso y procesamiento profundo',
    icon: '🟧',
    color: '#FB923C',
    tier: 'premium',
    capabilities: {
      reasoning: 'high',
      coding: 'high',
      analysis: 'high',
      creativity: 'high',
      multimodal: true
    },
    strengths: [
      'Contexto ultra-largo',
      'Análisis de documentos extensos',
      'Comprensión profunda',
      'Versatilidad'
    ],
    bestFor: [
      'Análisis de libros completos',
      'Procesamiento de transcripciones',
      'Research extenso',
      'Documentación compleja'
    ],
    defaultRole: 'Analista de Documentos',
    pricing: {
      input: 1.25,
      output: 5.0
    },
    contextWindow: 2000000,
    responseSpeed: 'medium',
    available: true
  },
  {
    id: 'gemini-1.5-flash',
    provider: 'google',
    name: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    description: 'Ultrarrápido y económico',
    icon: '🟡',
    color: '#FCD34D',
    tier: 'standard',
    capabilities: {
      reasoning: 'medium',
      coding: 'medium',
      analysis: 'medium',
      creativity: 'medium',
      multimodal: true
    },
    strengths: [
      'Velocidad extrema',
      'Muy bajo costo',
      'Multimodal básico',
      'Eficiente'
    ],
    bestFor: [
      'Respuestas instantáneas',
      'Procesamiento masivo',
      'Chatbots',
      'Asistencia básica'
    ],
    defaultRole: 'Asistente Rápido',
    pricing: {
      input: 0.075,
      output: 0.3
    },
    contextWindow: 1000000,
    responseSpeed: 'very-fast',
    available: true
  },

  // ═══════════════════════════════════════════════════════════
  // PERPLEXITY MODELS (Opcional - requiere API separada)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'pplx-online',
    provider: 'perplexity',
    name: 'sonar-pro',
    displayName: 'Perplexity Online',
    description: 'Búsqueda web y síntesis de información actual',
    icon: '🔍',
    color: '#6366F1',
    tier: 'specialty',
    capabilities: {
      reasoning: 'medium',
      coding: 'low',
      analysis: 'high',
      creativity: 'medium',
      multimodal: false,
      webSearch: true
    },
    strengths: [
      'Información actualizada',
      'Búsqueda web integrada',
      'Síntesis de fuentes',
      'Citations precisas'
    ],
    bestFor: [
      'Investigación actual',
      'Noticias y tendencias',
      'Fact-checking',
      'Research académico'
    ],
    defaultRole: 'Investigador Web',
    pricing: {
      input: 3.0,
      output: 15.0
    },
    contextWindow: 127000,
    responseSpeed: 'medium',
    available: false  // Requiere API key de Perplexity
  }
]

// Filtros y utilidades
export const getModelById = (id) => {
  return AVAILABLE_MODELS.find(m => m.id === id)
}

export const getModelsByProvider = (provider) => {
  return AVAILABLE_MODELS.filter(m => m.provider === provider)
}

export const getAvailableModels = () => {
  return AVAILABLE_MODELS.filter(m => m.available)
}

export const getModelsByTier = (tier) => {
  return AVAILABLE_MODELS.filter(m => m.tier === tier)
}

export const getRecommendedModels = (taskType, budget = 'medium') => {
  // Esta función será mejorada por el ML Engine
  const recommendations = {
    'code': ['gpt-5.2-pro', 'claude-sonnet-4-20250514', 'gpt-4o'],
    'analysis': ['gpt-5.2-pro', 'claude-opus-4', 'gemini-2.5-pro'],
    'creative': ['gemini-2.5-pro', 'claude-opus-4', 'gpt-4o'],
    'research': ['pplx-online', 'gemini-1.5-pro', 'claude-sonnet-4-20250514'],
    'general': ['gpt-4o', 'claude-sonnet-4-20250514', 'gemini-1.5-flash']
  }
  
  const modelIds = recommendations[taskType] || recommendations['general']
  return modelIds.map(id => getModelById(id)).filter(Boolean)
}
