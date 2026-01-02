import { useState } from 'react'

const RATING_CRITERIA = [
  { key: 'quality', label: 'Calidad General', icon: '📊' },
  { key: 'speed', label: 'Velocidad', icon: '⚡' },
  { key: 'costBenefit', label: 'Costo-Beneficio', icon: '💰' },
  { key: 'clarity', label: 'Claridad', icon: '💡' },
  { key: 'completeness', label: 'Completitud', icon: '✅' },
  { key: 'accuracy', label: 'Precisión', icon: '🎯' }
]

export default function RatingModal({ isOpen, onClose, onSubmit, debate }) {
  const [ratings, setRatings] = useState({
    quality: 7,
    speed: 7,
    costBenefit: 7,
    clarity: 7,
    completeness: 7,
    accuracy: 7
  })
  const [comment, setComment] = useState('')
  const [hoveredCriterion, setHoveredCriterion] = useState(null)
  const [hoveredValue, setHoveredValue] = useState(null)

  if (!isOpen) return null

  const handleSubmit = () => {
    const avgRating = Object.values(ratings).reduce((a, b) => a + b, 0) / 6
    onSubmit({
      ratings,
      avgRating,
      comment: comment.trim(),
      cost: debate?.stats?.totalCost || 0,
      time: parseFloat(debate?.stats?.totalTime || 0),
      synthesizer: debate?.synthesizer?.synthesizer || null,
      synthesizerName: debate?.synthesizer?.synthesizerName || null
    })
    onClose()
  }

  const handleSkip = () => {
    onClose()
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="rating-modal">
        <div className="modal-header">
          <h2>⭐ Evalúa esta respuesta</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="modal-body">
          <div className="rating-criteria">
            {RATING_CRITERIA.map(criterion => (
              <div key={criterion.key} className="criterion-row">
                <div className="criterion-label">
                  <span className="criterion-icon">{criterion.icon}</span>
                  <span className="criterion-name">{criterion.label}</span>
                </div>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
                    <button
                      key={value}
                      className={`star ${value <= ratings[criterion.key] ? 'filled' : ''} ${
                        hoveredCriterion === criterion.key && value <= hoveredValue ? 'hovered' : ''
                      }`}
                      onClick={() => setRatings({ ...ratings, [criterion.key]: value })}
                      onMouseEnter={() => {
                        setHoveredCriterion(criterion.key)
                        setHoveredValue(value)
                      }}
                      onMouseLeave={() => {
                        setHoveredCriterion(null)
                        setHoveredValue(null)
                      }}
                    >
                      ⭐
                    </button>
                  ))}
                  <span className="rating-value">{ratings[criterion.key]}/10</span>
                </div>
              </div>
            ))}
          </div>

          <div className="comment-section">
            <label>💬 Comentario (opcional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="¿Qué te gustó o qué mejorarías?"
              rows={3}
            />
          </div>

          {debate?.synthesizer && (
            <div className="synthesis-info">
              <small>
                🤖 Síntesis: <strong>{debate.synthesizer.synthesizerName}</strong>
                {debate.synthesizer.wasRandom && ' (aleatorio)'}
                {debate.synthesizer.wonVoting && ` (ganó ${debate.synthesizer.votes}/${debate.synthesizer.totalVotes} votos)`}
              </small>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={handleSkip} className="btn-secondary">
            Omitir
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            Enviar Evaluación
          </button>
        </div>
      </div>
    </>
  )
}
