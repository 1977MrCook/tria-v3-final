import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)

// Modelos Gemini 3.0 correctos (Diciembre 2025)
const GEMINI_MODELS = {
  'gemini-3-flash': 'gemini-3-flash',
  'gemini-3-pro': 'gemini-3-pro', 
  'gemini-2.5-pro': 'gemini-2.5-pro'
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
        max_tokens: 1500
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
        max_tokens: 1500,
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

    // MODO COLABORATIVO
    if (mode === 'collaborative') {
      const prev = []

      for (let i = 0; i < models.length; i++) {
        const m = models[i]
        const me = safeName(m)

        let orchestrationSystem = ''
        if (i === 0) {
          orchestrationSystem =
            `Eres ${me}. Responde la pregunta del usuario de forma completa.\n` +
            `Estás colaborando con otras IAs; tu respuesta será leída por las siguientes IAs.`
        } else if (i === models.length - 1) {
          orchestrationSystem =
            `Eres ${me}. Lee las respuestas anteriores.\n` +
            `Crea la mejor síntesis final combinando lo mejor de todas.`
        } else {
          const prevName = prev[prev.length - 1]?.model || 'la IA anterior'
          orchestrationSystem =
            `Eres ${me}. Lee la respuesta de ${prevName}.\n` +
            `Identifica qué falta o qué se puede mejorar. Da tu versión mejorada.`
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

        if (res && typeof res.content === 'string' && res.content.trim()) {
          prev.push({ model: res.model, content: res.content })
        }
      }

      const lastNonEmpty = [...rounds]
        .reverse()
        .map((r) => r.responses && r.responses[0])
        .find((x) => x && typeof x.content === 'string' && x.content.trim())

      finalResponse = lastNonEmpty ? lastNonEmpty.content : 'No se pudo generar respuesta.'
    }

    // MODO VOTACIÓN
    if (mode === 'voting') {
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

      const proposalTextList = proposalSet
        .map((p, i) => `[${i + 1}] ${p.model}:\n${p.content}`)
        .join('\n\n')

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
      const round2Responses = []

      for (let i = 0; i < models.length; i++) {
        const m = models[i]
        const me = safeName(m)

        const sys = withSystem(
          m,
          `Eres ${me}. Lee estas propuestas y vota por la mejor.\n` +
            `Formato: VOTO: [nombre] | RAZÓN: [texto]`
        )

        const prompt =
          `Pregunta: ${message}\n\nPropuestas:\n${proposalTextList}\n\nEmite tu voto.`

        const res = await callModel(m, prompt, sys)

        totalCost += Number(res.cost || 0)
        totalTime += Number(res.time || 0)

        round2Responses.push(res)

        if (!res?.error && typeof res.content === 'string' && res.content.trim()) {
          const { target, reason } = parseVote(res.content)
          const resolved = resolveTarget(target)
          if (resolved) {
            voteCounts[resolved] = (voteCounts[resolved] || 0) + 1
            voteDetails.push({ voter: res.model, vote: resolved, reason: reason || '' })
          } else {
            voteDetails.push({ voter: res.model, vote: null, reason: reason || '' })
          }
        }
      }

      rounds.push({ round: 2, responses: round2Responses })

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

      const winningProposal =
        winner
          ? proposalSet.find((p) => normalizeKey(p.model) === normalizeKey(winner)) ||
            proposalSet.find((p) => p.model === winner) ||
            null
          : null

      if (winningProposal && typeof winningProposal.content === 'string' && winningProposal.content.trim()) {
        finalResponse =
          `${winner} ganó (${winnerVotes}/${totalVotes || models.length}).\n\n` +
          `${winningProposal.content}`
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
        ...(votingMeta ? { voting: votingMeta } : {})
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
