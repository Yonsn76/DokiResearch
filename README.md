# DokiResearch

<p align="center">
  <img src="public/logo.png" alt="DokiResearch Logo" width="200"/>
</p>

<p align="center">
  <strong>Sistema multi-agente de investigacion automatizada</strong><br/>
  Implementado con LangGraph + LangChain.js + GitHub Models + Perplexity AI
</p>

<p align="center">
  <a href="https://github.com/Yonsn76/DokiResearch"><img src="https://img.shields.io/badge/GitHub-DokiResearch-181717?style=flat-square&logo=github" alt="GitHub Repo"/></a>
  <img src="https://img.shields.io/badge/DokiResearch-v1.0.0-blue?style=flat-square" alt="DokiResearch"/>
  <img src="https://img.shields.io/badge/LangGraph-Multi--Agent-green?style=flat-square" alt="LangGraph"/>
  <img src="https://img.shields.io/badge/GitHub%20Models-GPT--4o-purple?style=flat-square" alt="GitHub Models"/>
  <img src="https://img.shields.io/badge/Perplexity-sonar--deep--research-orange?style=flat-square" alt="Perplexity"/>
</p>

---

## Descripcion General

Sistema **multi-agente** donde cada agente es una entidad independiente con su propio LLM.

A diferencia de un agente unico con multiples herramientas, este sistema implementa **agentes especializados** que colaboran bajo la coordinacion de un **Supervisor**.

---

## Arquitectura del Sistema

```mermaid
flowchart TB
    subgraph ENTRADA["Entrada"]
        U[Usuario]
        Q[Consulta de Investigacion]
    end

    subgraph ORQUESTADOR["Capa de Orquestacion"]
        S[SUPERVISOR<br/>Coordinador Central]
    end

    subgraph WORKERS["Agentes Especializados"]
        B[BUSCADOR<br/>Perplexity sonar-deep-research]
        L[LECTOR<br/>GitHub Models GPT-4o]
        SY[SINTETIZADOR<br/>GitHub Models GPT-4o]
        E[ESCRITOR<br/>GitHub Models GPT-4o]
    end

    subgraph SALIDA["Salida"]
        D[Documento Final<br/>Markdown]
    end

    U --> Q
    Q --> S
    S -->|1. Buscar informacion| B
    B -->|Resultados + Chunks| S
    S -->|2. Analizar chunks| L
    L -->|Analisis parciales| S
    S -->|3. Sintetizar| SY
    SY -->|Analisis unificado| S
    S -->|4. Redactar documento| E
    E -->|Documento| S
    S --> D

    style S fill:#4a90d9,stroke:#2c5282,color:#fff
    style B fill:#f6ad55,stroke:#c05621,color:#fff
    style L fill:#68d391,stroke:#276749,color:#fff
    style SY fill:#fc8181,stroke:#c53030,color:#fff
    style E fill:#b794f4,stroke:#553c9a,color:#fff
```

---

## Flujo de Ejecucion Detallado

```mermaid
sequenceDiagram
    participant U as Usuario
    participant S as Supervisor
    participant B as Buscador
    participant L as Lector
    participant SY as Sintetizador
    participant E as Escritor

    U->>S: Consulta de investigacion
    
    Note over S: Evalua estado inicial
    S->>B: Delega busqueda
    
    Note over B: Perplexity API<br/>sonar-deep-research
    B-->>S: Resultados divididos en chunks
    
    Note over S: Evalua: hay chunks pendientes
    
    loop Por cada chunk
        S->>L: Analiza chunk N
        Note over L: GitHub Models GPT-4o
        L-->>S: Analisis parcial N
    end
    
    Note over S: Todos los chunks analizados
    S->>SY: Sintetiza analisis
    
    Note over SY: GitHub Models GPT-4o
    SY-->>S: Analisis unificado
    
    Note over S: Evalua: hay analisis
    S->>E: Delega redaccion
    
    Note over E: GitHub Models GPT-4o
    E-->>S: Documento final
    
    Note over S: Investigacion completa
    S-->>U: Documento Markdown
```

---

## Grafo de Estados (StateGraph)

```mermaid
stateDiagram-v2
    [*] --> Supervisor: Inicio
    
    Supervisor --> Buscador: Sin resultados
    Supervisor --> Lector: Chunks pendientes
    Supervisor --> Sintetizador: Chunks completados
    Supervisor --> Escritor: Sin documento
    Supervisor --> [*]: Completado
    
    Buscador --> Supervisor: Resultados + chunks
    Lector --> Supervisor: Chunk analizado
    Sintetizador --> Supervisor: Analisis unificado
    Escritor --> Supervisor: Documento generado

    note right of Supervisor
        Evalua el estado actual
        y decide el siguiente paso
    end note

    note right of Buscador
        Perplexity AI
        sonar-deep-research
        Divide en chunks
    end note

    note right of Lector
        GitHub Models GPT-4o
        Procesa chunk por chunk
    end note

    note right of Sintetizador
        GitHub Models GPT-4o
        Combina analisis parciales
    end note

    note right of Escritor
        GitHub Models GPT-4o
        Genera documento final
    end note
```

---

## Comparativa de Arquitecturas

| Caracteristica | Agente Unico | Multi-Agente |
|----------------|--------------|--------------|
| Modelos LLM | 1 LLM compartido | Multiples LLMs independientes |
| Especializacion | Generalista | Agentes especializados |
| Delegacion | Sin delegacion | Supervisor coordina |
| Contexto | Compartido | Aislado por agente |
| Escalabilidad | Limitada | Alta |
| Mantenimiento | Complejo | Modular |

---

## Stack Tecnologico

| Componente | Tecnologia | Proposito |
|------------|------------|-----------|
| Orquestacion | LangGraph | Grafo de estados para coordinacion |
| Framework | LangChain.js | Base para agentes y herramientas |
| LLM Busqueda | Perplexity sonar-deep-research | Busquedas en tiempo real |
| LLM Analisis | GitHub Models GPT-4o | Procesamiento y redaccion |
| Validacion | Zod | Schemas de herramientas |
| CLI | Chalk, Figures, Boxen | Interfaz profesional |

---

## Configuracion

### Variables de Entorno

Crear archivo `.env` en la raiz del proyecto:

```env
# GitHub Models API
GITHUB_TOKEN=tu_github_token_aqui
MODEL_NAME=gpt-4o

# Perplexity API (Agente Buscador)
PERPLEXITY_API_KEY=tu_perplexity_api_key_aqui
```

### Obtencion de Credenciales

| Servicio | URL |
|----------|-----|
| GitHub Token | https://github.com/settings/tokens |
| Perplexity API | https://www.perplexity.ai/settings/api |

---

## Instalacion

```bash
# Clonar el repositorio
git clone https://github.com/Yonsn76/DokiResearch.git
cd DokiResearch

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

---

## Uso

### Modo Chat Conversacional (Recomendado)

```bash
# Iniciar chat interactivo con el Supervisor LLM
npm run chat
```

En este modo puedes:
- **Conversar** naturalmente con DokiResearch
- **Pedir investigaciones** cuando lo necesites
- **Continuar la conversación** después de cada investigación
- **Revisar historial** de investigaciones completadas

**Comandos del chat:**
| Comando | Descripcion |
|---------|-------------|
| `/help` | Mostrar ayuda |
| `/clear` | Limpiar historial de conversacion |
| `/reset` | Reiniciar completamente |
| `/history` | Ver investigaciones completadas |
| `/exit` | Salir del chat |

**Ejemplos de conversacion:**
```
> Hola, ¿que puedes hacer?
> Investiga sobre inteligencia artificial en 2024
> ¿Que encontraste sobre el tema?
> Profundiza en machine learning
> Gracias, ahora investiga sobre cambio climatico
```

### Modo Directo (Una sola investigacion)

```bash
# Ejecutar investigacion directa
npm run dev "Tu consulta de investigacion"

# Ejemplos
npm run dev "Analisis del mercado de IA en 2024"
npm run dev "Tendencias en desarrollo de software"
npm run dev "Impacto economico del cambio climatico"
```

---

## Estructura del Proyecto

```
research-multi-agent/
├── src/
│   ├── index.ts                 # CLI modo directo
│   ├── chat.ts                  # CLI modo conversacional
│   ├── server.ts                # API server (opcional)
│   ├── supervisor/
│   │   └── supervisor-agent.ts  # Supervisor LLM conversacional
│   ├── agents/
│   │   └── worker-agents.ts     # Agentes especializados
│   ├── graph/
│   │   └── research-graph.ts    # StateGraph LangGraph
│   └── llm/
│       ├── github-models.ts     # Cliente GitHub Models
│       └── perplexity.ts        # Cliente Perplexity
├── .env                         # Variables de entorno
├── package.json
└── tsconfig.json
```

---

## Patrones Implementados

1. **Conversational Supervisor** - Supervisor LLM que puede conversar y asignar tareas
2. **Supervisor Pattern** - Agente central que coordina el flujo de investigacion
3. **Worker Agents** - Agentes especializados independientes
4. **StateGraph** - Grafo de estados para orquestacion
5. **Chunking** - Division de resultados grandes para evitar limites de tokens
6. **Tool Isolation** - Herramientas aisladas por agente
7. **Conversation Memory** - Memoria de conversacion y investigaciones previas

