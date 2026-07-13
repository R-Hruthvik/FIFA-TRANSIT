# FIFA World Cup Transit Operations Dashboard

This is a sophisticated Next.js application for **live stadium operations and fan support during FIFA World Cup matches**. The platform combines real-time telemetry, AI-powered assistance, and operational dashboards for both staff administrators and matchday fans.

## 🎯 Project Overview

The **FIFA Transit Operations Dashboard** (also called "fifa-transit-app") provides:

**For Staff Administrators:**
- Real-time stadium operations dashboard with spatial heatmaps
- Live telemetry for gates, hubs, and weather advisories
- Fan query management and logging system
- Multi-provider AI assistance (NVIDIA NIM + Gemini)
- Comprehensive monitoring and tactical insights

**For Matchday Fans:**
- Live stadium status updates (nearest gates, wait times, advisories)
- AI-powered fan support assistant for tournament logistics
- Real-time query logging for stadium operations
- Encrypted communication endpoints for security

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB database (Atlas or local)
- API keys for AI providers

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd fifa-transit-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**:
   Create `.env.local` file in the root directory:
   ```bash
   # Database
   MONGODB_URI=your_mongodb_connection_string
   
   # AI Providers (NVIDIA NIM preferred)
   NVIDIA_NIM_API_KEY=your_nvidia_nim_key_here
   GEMINI_API_KEY=your_gemini_key_here
   
   # Optional
   MONGODB_DB=stadium_ops
   MONGODB_TELEMETRY_COLLECTION=telemetry
   MONGODB_LOGS_COLLECTION=query_logs
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🏗️ Architecture Overview

### Dual-Role Design
The application serves two distinct user roles with specialized interfaces:

**Staff Interface** (`/staff`):
- High-density operations dashboard
- Interactive spatial heatmap of stadium gates
- Real-time fan query ticker with filtering
- Tactical insights and analytics
- Live telemetry monitoring

**Fan Interface** (`/fan`):
- Matchday status overview
- AI-powered assistance for tournament logistics
- Real-time stadium updates
- Secure query submission

### Key Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Runtime**: React 19 with TypeScript
- **Styling**: Tailwind CSS with custom theming
- **Database**: MongoDB with custom drivers
- **AI Integration**: NVIDIA NIM + Google Gemini (auto-failover)
- **Streaming**: Server-Sent Events (SSE) for real-time updates
- **State Management**: React hooks with 10-second polling intervals

## 📊 Features

### Staff Operations Dashboard
- **Real-Time Telemetry**: Live updates for gates, transit hubs, and weather
- **Interactive Heatmap**: Visual representation of gate status (Smooth/Advised/Critical)
- **Query Management**: Filterable ticker showing fan queries with timestamps
- **Tactical Intelligence**: Real-time analytics and insights
- **Multi-Provider AI**: Primary NVIDIA NIM with Gemini fallback
- **Cinematic Interface**: Smooth animations and professional dark theme

### Fan Experience
- **Status Overview**: Current gate locations, wait times, weather
- **AI Assistant**: Chat interface for tournament logistics help
- **Secure Logging**: Automatic query submission to operations team
- **Live Updates**: Real-time stadium status synchronization

### Backend Services
- **Telemetry API**: Live stadium operations data
- **Chat API**: Multi-provider AI chat with streaming responses
- **Query Logging**: Fan query tracking and analysis
- **Metrics API**: Staff dashboard operational metrics

## 🎛️ Development Workflow

### Testing
All components follow Test-Driven Development (TDD) patterns:

```bash
# Run all tests
npm test

# Run specific test file
npm test src/components/YourComponent.test.tsx

# Test runner outputs detailed results with coverage information
```

### Component Architecture
The system uses extracted, reusable components:
- `LiveQueryTicker`: Filterable query display component
- `LiveStatusCards`: Real-time telemetry display
- `OperationalInsights`: Staff analytics interface
- `StaffHub`: Complete staff dashboard shell
- `FanHub`: Complete fan interface
- `AICopilotChat`: Staff AI assistant

### State Synchronization
- **10-second polling** for all real-time data
- **Automatic retries** on API failures
- **Timeout protection** for database queries
- **Graceful degradation** when services are unavailable

## 🛠️ Development Conventions

### Code Structure
```
src/
├── app/                           # Next.js app router
│   ├── staff/page.tsx            # Staff dashboard
│   └── fan/page.tsx              # Fan interface
├── components/                   # Reusable UI components
│   ├── StaffHub.tsx              # Staff dashboard shell
│   ├── FanHub.tsx                # Fan interface
│   ├── LiveQueryTicker.tsx       # Extracted ticker component
│   └── AICopilotChat.tsx         # Staff chat interface
├── hooks/                        # Custom React hooks
│   └── useChatStream.ts          # Streaming chat hook
├── lib/                          # Backend services
│   └── db.ts                     # MongoDB integration
├── types/                        # TypeScript definitions
│   └── telemetry.ts              # Shared data types
├── constants/                    # Application constants
│   └── theme.ts                  # Custom styling
└── ...other features
```

### API Patterns
Each API route follows a consistent pattern:
1. **Fetch data** from external sources
2. **Process/transform** the data
3. **Return** as JSON with proper error handling

### Error Handling
All code uses structured error handling with:
- **Try-catch blocks** for async operations
- **Graceful fallbacks** to default data
- **Detailed error logging**
- **User-friendly messages**

## 📖 API Documentation

### Key Endpoints

**Staff APIs**:
- `POST /api/chat`: Multi-provider AI chat with streaming
- `GET /api/staff/metrics`: Staff dashboard metrics
- `GET /api/telemetry`: Live telemetry data

**Fan APIs**:
- `POST /api/fan/queries`: Log fan queries
- `GET /api/telemetry`: Live stadium status

### AI Integration
The system uses a **dual-provider AI strategy**:
- **Primary**: NVIDIA NIM with `meta/llama-3.1-70b-instruct`
- **Fallback**: Google Gemini 2.0 Flash
- **Automatic failover** when primary provider is unavailable

## 🎨 Visual Design

### Theme
- **Color Scheme**: Dark slate (`bg-zinc-950`, `text-slate-100`)
- **Status Colors**: Emerald (success), Amber (warning), Rose (critical)
- **Typography**: Custom fonts with tactical styling
- **Animations**: Smooth transitions and cinematic effects

### Layout
- **Staff Dashboard**: Widescreen grid with multiple data widgets
- **Fan Interface**: Simplified layout optimized for mobile
- **Heatmap**: Interactive SVG with gate status visualization
- **Chat Interface**: Real-time messaging with streaming responses

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Deployment Options
This application is designed for:
- **Vercel**: Default Next.js deployment platform
- **Docker**: Containerized deployment
- **Kubernetes**: Production orchestration

## 🔧 Configuration

### Environment Variables
**Required**:
```bash
MONGODB_URI=your_mongodb_connection_string
NVIDIA_NIM_API_KEY=your_nvidia_key
GEMINI_API_KEY=your_gemini_key
```

**Optional**:
```bash
MONGODB_DB=stadium_ops
MONGODB_TELEMETRY_COLLECTION=telemetry
MONGODB_LOGS_COLLECTION=query_logs
```

### Package Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "jest"
  }
}
```

## 📈 Performance & Scaling

### Real-Time Updates
- **10-second polling** interval for data refresh
- **WebSocket fallback** for critical updates
- **Connection optimization** for low-latency responses

### Database Optimization
- **Connection pooling** with MongoDB
- **Query timeouts** (800ms) to prevent hanging
- **Graceful degradation** when database is unavailable

## 🔒 Security Features

### Authentication
- **API keys** stored in environment variables
- **Encrypted endpoints** for fan interactions
- **Access control** built into route handlers

### Data Protection
- **Input validation** on all API endpoints
- **Error masking** to prevent information leakage
- **Rate limiting** considerations (built into Next.js)

## 🎯 Future Enhancement Ideas

1. **WebSocket Integration**: Replace polling with WebSocket for real-time updates
2. **Advanced Analytics**: Predictive analytics for crowd management
3. **Mobile App**: Native app for staff operations
4. **Multi-language Support**: Internationalization for global matches
5. **Video Integration**: Live camera feeds for gate monitoring
6. **Automated Actions**: Trigger automated responses based on telemetry

## 🆘 Support & Documentation

### Getting Help
- **Stack Overflow**: Tag with `fifa-transit-app`
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Updated in this README file

### Community
This project is designed for collaborative development with:
- **Clear coding conventions**
- **Comprehensive test coverage**
- **Component reusability**
- **Scalable architecture**

## 📝 Notes

This is a production-ready application designed for **FIFA World Cup stadium operations**. The system handles:
- **High-traffic scenarios** during major matches
- **Real-time coordination** between staff and fans
- **Complex data integration** from multiple sources
- **Secure communications** for stadium operations

Built with ❤️ for world-class football tournaments.