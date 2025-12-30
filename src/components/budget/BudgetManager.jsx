import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, AlertTriangle, AlertCircle } from 'lucide-react'

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'Dólar USD', flag: '🇺🇸' },
  { code: 'CLP', symbol: '$', name: 'Peso Chileno', flag: '🇨🇱' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'Libra', flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥', name: 'Yen', flag: '🇯🇵' },
  { code: 'CNY', symbol: '¥', name: 'Yuan', flag: '🇨🇳' },
  { code: 'BRL', symbol: 'R$', name: 'Real', flag: '🇧🇷' },
  { code: 'MXN', symbol: '$', name: 'Peso MX', flag: '🇲🇽' }
]

export default function BudgetManager({ spent, onBudgetUpdate }) {
  const [currency, setCurrency] = useState('CLP')
  const [budget, setBudget] = useState(50000)
  const [exchangeRates, setExchangeRates] = useState(null)
  const [loading, setLoading] = useState(true)

  // Obtener tasas de cambio al montar
  useEffect(() => {
    fetchExchangeRates()
  }, [])

  const fetchExchangeRates = async () => {
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
      const data = await res.json()
      setExchangeRates(data.rates)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching exchange rates:', error)
      setLoading(false)
    }
  }

  // Convertir gasto de USD a moneda seleccionada
  const spentInCurrency = exchangeRates 
    ? spent * exchangeRates[currency]
    : spent

  // Calcular porcentaje usado
  const percentage = Math.min((spentInCurrency / budget) * 100, 100)

  // Determinar color y nivel de alerta
  const getAlertLevel = () => {
    if (percentage < 50) return { color: 'green', icon: TrendingUp, text: 'Óptimo' }
    if (percentage < 80) return { color: 'yellow', icon: AlertTriangle, text: 'Alerta' }
    if (percentage < 95) return { color: 'orange', icon: AlertCircle, text: 'Crítico' }
    return { color: 'red', icon: AlertCircle, text: 'Límite' }
  }

  const alert = getAlertLevel()
  const AlertIcon = alert.icon

  // Convertir a USD para mostrar equivalente
  const budgetInUSD = exchangeRates 
    ? budget / exchangeRates[currency]
    : budget

  const spentInUSD = spent

  const selectedCurrency = CURRENCIES.find(c => c.code === currency)

  if (loading) {
    return (
      <div className="budget-manager loading">
        <div className="spinner"></div>
        <p>Cargando tasas de cambio...</p>
      </div>
    )
  }

  return (
    <div className="budget-manager">
      <div className="budget-header">
        <DollarSign size={20} />
        <h3>Presupuesto</h3>
      </div>

      <div className="budget-controls">
        <div className="currency-selector">
          <label>Moneda</label>
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value)}
            className="select-currency"
          >
            {CURRENCIES.map(curr => (
              <option key={curr.code} value={curr.code}>
                {curr.flag} {curr.code}
              </option>
            ))}
          </select>
        </div>

        <div className="budget-input">
          <label>Límite</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="input-budget"
            min="0"
            step={currency === 'CLP' ? 1000 : currency === 'JPY' ? 100 : 10}
          />
        </div>
      </div>

      <div className={`budget-progress ${alert.color}`}>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="progress-label">
          <span className="percentage">{percentage.toFixed(1)}%</span>
          <div className={`alert-badge ${alert.color}`}>
            <AlertIcon size={14} />
            <span>{alert.text}</span>
          </div>
        </div>
      </div>

      <div className="budget-details">
        <div className="detail-row">
          <span className="label">Gastado:</span>
          <span className="value">
            {selectedCurrency.symbol}{spentInCurrency.toFixed(currency === 'CLP' ? 0 : 2)} {currency}
          </span>
        </div>
        <div className="detail-row">
          <span className="label">Disponible:</span>
          <span className="value">
            {selectedCurrency.symbol}{(budget - spentInCurrency).toFixed(currency === 'CLP' ? 0 : 2)} {currency}
          </span>
        </div>
        <div className="detail-row secondary">
          <span className="label">Equivalente USD:</span>
          <span className="value">
            ${spentInUSD.toFixed(4)} / ${budgetInUSD.toFixed(2)}
          </span>
        </div>
      </div>

      {percentage >= 95 && (
        <div className="budget-warning">
          <AlertCircle size={16} />
          <p>¡Has alcanzado tu límite de presupuesto!</p>
        </div>
      )}

      <style jsx>{`
        .budget-manager {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 12px;
          padding: 16px;
        }

        .budget-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          color: #e2e8f0;
        }

        .budget-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .budget-controls {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .currency-selector label,
        .budget-input label {
          display: block;
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 4px;
        }

        .select-currency,
        .input-budget {
          width: 100%;
          padding: 8px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 14px;
        }

        .select-currency:focus,
        .input-budget:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .budget-progress {
          margin-bottom: 12px;
        }

        .progress-bar {
          height: 8px;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease, background 0.3s ease;
        }

        .budget-progress.green .progress-fill {
          background: linear-gradient(90deg, #10b981, #059669);
        }

        .budget-progress.yellow .progress-fill {
          background: linear-gradient(90deg, #fbbf24, #f59e0b);
        }

        .budget-progress.orange .progress-fill {
          background: linear-gradient(90deg, #f59e0b, #ea580c);
        }

        .budget-progress.red .progress-fill {
          background: linear-gradient(90deg, #ef4444, #dc2626);
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .percentage {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
        }

        .alert-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .alert-badge.green {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .alert-badge.yellow {
          background: rgba(251, 191, 36, 0.1);
          color: #fbbf24;
        }

        .alert-badge.orange {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .alert-badge.red {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .budget-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .detail-row .label {
          color: #94a3b8;
        }

        .detail-row .value {
          color: #e2e8f0;
          font-weight: 500;
        }

        .detail-row.secondary {
          font-size: 11px;
          padding-top: 8px;
          border-top: 1px solid rgba(51, 65, 85, 0.3);
        }

        .detail-row.secondary .value {
          color: #64748b;
        }

        .budget-warning {
          margin-top: 12px;
          padding: 8px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ef4444;
          font-size: 12px;
        }

        .budget-warning p {
          margin: 0;
        }

        .budget-manager.loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          gap: 12px;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(59, 130, 246, 0.3);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
