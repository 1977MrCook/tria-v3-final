import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)

const GEMINI_MODELS = {
  'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
  'gemini-1.5-pro': 'gemini-1.5-pro',
  'gemini-1.5-flash': 'gemini-1.5-flash'
}

async function callModel(model, prompt, systemPrompt) {
  const startTime = Date.now()
  
  try {
    if (model.provider === 'openai') {
      const response = await openai.chat.completions.create({
        model: model.id,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000
      })
      
      return {
        model: model.name,
        content: response.choices[0].message.content,
        cost: (response.usage.prompt_tokens * 0.000005) + (response.usage.completion_tokens * 0.000015),
        time: (Date.now() - startTime) / 1000
      }
    }
    
    if (model.provider === 'anthropic') {
      const response = await anthropic.messages.create({
        model: model.id,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      })
      
      return {
        model: model.name,
        content: response.content[0].text,
        cost: (response.usage.input_tokens * 0.000003) + (response.usage.output_tokens * 0.000015),
        time: (Date.now() - startTime) / 1000
      }
    }
    
    if (model.provider === 'google') {
      const modelId = GEMINI_MODELS[model.id] || model.id
      const geminiModel = genAI.getGenerativeModel({ model: modelId })
      const fullPrompt = `${systemPrompt}\n\n${prompt}`
      const result = await geminiModel.generateContent(fullPrompt)
      const response = await result.response
      
      return {
        model: model.name,
        content: response.text(),
        cost: 0.0001,
        time: (Date.now() - startTime) / 1000
      }
    }
  } catch (error) {
    return {
      model: model.name,
      content: `Error: ${error.message}`,
      cost: 0,
      time: (Date.now() - startTime) / 1000,
      error: true
    }
  }
}

const normalizeKey = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const safeName = (m) => (m && m.name) ? m.name : (m && m.id) ? m.id : 'Model'

const withSystem = (model, orchestrationText) => {
  const base = (model && typeof model.systemPrompt === 'string') ? model.systemPrompt.trim() : ''
  return base ? `${base}\n\n${orchestrationText}` : orchestrationText
}

function selectRandomSynthesizer(models) {
  const randomIndex = Math.floor(Math.random() * models.length)
  return {
    model: models[randomIndex],
    index: randomIndex,
    wasRandom: true
  }
}

export const handler = async (event) => {
  if (event.httpMethod && event.httpMethod.toUpperCase() === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {}
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const models = Array.isArray(body.models) ? body.models : []
    const modeRaw = typeof body.mode === 'string' ? body.mode.trim().toLowerCase() : 'collaborative'

    if (!message || !models.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing message or models' })
      }
    }

    let mode = modeRaw
    if (mode === 'hybrid') {
      mode = models.length <= 2 ? 'collaborative' : 'voting'
    }

    const rounds = []
    let totalCost = 0
    let totalTime = 0
    let finalResponse = ''
    let votingMeta = undefined
    let synthesizerInfo = undefined

    // MODO COLABORATIVO CON SÍNTESIS ALEATORIA ML
    if (mode === 'collaborative') {
      const prev = []

      // Rondas colaborativas normales
      for (let i = 0; i < models.length; i++) {
        const m = models[i]
        const me = safeName(m)

        let orchestrationSystem = ''
        if (i === 0) {
          orchestrationSystem =
            `Eres ${me}. Responde la pregunta del usuario de forma completa.\n` +
            `Estás colaborando con otras IAs; tu respuesta será leída por las siguientes.`
        } else {
          const prevName = prev[prev.length - 1]?.model || 'la IA anterior'
          orchestrationSystem =
            `Eres ${me}. Lee la respuesta de ${prevName}.\n` +
            `Identifica qué falta, qué está mal, o qué se puede mejorar. Da tu versión mejorada.`
        }

        const systemPrompt = withSystem(m, orchestrationSystem)

        let prompt = message
        if (i > 0) {
          const previousBlock = prev
            .map((r, idx) => `Respuesta ${idx + 1} (${r.model}):\n${r.content}`)
            .join('\n\n')
          prompt = `Pregunta: ${message}\n\nRespuestas previas:\n${previousBlock}\n\nAhora responde.`
        }

        const res = await callModel(m, prompt, systemPrompt)
        totalCost += Number(res.cost || 0)
        totalTime += Number(res.time || 0)

        rounds.push({ round: i + 1, responses: [res] })

        if (res && typeof res.content === 'string' && res.content.trim() && !res.error) {
          prev.push({ model: res.model, content: res.content })
        }
      }

      // SÍNTESIS FINAL: Selección aleatoria
      const selection = selectRandomSynthesizer(models)
      const synthesizer = selection.model
      const synthesizerName = safeName(synthesizer)

      synthesizerInfo = {
        synthesizer: synthesizer.id,
        synthesizerName: synthesizerName,
        wasRandom: true,
        index: selection.index
      }

      const allContent = prev.map((p, idx) => `[${idx + 1}] ${p.model}:\n${p.content}`).join('\n\n')

      const synthesisPrompt =
        `Eres ${synthesizerName}. Has sido seleccionado para crear la RESPUESTA FINAL.\n\n` +
        `Lee TODAS las propuestas de las IAs (incluyendo la tuya si participaste):\n\n${allContent}\n\n` +
        `Pregunta original: ${message}\n\n` +
        `Crea UNA respuesta final que:\n` +
        `1. Integre lo mejor de cada propuesta\n` +
        `2. Solucione debilidades identificadas\n` +
        `3. Sea completa, clara y lista para usar\n` +
        `4. No menciones que estás sintetizando, simplemente da la respuesta final\n\n` +
        `IMPORTANTE: Tu respuesta debe ser la DEFINITIVA para el usuario.`

      const synthesisSystemPrompt = withSystem(synthesizer, 'Eres un sintetizador experto.')

      const synthesisRes = await callModel(synthesizer, synthesisPrompt, synthesisSystemPrompt)
      totalCost += Number(synthesisRes.cost || 0)
      totalTime += Number(synthesisRes.time || 0)

      rounds.push({ 
        round: rounds.length + 1, 
        responses: [{ ...synthesisRes, isSynthesis: true }] 
      })

      finalResponse = synthesisRes.content || 'No se pudo generar síntesis.'
    }

    // MODO VOTACIÓN CON CRÍTICA Y SÍNTESIS
    if (mode === 'voting') {
      // RONDA 1: Propuestas
      const proposalPromises = models.map((m) => {
        const sys = withSystem(
          m,
          `Eres ${safeName(m)}. Propón tu mejor respuesta.\n` +
            `Estás participando en una votación con otras IAs.`
        )
        return callModel(m, message, sys)
      })

      const settled = await Promise.allSettled(proposalPromises)
      const proposals = settled.map((s, idx) => {
        if (s.status === 'fulfilled') return s.value
        return {
          model: safeName(models[idx]),
          content: `Error: ${s.reason?.message || String(s.reason)}`,
          cost: 0,
          time: 0,
          error: true
        }
      })

      totalCost += proposals.reduce((acc, r) => acc + Number(r.cost || 0), 0)
      totalTime += proposals.reduce((acc, r) => acc + Number(r.time || 0), 0)

      rounds.push({ round: 1, responses: proposals })

      const validProposals = proposals.filter(
        (p) => !p?.error && typeof p.content === 'string' && p.content.trim()
      )
      const proposalSet = validProposals.length ? validProposals : proposals

      // RONDA 2: CRÍTICA CRUZADA (NUEVO)
      const criticPromises = models.map((m, idx) => {
        const myProposal = proposals[idx]
        const otherProposals = proposalSet
          .filter((p, i) => i !== idx)
          .map((p, i) => `[${i + 1}] ${p.model}:\n${p.content}`)
          .join('\n\n')

        const criticPrompt =
          `Eres ${safeName(m)}. Lee las propuestas de las OTRAS IAs (NO la tuya):\n\n${otherProposals}\n\n` +
          `Pregunta original: ${message}\n\n` +
          `Analiza OBJETIVAMENTE cada propuesta:\n` +
          `- ✅ Fortalezas\n` +
          `- ❌ Debilidades\n` +
          `- 📝 Qué falta\n\n` +
          `IMPORTANTE: NO menciones tu propia propuesta. Sé constructivo y específico.`

        const sys = withSystem(m, 'Eres un crítico analítico y objetivo.')
        return callModel(m, criticPrompt, sys)
      })

      const criticSettled = await Promise.allSettled(criticPromises)
      const critics = criticSettled.map((s, idx) => {
        if (s.status === 'fulfilled') return s.value
        return {
          model: safeName(models[idx]),
          content: 'No pudo generar crítica',
          cost: 0,
          time: 0,
          error: true
        }
      })

      totalCost += critics.reduce((acc, r) => acc + Number(r.cost || 0), 0)
      totalTime += critics.reduce((acc, r) => acc + Number(r.time || 0), 0)

      rounds.push({ round: 2, responses: critics, isCritique: true })

      // RONDA 3: VOTACIÓN (con críticas)
      const targetMap = new Map()
      proposalSet.forEach((p) => targetMap.set(normalizeKey(p.model), p.model))

      const parseVote = (text) => {
        const raw = String(text || '')
        const m = raw.match(/VOTO\s*:\s*(.+?)\s*\|\s*RAZ[ÓO]N\s*:\s*([\s\S]*)/i)
        if (m) {
          return { target: (m[1] || '').trim(), reason: (m[2] || '').trim() }
        }
        const m2 = raw.match(/VOTO\s*:\s*(.+)/i)
        const target = m2 ? (m2[1] || '').split(/\r?\n/)[0].trim() : null
        return { target, reason: '' }
      }

      const resolveTarget = (rawTarget) => {
        const key = normalizeKey(rawTarget)
        if (!key) return null
        if (targetMap.has(key)) return targetMap.get(key)
        for (const [k, v] of targetMap.entries()) {
          if (k.includes(key) || key.includes(k)) return v
        }
        return String(rawTarget || '').trim() || null
      }

      const voteCounts = {}
      const voteDetails = []
      const voteResponses = []

      const proposalTextList = proposalSet
        .map((p, i) => `[${i + 1}] ${p.model}:\n${p.content}`)
        .join('\n\n')

      const criticTextList = critics
        .filter(c => !c.error)
        .map((c, i) => `Crítica de ${c.model}:\n${c.content}`)
        .join('\n\n')

      for (let i = 0; i < models.length; i++) {
        const m = models[i]
        const me = safeName(m)

        const votePrompt =
          `Eres ${me}. Lee las propuestas:\n\n${proposalTextList}\n\n` +
          `Lee las críticas:\n\n${criticTextList}\n\n` +
          `Pregunta: ${message}\n\n` +
          `Vota por la MEJOR propuesta basándote en las críticas.\n` +
          `PROHIBIDO: No puedes votar por ti mismo.\n` +
          `Formato: VOTO: [nombre] | RAZÓN: [tu justificación basada en evidencia]`

        const sys = withSystem(m, 'Eres un evaluador objetivo.')
        const res = await callModel(m, votePrompt, sys)

        totalCost += Number(res.cost || 0)
        totalTime += Number(res.time || 0)
        voteResponses.push(res)

        if (!res?.error && typeof res.content === 'string' && res.content.trim()) {
          const { target, reason } = parseVote(res.content)
          const resolved = resolveTarget(target)
          
          // Anti-sesgo: verificar que no vote por sí mismo
          if (resolved && normalizeKey(resolved) !== normalizeKey(me)) {
            voteCounts[resolved] = (voteCounts[resolved] || 0) + 1
            voteDetails.push({ voter: res.model, vote: resolved, reason: reason || '' })
          } else if (resolved && normalizeKey(resolved) === normalizeKey(me)) {
            voteDetails.push({ 
              voter: res.model, 
              vote: null, 
              reason: 'VOTO INVÁLIDO: Intentó votar por sí mismo' 
            })
          } else {
            voteDetails.push({ voter: res.model, vote: null, reason: reason || '' })
          }
        }
      }

      rounds.push({ round: 3, responses: voteResponses, isVoting: true })

      const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0)

      const proposalIndex = new Map()
      proposalSet.forEach((p, idx) => proposalIndex.set(p.model, idx))

      const candidates = Object.keys(voteCounts)
      candidates.sort((a, b) => {
        const diff = (voteCounts[b] || 0) - (voteCounts[a] || 0)
        if (diff !== 0) return diff
        const ia = proposalIndex.has(a) ? proposalIndex.get(a) : Number.MAX_SAFE_INTEGER
        const ib = proposalIndex.has(b) ? proposalIndex.get(b) : Number.MAX_SAFE_INTEGER
        return ia - ib
      })

      const winner = candidates.length ? candidates[0] : null
      const winnerVotes = winner ? (voteCounts[winner] || 0) : 0

      const winningProposal = winner
        ? proposalSet.find((p) => normalizeKey(p.model) === normalizeKey(winner)) ||
          proposalSet.find((p) => p.model === winner) ||
          null
        : null

      // RONDA 4: SÍNTESIS FINAL DEL GANADOR (NUEVO)
      if (winningProposal && typeof winningProposal.content === 'string') {
        const winnerModel = models.find(m => normalizeKey(safeName(m)) === normalizeKey(winner))
        
        if (winnerModel) {
          const allProposalsText = proposalSet
            .map((p, i) => `[${i + 1}] ${p.model}:\n${p.content}`)
            .join('\n\n')

          const synthesisPrompt =
            `Eres ${winner}. ¡GANASTE la votación con ${winnerVotes}/${totalVotes} votos!\n\n` +
            `Lee TODAS las propuestas (incluyendo la tuya):\n\n${allProposalsText}\n\n` +
            `Lee las críticas que se hicieron:\n\n${criticTextList}\n\n` +
            `Pregunta original: ${message}\n\n` +
            `Crea UNA RESPUESTA FINAL INTEGRADA que:\n` +
            `1. Tome lo mejor de TODAS las propuestas (no solo la tuya)\n` +
            `2. Solucione las debilidades identificadas en las críticas\n` +
            `3. Sea completa, clara y definitiva\n` +
            `4. No menciones que ganaste o que estás sintetizando\n\n` +
            `Esta es la respuesta que verá el usuario.`

          const synthesisSystemPrompt = withSystem(winnerModel, 'Eres un sintetizador experto.')
          const synthesisRes = await callModel(winnerModel, synthesisPrompt, synthesisSystemPrompt)

          totalCost += Number(synthesisRes.cost || 0)
          totalTime += Number(synthesisRes.time || 0)

          rounds.push({ 
            round: 4, 
            responses: [{ ...synthesisRes, isSynthesis: true }] 
          })

          finalResponse = synthesisRes.content || winningProposal.content

          synthesizerInfo = {
            synthesizer: winnerModel.id,
            synthesizerName: winner,
            wasRandom: false,
            wonVoting: true,
            votes: winnerVotes,
            totalVotes: totalVotes
          }
        } else {
          finalResponse = `${winner} ganó (${winnerVotes}/${totalVotes}).\n\n${winningProposal.content}`
        }
      } else {
        const fb = validProposals[0] || proposals[0]
        finalResponse = fb?.content || 'No se pudo generar respuesta.'
      }

      votingMeta = {
        winner: winner,
        votes: voteCounts,
        totalVotes,
        details: voteDetails
      }
    }

    const responseBody = {
      finalResponse,
      debate: {
        rounds,
        stats: {
          totalCost: Number(totalCost.toFixed(6)),
          totalTime: String(totalTime.toFixed(1)),
          totalRounds: rounds.length
        },
        ...(votingMeta ? { voting: votingMeta } : {}),
        ...(synthesizerInfo ? { synthesizer: synthesizerInfo } : {})
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseBody)
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal error',
        details: err?.message || String(err)
      })
    }
  }
}
