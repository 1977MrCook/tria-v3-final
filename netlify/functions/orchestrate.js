import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)

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
        max_tokens: 1000
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
        max_tokens: 1000,
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
      const geminiModel = genAI.getGenerativeModel({ 
        model: model.id,
        systemInstruction: systemPrompt
      })
      
      const result = await geminiModel.generateContent(prompt)
      const response = await result.response
      
      return {
        model: model.name,
        content: response.text(),
        cost: 0.0001,
        time: (Date.now() - startTime) / 1000
      }
    }
  } catch (error) {
    console.error(`Error calling ${model.name}:`, error)
    return {
      model: model.name,
      content: `Error al obtener respuesta de ${model.name}: ${error.message}`,
      cost: 0,
      time: (Date.now() - startTime) / 1000,
      error: true
    }
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { message, models, mode } = JSON.parse(event.body)
    
    const rounds = []
    let totalCost = 0
    let totalTime = 0
    
    // Primera ronda: cada modelo responde
    const round1Responses = await Promise.all(
      models.map(model => callModel(model, message, model.systemPrompt))
    )
    
    rounds.push({ round: 1, responses: round1Responses })
    round1Responses.forEach(r => {
      totalCost += r.cost
      totalTime += r.time
    })
    
    // Segunda ronda: síntesis
    const synthesisPrompt = `Basándote en estas respuestas de diferentes IAs, crea una respuesta final mejorada:

${round1Responses.map(r => `${r.model}: ${r.content}`).join('\n\n')}

Sintetiza lo mejor de cada respuesta en una sola respuesta clara y completa.`
    
    const finalResponse = await callModel(
      models[0],
      synthesisPrompt,
      'Eres un sintetizador experto. Combina las mejores ideas de todas las respuestas en una respuesta final clara y completa.'
    )
    
    rounds.push({ round: 2, responses: [finalResponse] })
    totalCost += finalResponse.cost
    totalTime += finalResponse.time
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        finalResponse: finalResponse.content,
        debate: {
          rounds,
          stats: {
            totalCost,
            totalTime: totalTime.toFixed(2),
            totalRounds: rounds.length
          }
        }
      })
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}
