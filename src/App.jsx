import { useState } from 'react'
import './App.css'

const AVAILABLE_MODELS = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Modelo más avanzado de OpenAI', icon: '🟢', provider: 'openai' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Versión rápida y económica', icon: '🟢', provider: 'openai' },
    { id: 'o1-preview', name: 'o1 Preview', description: 'Razonamiento avanzado', icon: '🟢', provider: 'openai' },
  ],
  anthropic: [
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Máxima inteligencia', icon: '🟣', provider: 'anthropic' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Equilibrio perfecto', icon: '🟣', provider: 'anthropic' },
    { id: 'claude-haiku-4-20250514', name: 'Claude Haiku 4', description: 'Velocidad y eficiencia', icon: '🟣', provider: 'anthropic' },
  ],
  google: [
    { id: 'gemini-2.5-pro-exp-0206', name: 'Gemini 2.5 Pro', description: 'Última generación de Google', icon: '🔵', provider: 'google' },
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
  const [totalSpent, setTotalSpent] = useState(22500)
  const [responseCount, setResponseCount] = useState(2847)

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
        setTotalSpent(prev => prev + (data.debate.stats.totalCost * 1000))
      }
      setResponseCount(prev => prev + 1)

    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        role: 'error',
        content: 'Hubo un error al procesar tu solicitud.'
      }])
    } finally {
      setIsProcessing(false)
    }
  }

  const budgetPercentage = (totalSpent / budgetLimit) * 100

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {showConfig && <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowConfig(false)} />}

      <div className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${showConfig ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800">⚙️ Configuración</h2>
            <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-500 mb-3">💰 Presupuesto</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Moneda</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-sky-400 focus:outline-none">
                    <option value="CLP">🇨🇱 CLP</option>
                    <option value="USD">🇺🇸 USD</option>
                    <option value="EUR">🇪🇺 EUR</option>
                    <option value="GBP">🇬🇧 GBP</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Límite</label>
                  <input type="number" value={budgetLimit} onChange={(e) => setBudgetLimit(Number(e.target.value))} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-sky-400 focus:outline-none" />
                </div>
                
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-600">Usado</span>
                    <span className="text-sm font-bold text-sky-600">{budgetPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-400" style={{ width: `${budgetPercentage}%` }} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-slate-600">${totalSpent.toLocaleString()} {currency}</span>
                    <span className="text-slate-400">/ ${budgetLimit.toLocaleString()} {currency}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-xl">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center space-x-3 mb-4">
            <img src="/logo-tria.jpg" alt="TrIA" className="w-11 h-11 rounded-xl shadow-lg" />
            <div>
              <span className="font-black text-xl tracking-tight bg-gradient-to-r from-sky-500 to-cyan-400 bg-clip-text text-transparent">TrIA</span>
              <div className="text-xs font-bold text-slate-500">Platform v3.0</div>
            </div>
          </div>
          
          <button onClick={() => { setMessages([]); setInputValue('') }} className="w-full bg-gradient-to-r from-sky-500 to-cyan-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all">
            + Nueva Conversación
          </button>
        </div>

        <nav className="p-2.5 border-b border-slate-200">
          <a href="#" className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-gradient-to-r from-sky-50 to-cyan-50 text-sky-600">
            <span className="text-xl">💬</span>
            <span className="font-bold text-sm">Chat</span>
            <span className="ml-auto px-2 py-0.5 rounded-lg text-xs font-bold bg-sky-500 text-white">{messages.length}</span>
          </a>
        </nav>

        <div className="flex-1" />

        <div className="p-4 border-t border-slate-200">
          <div className="text-xs text-slate-400 text-center">Powered by Multi-AI</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-xl font-black bg-gradient-to-r from-sky-500 to-cyan-400 bg-clip-text text-transparent">Orquestación Multi-IA</h1>
              <p className="text-xs mt-1 font-bold flex items-center gap-2 text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="font-black text-green-600">LIVE</span>
                  <span>·</span>
                  <span>Listo para colaborar</span>
                </span>
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="px-4 py-2 rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="text-sm">
                  <span className="font-black text-2xl text-green-600">{responseCount.toLocaleString()}</span>
                </div>
                <div className="text-[10px] font-bold uppercase text-slate-500">respuestas hoy</div>
              </div>
              
              <div className="px-4 py-2.5 rounded-xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50">
                <div className="text-sm">
                  <span className="font-black text-lg text-sky-600">${(totalSpent / 1000).toFixed(2)}</span>
                  <span className="font-bold text-slate-500"> / ${(budgetLimit / 1000).toFixed(0)}</span>
                </div>
              </div>
              
              <button onClick={() => setShowConfig(true)} className="p-3 rounded-xl hover:bg-slate-100 transition-all">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <div className="border-b border-slate-200 bg-white p-6 shadow-sm overflow-y-auto max-h-96">
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 block">Modo de colaboración</label>
              <div className="flex gap-2.5">
                {[
                  { id: 'collaborative', icon: '👥', label: 'Colaborativo' },
                  { id: 'voting', icon: '📋', label: 'Votación' },
                  { id: 'hybrid', icon: '⚡', label: 'Híbrido' }
                ].map(m => (
                  <button key={m.id} onClick={() => setMode(m.id)} className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${mode === m.id ? 'bg-gradient-to-r from-sky-500 to-cyan-400 text-white shadow-lg' : 'border-2 border-slate-200 bg-white text-slate-600 hover:shadow-lg'}`}>
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 block">🤖 Selecciona las IAs</label>
              
              {Object.entries(AVAILABLE_MODELS).map(([provider, models]) => (
                <div key={provider} className="space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'Google'}
                  </div>
                  
                  {models.map(model => (
                    <div key={model.id} className={`p-4 border-2 rounded-xl transition-all ${selectedModels[model.id] ? 'border-sky-500 bg-gradient-to-br from-sky-50 to-cyan-50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleModel(model.id)}>
                        <input type="checkbox" checked={selectedModels[model.id] || false} onChange={() => {}} className="w-4 h-4 pointer-events-none" />
                        <div className="flex-1">
                          <div className="font-bold text-slate-700">{model.name}</div>
                          <div className="text-xs text-slate-500">{model.description}</div>
                        </div>
                        <span className="text-2xl">{model.icon}</span>
                      </div>
                      
                      {selectedModels[model.id] && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <textarea value={modelInstructions[model.id] || ''} onChange={(e) => setInstruction(model.id, e.target.value)} placeholder={`Instrucciones para ${model.name}...`} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-sky-400 focus:outline-none resize-none" rows="2" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-slate-700 mb-2">¡Bienvenido a TrIA Platform!</h2>
                <p className="text-slate-500">Selecciona tus IAs y empieza a colaborar</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl px-6 py-4 rounded-2xl ${msg.role === 'user' ? 'bg-gradient-to-r from-sky-500 to-cyan-400 text-white shadow-lg' : msg.role === 'error' ? 'bg-red-50 border-2 border-red-200 text-red-600' : 'bg-white border-2 border-slate-200 text-slate-700 shadow-sm'}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  
                  {msg.debate && (
                    <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500 flex gap-4">
                      <span>💰 ${(msg.debate.stats?.totalCost || 0).toFixed(4)}</span>
                      <span>⏱️ {msg.debate.stats?.totalTime || 0}s</span>
                      <span>🔄 {msg.debate.stats?.totalRounds || 0} rondas</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="max-w-3xl px-6 py-4 rounded-2xl bg-white border-2 border-sky-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {[0, 150, 300].map((delay, i) => (
                        <span key={i} className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                    <span className="text-sm text-slate-500">Las IAs están pensando...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white p-6 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-4">
              <textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} placeholder="Escribe tu mensaje... (Enter para enviar, Shift+Enter para nueva línea)" className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-400 focus:outline-none resize-none" rows={3} disabled={isProcessing} />
              <button onClick={handleSend} disabled={!inputValue.trim() || isProcessing} className="px-8 py-3 bg-gradient-to-r from-sky-500 to-cyan-400 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                🚀 Enviar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
