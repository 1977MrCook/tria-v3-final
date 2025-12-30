# 🔺 TrIA Platform v3.0

**Multi-AI Orchestration Platform** - Orquesta ChatGPT, Claude y Gemini en colaboración real.

---

## ✨ Características

### 🎨 Interfaz Espectacular
- **Logo exclusivo** con gradientes cyan-blue-purple-orange
- **Red neuronal animada** en tiempo real
- **Layout de 3 columnas** profesional
- **Tema oscuro** de nivel mundial

### 🤖 Colaboración Multi-IA
- **3 Modos**: Roles Expertos, Debate Democrático, Híbrido Adaptativo
- **Instrucciones personalizadas** por cada IA
- **Debate en tiempo real** visible
- **Optimización ML** automática

### 💰 Presupuesto Multi-Moneda
- **8 monedas** soportadas (USD, CLP, EUR, GBP, JPY, CNY, BRL, MXN)
- **Conversión en tiempo real** vía API
- **Alertas visuales** (verde/amarillo/naranja/rojo)
- **Tracking preciso** de costos

---

## 🚀 Deploy en Netlify

### 1. Conectar Repositorio
1. Ve a [Netlify](https://app.netlify.com)
2. Click en **"Add new site" → "Import an existing project"**
3. Conecta tu repositorio de GitHub
4. Selecciona el repo `tria-platform`

### 2. Configurar Build
Netlify debería detectar automáticamente `netlify.toml`, pero verifica:

```
Build command: npm install && npm run build && cd netlify/functions && npm install
Publish directory: dist
Functions directory: netlify/functions
```

### 3. Agregar Variables de Entorno
En **Site settings → Environment variables**, agrega:

```
OPENAI_API_KEY=sk-proj-tu-clave-aquí
ANTHROPIC_API_KEY=sk-ant-tu-clave-aquí
GOOGLE_API_KEY=AIza-tu-clave-aquí
```

### 4. Deploy
Click en **"Deploy site"**

---

## 🛠️ Desarrollo Local

### Instalación
```bash
npm install
```

### Configurar API Keys
```bash
cp .env.example .env
# Edita .env y agrega tus API keys
```

### Ejecutar
```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

---

## 📁 Estructura del Proyecto

```
tria-platform-v3/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Logo.jsx              # Logo con gradientes
│   │   │   └── Header.jsx            # Header principal
│   │   ├── models/
│   │   │   ├── ModelSelector.jsx     # Selector de modelos + instrucciones
│   │   │   └── ModeSelector.jsx      # Selector de modos
│   │   ├── neural/
│   │   │   └── NeuralNetworkPanel.jsx  # Red neuronal animada
│   │   ├── budget/
│   │   │   └── BudgetManager.jsx     # Presupuesto multi-moneda
│   │   └── debate/
│   │       └── DebateViewer.jsx      # Panel de debate
│   ├── pages/
│   │   └── ChatPage.jsx              # Página principal
│   ├── config/
│   │   └── models.js                 # Catálogo de modelos
│   ├── App.jsx                       # Componente raíz
│   ├── main.jsx                      # Entry point
│   └── index.css                     # Estilos globales
├── netlify/
│   └── functions/
│       ├── orchestrate.js            # Backend de orquestación
│       └── package.json              # Dependencias backend
├── public/
│   └── favicon.svg                   # Logo SVG
├── index.html
├── package.json
├── vite.config.js
├── netlify.toml
└── .env.example
```

---

## 🎯 Cómo Usar

### 1. Seleccionar Modelos
- Click en los modelos que quieres usar
- Agrega instrucciones personalizadas (opcional)

### 2. Elegir Modo
- **Roles Expertos**: Colaboración iterativa
- **Debate Democrático**: Propuesta → Crítica → Votación
- **Híbrido**: ML decide la mejor estrategia

### 3. Chatear
- Escribe tu pregunta
- Las IAs colaboran en tiempo real
- Ve el debate en el panel derecho

---

## 💡 Tips

- **Instrucciones personalizadas**: Define roles específicos para cada IA
- **Presupuesto**: Configura tu límite para evitar gastos excesivos
- **Modos**: Usa "Roles" para tareas complejas, "Debate" para decisiones
- **Red neuronal**: Observa cómo se activan las conexiones

---

## 🐛 Troubleshooting

### Error 400 en Gemini
✅ Ya corregido - no usamos `systemInstruction`

### Error 404 en Claude
✅ Ya corregido - modelos actualizados a versiones correctas

### Netlify no encuentra archivos
✅ Verifica que `dist/` esté en el build output

---

## 📝 Versión

**v3.0.0** - Diciembre 2024

---

## 👨‍💻 Desarrollado por

Oscar Pérez Fresnius @ Therapía IV

---

## 📄 Licencia

MIT
