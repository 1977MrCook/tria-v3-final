import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import NeuralNetworkPanel from '../components/neural/NeuralNetworkPanel'
import ModelSelector from '../components/models/ModelSelector'
import ModeSelector from '../components/models/ModeSelector'
import DebateViewer from '../components/debate/DebateViewer'
import BudgetManager from '../components/budget/BudgetManager'

export default function ChatPage() {
  const [selectedModels, setSelectedModels] = useState([])
  const [selectedMode, setSelectedMode] = useState('roles')
  const [customInstructions, setCustomInstructions] = useState({})
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentDebate, setCurrentDebate] = useState(null)
  const [totalSpent, setTotalSpent] = useState(0)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [messages])

  const handleModelToggle = (model) => {
    setSelectedModels(prev => {
      const exists = prev.find(m => m.id === model.id)
      if (exists) {
        return prev.filter(m => m.id !== model.id)
      } else {
        return [...prev, model]
      }
    })
  }

  const handleInstructionChange = (modelId, instruction) => {
    setCustomInstructions(prev => ({
      ...prev,
      [modelId]: instruction
    }))
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || selectedModels.length === 0 || isProcessing) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setIsProcessing(true)

    // Agregar mensaje del usuario
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, newUserMessage])

    try {
      // Preparar modelos con instrucciones personalizadas
      const modelsWithInstructions = selectedModels.map(model => ({
        ...model,
        systemPrompt: customInstructions[model.id] || model.systemPrompt || `Eres ${model.displayName}. ${model.defaultRole}.`
      }))

      // Llamar al backend
      const response = await fetch('/.netlify/functions/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          models: modelsWithInstructions,
          mode: selectedMode,
          conversationHistory: messages.slice(-10) // Últimos 10 mensajes
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      // Actualizar debate
      setCurrentDebate(data.debate)

      // Actualizar costo total
      if (data.debate?.stats?.totalCost) {
        setTotalSpent(prev => prev + data.debate.stats.totalCost)
      }

      // Agregar respuesta final
      const assistantMessage = {
        role: 'assistant',
        content: data.finalResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          mode: selectedMode,
          modelsUsed: data.modelsUsed,
          cost: data.debate?.stats?.totalCost || 0,
          time: data.debate?.stats?.totalTime || 0
        }
      }
      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      console.error('Error:', error)
      const errorMessage = {
        role: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="chat-page">
      {/* COLUMNA IZQUIERDA: Red Neuronal + Presupuesto */}
      <aside className="left-sidebar">
        <NeuralNetworkPanel 
          models={selectedModels}
          isProcessing={isProcessing}
        />
        <BudgetManager 
          spent={totalSpent}
          onBudgetUpdate={() => {}}
        />
      </aside>

      {/* COLUMNA CENTRAL: Chat + Configuración */}
      <main className="chat-main">
        <div className="config-section">
          <ModelSelector
            selectedModels={selectedModels}
            onModelToggle={handleModelToggle}
            customInstructions={customInstructions}
            onInstructionChange={handleInstructionChange}
          />
          <ModeSelector
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
          />
        </div>

        <div className="chat-container">
          <div className="messages-list">
            {messages.length === 0 && (
              <div className="empty-chat">
                <h2>¡Bienvenido a TrIA Platform!</h2>
                <p>Selecciona al menos un modelo y comienza a conversar</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-content">{msg.content}</div>
                {msg.metadata && (
                  <div className="message-metadata">
                    <span>{msg.metadata.modelsUsed?.join(', ')}</span>
                    <span>${msg.metadata.cost?.toFixed(4)}</span>
                    <span>{msg.metadata.time}s</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
              disabled={isProcessing || selectedModels.length === 0}
              rows={3}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || selectedModels.length === 0 || isProcessing}
              className="send-button"
            >
              {isProcessing ? (
                <Loader2 size={20} className="spinning" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>
      </main>

      {/* COLUMNA DERECHA: Debate en tiempo real */}
      <aside className="right-sidebar">
        <DebateViewer 
          debate={currentDebate}
          isActive={isProcessing}
        />
      </aside>

      <style jsx>{`
        .chat-page {
          display: grid;
          grid-template-columns: 320px 1fr 400px;
          gap: 16px;
          height: calc(100vh - 80px);
          padding: 16px;
        }

        .left-sidebar,
        .right-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
        }

        .chat-main {
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow: hidden;
        }

        .config-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          flex-shrink: 0;
        }

        .chat-container {
          flex: 1;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .messages-list {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .empty-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #64748b;
        }

        .empty-chat h2 {
          margin: 0 0 8px 0;
          color: #94a3b8;
          font-size: 24px;
        }

        .message {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 12px;
          animation: fadeIn 0.3s ease-out;
        }

        .message.user {
          align-self: flex-end;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
        }

        .message.assistant {
          align-self: flex-start;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(51, 65, 85, 0.5);
          color: #e2e8f0;
        }

        .message.error {
          align-self: center;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .message-content {
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .message-metadata {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: #94a3b8;
        }

        .input-area {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: rgba(30, 41, 59, 0.5);
          border-top: 1px solid rgba(51, 65, 85, 0.5);
        }

        .input-area textarea {
          flex: 1;
          padding: 12px;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 14px;
          font-family: inherit;
          resize: none;
          transition: border-color 0.2s;
        }

        .input-area textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .input-area textarea:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .send-button {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-radius: 8px;
          color: white;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive */
        @media (max-width: 1400px) {
          .chat-page {
            grid-template-columns: 280px 1fr 350px;
          }
        }

        @media (max-width: 1200px) {
          .chat-page {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
          }

          .left-sidebar,
          .right-sidebar {
            display: none;
          }

          .config-section {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
