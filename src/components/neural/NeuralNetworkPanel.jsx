import { useState, useEffect, useRef } from 'react'

export default function NeuralNetworkPanel({ models, isProcessing }) {
  const canvasRef = useRef(null)
  const [neurons, setNeurons] = useState([])
  const [connections, setConnections] = useState([])
  const animationRef = useRef(null)
  const pulsesRef = useRef([])

  // Inicializar neuronas basadas en modelos seleccionados
  useEffect(() => {
    if (!models || models.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const width = canvas.width
    const height = canvas.height

    // Crear neuronas para cada modelo
    const newNeurons = models.map((model, index) => {
      const angle = (index / models.length) * Math.PI * 2 - Math.PI / 2
      const radius = Math.min(width, height) * 0.3
      
      return {
        id: model.id,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        radius: 8,
        color: model.color || '#3b82f6',
        label: model.displayName || model.name,
        active: false,
        pulse: 0
      }
    })

    // Agregar neurona central (usuario)
    newNeurons.push({
      id: 'user',
      x: width / 2,
      y: height / 2,
      radius: 12,
      color: '#10b981',
      label: 'Usuario',
      active: true,
      pulse: 0
    })

    setNeurons(newNeurons)

    // Crear conexiones
    const newConnections = []
    const userNeuron = newNeurons[newNeurons.length - 1]
    
    // Conectar usuario con cada modelo
    for (let i = 0; i < models.length; i++) {
      newConnections.push({
        from: userNeuron,
        to: newNeurons[i],
        strength: 0
      })
    }

    // Conectar modelos entre sí
    for (let i = 0; i < models.length; i++) {
      for (let j = i + 1; j < models.length; j++) {
        newConnections.push({
          from: newNeurons[i],
          to: newNeurons[j],
          strength: 0
        })
      }
    }

    setConnections(newConnections)
  }, [models])

  // Animar cuando está procesando
  useEffect(() => {
    if (isProcessing) {
      // Activar todas las neuronas
      setNeurons(prev => prev.map(n => ({ ...n, active: true })))
      
      // Crear pulsos
      const interval = setInterval(() => {
        const userNeuron = neurons.find(n => n.id === 'user')
        if (userNeuron && neurons.length > 1) {
          pulsesRef.current.push({
            from: userNeuron,
            to: neurons[Math.floor(Math.random() * (neurons.length - 1))],
            progress: 0,
            speed: 0.02
          })
        }
      }, 300)

      return () => clearInterval(interval)
    } else {
      // Desactivar neuronas excepto usuario
      setNeurons(prev => prev.map(n => ({ 
        ...n, 
        active: n.id === 'user' 
      })))
    }
  }, [isProcessing, neurons])

  // Loop de animación
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Dibujar conexiones
      connections.forEach(conn => {
        const alpha = conn.strength * 0.3
        ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(conn.from.x, conn.from.y)
        ctx.lineTo(conn.to.x, conn.to.y)
        ctx.stroke()
      })

      // Dibujar pulsos
      pulsesRef.current = pulsesRef.current.filter(pulse => {
        pulse.progress += pulse.speed

        if (pulse.progress >= 1) return false

        const x = pulse.from.x + (pulse.to.x - pulse.from.x) * pulse.progress
        const y = pulse.from.y + (pulse.to.y - pulse.from.y) * pulse.progress

        // Dibujar pulso
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 6)
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)')
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)')
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fill()

        return true
      })

      // Dibujar neuronas
      neurons.forEach(neuron => {
        // Efecto de pulso para neuronas activas
        if (neuron.active) {
          neuron.pulse = (neuron.pulse + 0.05) % (Math.PI * 2)
          const pulseScale = 1 + Math.sin(neuron.pulse) * 0.2

          // Glow exterior
          const gradient = ctx.createRadialGradient(
            neuron.x, neuron.y, 0,
            neuron.x, neuron.y, neuron.radius * pulseScale * 2
          )
          gradient.addColorStop(0, neuron.color + '40')
          gradient.addColorStop(1, neuron.color + '00')
          
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(neuron.x, neuron.y, neuron.radius * pulseScale * 2, 0, Math.PI * 2)
          ctx.fill()
        }

        // Círculo principal
        ctx.fillStyle = neuron.active ? neuron.color : neuron.color + '60'
        ctx.beginPath()
        ctx.arc(neuron.x, neuron.y, neuron.radius, 0, Math.PI * 2)
        ctx.fill()

        // Borde
        ctx.strokeStyle = neuron.active ? '#ffffff' : '#ffffff40'
        ctx.lineWidth = 2
        ctx.stroke()

        // Label
        ctx.fillStyle = '#e2e8f0'
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(neuron.label, neuron.x, neuron.y + neuron.radius + 16)
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [neurons, connections])

  return (
    <div className="neural-network-panel">
      <div className="panel-header">
        <h3>Red Neuronal</h3>
        <div className={`status-indicator ${isProcessing ? 'active' : ''}`}>
          <div className="pulse-dot"></div>
          <span>{isProcessing ? 'Procesando' : 'Inactivo'}</span>
        </div>
      </div>
      
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={400}
        className="neural-canvas"
      />

      <style jsx>{`
        .neural-network-panel {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 12px;
          padding: 16px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #e2e8f0;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #64748b;
        }

        .status-indicator.active {
          color: #3b82f6;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #64748b;
        }

        .status-indicator.active .pulse-dot {
          background: #3b82f6;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }

        .neural-canvas {
          width: 100%;
          height: 100%;
          border-radius: 8px;
        }
      `}</style>
    </div>
  )
}
