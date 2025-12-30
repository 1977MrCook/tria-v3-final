// netlify/functions/orchestrate.js
// Motor de orquestación Multi-IA con colaboración real y debate democrático

const Anthropic = require('@anthropic-ai/sdk')
const OpenAI = require('openai')
const { GoogleGenerativeAI } = require('@google/generative-ai')

// Initialize AI clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)

// Pricing per 1M tokens (input / output)
const PRICING = {
  'gpt-5.2-pro': { input: 1.75, output: 14 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'claude-sonnet-4-20250514': { input: 3.0, output: 15 },
  'claude-haiku-4-20250514': { input: 0.25, output: 1.25 },
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15 },
  'gemini-2.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 }
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { 
      message, 
      models, 
      mode,           // 'roles', 'debate', 'hybrid'
      conversationHistory,
      mlEnabled = false,
      category = 'general'
    } = JSON.parse(event.body)

    if (!message || !models || models.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: message, models' })
      }
    }

    let debate = { rounds: [], stats: {}, mode }
    let finalResponse = ''
    let totalCost = 0
    let totalTokens = 0
    const startTime = Date.now()

    // ═══════════════════════════════════════════════════════════
    // MODO 1: COLABORACIÓN POR ROLES (SECUENCIAL CON CONTEXTO)
    // ═══════════════════════════════════════════════════════════
    if (mode === 'roles') {
      console.log('🤝 Iniciando modo COLABORACIÓN POR ROLES')
      
      let collaborationThread = []
      
      for (let i = 0; i < models.length; i++) {
        const model = models[i]
        console.log(`📍 Procesando modelo ${i + 1}/${models.length}: ${model.customName}`)
        
        // Construir prompt con CONTEXTO COMPLETO
        let prompt = ''
        
        if (i === 0) {
          // Primera IA: recibe pregunta original + su rol
          prompt = `PREGUNTA DEL USUARIO:
${message}

TU ROL: ${model.assignedRole || model.customName}
INSTRUCCIÓN ESPECÍFICA: ${model.instruction || model.systemPrompt || 'Proporciona tu mejor análisis'}

Por favor, proporciona tu análisis inicial desde tu perspectiva como ${model.assignedRole}.`
        } else {
          // Siguientes IAs: ven TODO el contexto anterior
          prompt = `PREGUNTA DEL USUARIO:
${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPUESTAS DE LOS EXPERTOS ANTERIORES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`
          // Agregar TODAS las respuestas previas
          collaborationThread.forEach((entry, idx) => {
            prompt += `[${entry.expertName} - ${entry.role}]:
${entry.response}

`
          })
          
          prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AHORA ES TU TURNO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TU ROL: ${model.assignedRole || model.customName}
INSTRUCCIÓN ESPECÍFICA: ${model.instruction || model.systemPrompt}

INSTRUCCIONES IMPORTANTES:
1. Has leído las respuestas de ${i} experto(s) anterior(es)
2. Identifica qué está bien y qué falta en sus análisis
3. NO REPITAS lo que ya dijeron - COMPLEMENTA y MEJORA
4. Aporta NUEVA información o perspectivas desde tu rol
5. Si ves errores, corrígelos con tacto
6. Construye sobre lo anterior para crear una solución mejor

Ahora, desde tu perspectiva como ${model.assignedRole}, complementa y mejora la solución:`
        }

        // Llamar al modelo
        const result = await callModel(model, prompt, conversationHistory)
        
        // Guardar en el thread de colaboración
        collaborationThread.push({
          expertName: model.customName || model.name,
          role: model.assignedRole || 'Experto',
          response: result.response,
          iteration: i + 1,
          cost: result.cost,
          tokens: result.tokens,
          responseTime: result.responseTime
        })
        
        // Guardar en debate
        debate.rounds.push({
          roundNumber: i + 1,
          roundType: i === 0 ? 'initial-analysis' : i === models.length - 1 ? 'final-synthesis' : 'iteration',
          modelName: model.customName || model.name,
          modelId: model.id,
          assignedRole: model.assignedRole,
          response: result.response,
          reasoning: result.reasoning,
          cost: result.cost,
          tokens: result.tokens,
          responseTime: result.responseTime,
          sawPreviousResponses: i > 0,
          contextSize: i // Cuántas respuestas vio
        })

        totalCost += result.cost
        totalTokens += result.tokens
      }

      // La respuesta final es la ÚLTIMA (síntesis completa)
      finalResponse = collaborationThread[collaborationThread.length - 1].response
      
      // Metadata
      debate.collaboration = {
        mode: 'sequential-with-full-context',
        iterations: collaborationThread.length,
        experts: collaborationThread.map(t => ({
          name: t.expertName,
          role: t.role
        })),
        contextGrowth: 'cumulative'
      }
    }

    // ═══════════════════════════════════════════════════════════
    // MODO 2: DEBATE DEMOCRÁTICO (3 RONDAS)
    // ═══════════════════════════════════════════════════════════
    else if (mode === 'debate') {
      console.log('💬 Iniciando modo DEBATE DEMOCRÁTICO')
      
      let allProposals = []
      let allCritiques = []
      let allVotes = []

      // ────────────────────────────────────────────────────────
      // RONDA 1: PROPUESTAS INICIALES (EN PARALELO)
      // ────────────────────────────────────────────────────────
      console.log('📝 RONDA 1: Propuestas iniciales')
      
      const round1Promises = models.map(model => {
        const prompt = `PREGUNTA DEL USUARIO:
${message}

TU ROL EN EL DEBATE: ${model.assignedRole || model.customName}
${model.systemPrompt || ''}

INSTRUCCIONES PARA RONDA 1 (PROPUESTA):
Presenta tu mejor solución al problema planteado. Sé específico, claro y fundamenta tu propuesta.
Esta es tu oportunidad de exponer tu perspectiva completa.

No sabes lo que dirán otros expertos - enfócate en dar tu mejor respuesta.`

        return callModel(model, prompt, conversationHistory)
          .then(result => ({
            model,
            result,
            expert: model.customName || model.name,
            role: model.assignedRole
          }))
      })

      const round1Results = await Promise.all(round1Promises)
      
      round1Results.forEach(({ model, result, expert, role }) => {
        allProposals.push({
          expert,
          role,
          proposal: result.response
        })
        
        debate.rounds.push({
          roundNumber: 1,
          roundType: 'initial-proposal',
          modelName: expert,
          modelId: model.id,
          assignedRole: role,
          response: result.response,
          cost: result.cost,
          tokens: result.tokens,
          responseTime: result.responseTime
        })
        
        totalCost += result.cost
        totalTokens += result.tokens
      })

      // ────────────────────────────────────────────────────────
      // RONDA 2: CRÍTICA CONSTRUCTIVA (SECUENCIAL)
      // ────────────────────────────────────────────────────────
      console.log('🔍 RONDA 2: Crítica constructiva')
      
      for (let i = 0; i < models.length; i++) {
        const model = models[i]
        const currentExpert = allProposals[i]
        const otherProposals = allProposals.filter((_, idx) => idx !== i)
        
        let prompt = `PREGUNTA ORIGINAL:
${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TU PROPUESTA (RONDA 1):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${currentExpert.proposal}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPUESTAS DE OTROS EXPERTOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`
        otherProposals.forEach(p => {
          prompt += `[${p.expert} - ${p.role}]:
${p.proposal}

`
        })
        
        prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCCIONES PARA RONDA 2 (CRÍTICA):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ahora que has visto todas las propuestas, analiza críticamente:

1. ¿Qué fortalezas tiene cada propuesta (incluyendo la tuya)?
2. ¿Qué debilidades o puntos ciegos identificas?
3. ¿Hay ideas que se pueden combinar?
4. ¿Qué aspectos críticos faltan en las propuestas?

Sé constructivo pero honesto. El objetivo es llegar a la mejor solución posible.`

        const result = await callModel(model, prompt, conversationHistory)
        
        allCritiques.push({
          expert: currentExpert.expert,
          role: currentExpert.role,
          critique: result.response
        })
        
        debate.rounds.push({
          roundNumber: 2,
          roundType: 'constructive-critique',
          modelName: currentExpert.expert,
          modelId: model.id,
          assignedRole: currentExpert.role,
          response: result.response,
          cost: result.cost,
          tokens: result.tokens,
          responseTime: result.responseTime
        })
        
        totalCost += result.cost
        totalTokens += result.tokens
      }

      // ────────────────────────────────────────────────────────
      // RONDA 3: VOTACIÓN Y SÍNTESIS FINAL
      // ────────────────────────────────────────────────────────
      console.log('🗳️ RONDA 3: Votación final')
      
      for (let i = 0; i < models.length; i++) {
        const model = models[i]
        const currentExpert = allProposals[i]
        
        let prompt = `PREGUNTA ORIGINAL:
${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TODAS LAS PROPUESTAS (RONDA 1):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`
        allProposals.forEach(p => {
          prompt += `[${p.expert} - ${p.role}]:
${p.proposal}

`
        })
        
        prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANÁLISIS CRÍTICO (RONDA 2):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`
        allCritiques.forEach(c => {
          prompt += `[${c.expert}]:
${c.critique}

`
        })
        
        prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCCIONES PARA RONDA 3 (VOTACIÓN Y SÍNTESIS):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Has visto todas las propuestas y todas las críticas. Ahora debes:

1. Identificar cuál propuesta (o combinación de propuestas) es la MEJOR
2. Crear una SÍNTESIS FINAL que combine lo mejor de todas las ideas
3. Justificar tu decisión con argumentos sólidos

IMPORTANTE: Puedes votar por la propuesta de otro experto si es mejor que la tuya.
El objetivo es encontrar la MEJOR SOLUCIÓN, no defender tu ego.

Formato de respuesta:
[VOTO]: Voto por [nombre del experto] porque...
[SÍNTESIS FINAL]: [Tu propuesta mejorada combinando lo mejor de todas]`

        const result = await callModel(model, prompt, conversationHistory)
        
        // Extraer voto
        const voteMatch = result.response.match(/\[VOTO\]:\s*Voto por\s+([^\n]+)/i)
        const votedFor = voteMatch ? voteMatch[1].trim() : 'propuesta combinada'
        
        allVotes.push({
          expert: currentExpert.expert,
          role: currentExpert.role,
          votedFor,
          synthesis: result.response
        })
        
        debate.rounds.push({
          roundNumber: 3,
          roundType: 'vote-and-synthesis',
          modelName: currentExpert.expert,
          modelId: model.id,
          assignedRole: currentExpert.role,
          response: result.response,
          votedFor,
          cost: result.cost,
          tokens: result.tokens,
          responseTime: result.responseTime
        })
        
        totalCost += result.cost
        totalTokens += result.tokens
      }

      // Determinar consenso
      const voteCounts = {}
      allVotes.forEach(v => {
        const key = v.votedFor.toLowerCase()
        voteCounts[key] = (voteCounts[key] || 0) + 1
      })
      
      const maxVotes = Math.max(...Object.values(voteCounts))
      const consensusLevel = (maxVotes / allVotes.length) * 100
      
      // Síntesis final: usar la síntesis del experto con más votos
      // o combinar si hay empate
      const topVoted = Object.entries(voteCounts)
        .sort((a, b) => b[1] - a[1])[0][0]
      
      const winnerSynthesis = allVotes.find(v => 
        v.votedFor.toLowerCase() === topVoted
      )
      
      finalResponse = winnerSynthesis ? winnerSynthesis.synthesis : allVotes[0].synthesis
      
      // Metadata del debate
      debate.voting = {
        votes: allVotes.map(v => ({
          expert: v.expert,
          votedFor: v.votedFor
        })),
        voteCounts,
        winner: topVoted,
        consensusLevel: consensusLevel.toFixed(0),
        unanimity: consensusLevel === 100
      }
    }

    // ═══════════════════════════════════════════════════════════
    // MODO 3: HÍBRIDO (ROLES + VALIDACIÓN)
    // ═══════════════════════════════════════════════════════════
    else if (mode === 'hybrid') {
      console.log('🔄 Iniciando modo HÍBRIDO')
      
      // FASE 1: Colaboración por roles (igual que modo 'roles')
      let collaborationThread = []
      
      for (let i = 0; i < models.length; i++) {
        const model = models[i]
        
        let prompt = i === 0
          ? `${message}\n\nTU ROL: ${model.assignedRole}\n${model.systemPrompt || ''}`
          : `PREGUNTA: ${message}\n\n━━━ RESPUESTAS ANTERIORES ━━━\n${
              collaborationThread.map(t => `[${t.expertName}]: ${t.response}`).join('\n\n')
            }\n\n━━━ TU TURNO ━━━\nROL: ${model.assignedRole}\nComplementa y mejora basándote en lo anterior.`

        const result = await callModel(model, prompt, conversationHistory)
        
        collaborationThread.push({
          expertName: model.customName || model.name,
          response: result.response
        })
        
        debate.rounds.push({
          roundNumber: i + 1,
          roundType: 'collaboration',
          phase: 1,
          modelName: model.customName || model.name,
          response: result.response,
          cost: result.cost,
          tokens: result.tokens
        })
        
        totalCost += result.cost
        totalTokens += result.tokens
      }

      const collaborativeResult = collaborationThread[collaborationThread.length - 1].response

      // FASE 2: Validación por votación
      const validationPromises = models.map(model => {
        const prompt = `SOLUCIÓN COLABORATIVA:
${collaborativeResult}

¿Esta solución es correcta, completa y viable? Vota SÍ o NO y justifica.`
        
        return callModel(model, prompt, [])
      })

      const validationResults = await Promise.all(validationPromises)
      
      const yesVotes = validationResults.filter(r => 
        r.response.toLowerCase().includes('sí') || 
        r.response.toLowerCase().includes('si') ||
        r.response.toLowerCase().includes('yes')
      ).length

      finalResponse = collaborativeResult
      debate.validation = { 
        yes: yesVotes, 
        no: models.length - yesVotes,
        approved: yesVotes > models.length / 2
      }
    }

    // ═══════════════════════════════════════════════════════════
    // ESTADÍSTICAS FINALES
    // ═══════════════════════════════════════════════════════════
    const endTime = Date.now()
    const totalTime = (endTime - startTime) / 1000

    debate.stats = {
      mode,
      totalRounds: debate.rounds.length,
      modelsParticipating: models.length,
      totalCost: parseFloat(totalCost.toFixed(6)),
      totalTokens,
      totalTime: parseFloat(totalTime.toFixed(2)),
      avgCostPerModel: parseFloat((totalCost / models.length).toFixed(6)),
      avgTimePerRound: parseFloat((totalTime / debate.rounds.length).toFixed(2))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        finalResponse,
        debate,
        modelsUsed: models.map(m => m.customName || m.name),
        category,
        mlEnabled,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Orchestration error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}

// ═══════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════════

async function callModel(modelConfig, prompt, conversationHistory) {
  const { provider, model, id, systemPrompt, config } = modelConfig
  const startTime = Date.now()

  try {
    let result
    
    if (provider === 'openai') {
      result = await callOpenAI(model || id, prompt, systemPrompt, config, conversationHistory)
    } else if (provider === 'anthropic') {
      result = await callAnthropic(model || id, prompt, systemPrompt, config, conversationHistory)
    } else if (provider === 'google') {
      result = await callGoogle(model || id, prompt, systemPrompt, config, conversationHistory)
    } else {
      throw new Error(`Unsupported provider: ${provider}`)
    }
    
    const endTime = Date.now()
    result.responseTime = parseFloat(((endTime - startTime) / 1000).toFixed(2))
    
    return result
    
  } catch (error) {
    console.error(`Error calling ${provider} (${model}):`, error)
    return {
      response: `[Error al obtener respuesta de ${modelConfig.customName || model}: ${error.message}]`,
      cost: 0,
      tokens: 0,
      responseTime: 0,
      reasoning: null,
      error: error.message
    }
  }
}

async function callOpenAI(model, prompt, systemPrompt, config, history) {
  const messages = [
    { role: 'system', content: systemPrompt || 'You are a helpful AI assistant.' }
  ]

  history?.forEach(msg => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content })
    }
  })

  messages.push({ role: 'user', content: prompt })

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature: config?.temperature || 0.7,
    max_tokens: config?.maxTokens || 4000,
    ...(config?.reasoning && { reasoning_effort: config.reasoning })
  })

  const response = completion.choices[0].message.content
  const inputTokens = completion.usage.prompt_tokens
  const outputTokens = completion.usage.completion_tokens
  
  const pricing = PRICING[model] || { input: 2, output: 10 }
  const cost = (inputTokens / 1000000 * pricing.input) + (outputTokens / 1000000 * pricing.output)

  return {
    response,
    cost,
    tokens: inputTokens + outputTokens,
    reasoning: completion.choices[0].message.reasoning_content || null
  }
}

async function callAnthropic(model, prompt, systemPrompt, config, history) {
  const messages = []

  history?.forEach(msg => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content })
    }
  })

  messages.push({ role: 'user', content: prompt })

  const message = await anthropic.messages.create({
    model,
    max_tokens: config?.maxTokens || 8000,
    temperature: config?.temperature || 0.7,
    system: systemPrompt || 'You are a helpful AI assistant.',
    messages
  })

  const response = message.content[0].text
  const inputTokens = message.usage.input_tokens
  const outputTokens = message.usage.output_tokens

  const pricing = PRICING[model] || { input: 3, output: 15 }
  const cost = (inputTokens / 1000000 * pricing.input) + (outputTokens / 1000000 * pricing.output)

  return {
    response,
    cost,
    tokens: inputTokens + outputTokens,
    reasoning: null
  }
}

async function callGoogle(model, prompt, systemPrompt, config, history) {
  const geminiModel = genAI.getGenerativeModel({ model })

  // Gemini no soporta systemInstruction en algunos modelos
  // Lo agregamos al inicio del prompt del usuario
  const fullPrompt = systemPrompt 
    ? `${systemPrompt}\n\n${prompt}` 
    : prompt

  const chat = geminiModel.startChat({
    generationConfig: {
      temperature: config?.temperature || 0.8,
      maxOutputTokens: config?.maxTokens || 8000,
    }
  })

  if (history && history.length > 0) {
    for (const msg of history) {
      if (msg.role === 'user') {
        await chat.sendMessage(msg.content)
      }
    }
  }

  const result = await chat.sendMessage(fullPrompt)
  const response = result.response.text()

  const estimatedTokens = Math.ceil((fullPrompt.length + response.length) / 4)
  
  const pricing = PRICING[model] || { input: 1.25, output: 5 }
  const cost = estimatedTokens / 1000000 * ((pricing.input + pricing.output) / 2)

  return {
    response,
    cost,
    tokens: estimatedTokens,
    reasoning: null
  }
}
