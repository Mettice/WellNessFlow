# AI-Powered Spa Chatbot

A white-label, AI-powered chatbot that helps spas automate bookings, answer FAQs, and improve client engagement through intelligent conversations and document-based training.

## Features

- **Intelligent Chat**
  - OpenAI GPT-4 powered conversations
  - Multi-language support
  - Context-aware responses
  - Smart service recommendations

- **Booking & Management**
  - 24/7 Automated booking assistance
  - Calendar integration
  - Appointment management
  - SMS/Email notifications

- **Custom Training**
  - Document-based training (PDF, DOCX, TXT)
  - Service-specific responses
  - Brand voice customization
  - FAQ automation

- **Analytics Dashboard**
  - Conversation metrics
  - Booking conversion rates
  - Popular services tracking
  - Peak hours analysis

- **White-Label Solution**
  - Customizable widget
  - Brand color matching
  - Multi-language support
  - Flexible deployment options

## Tech Stack

### Frontend
- React.js with TypeScript
- Tailwind CSS for styling
- JWT authentication
- Real-time updates
- Responsive design

### Backend
- Python Flask
- SQLite/PostgreSQL
- OpenAI API integration
- JWT authentication
- Document processing
- LangChain for RAG

## Deployment

### Development
1. Local development with SQLite
2. Document processing on local machine
3. OpenAI API integration
4. Easy setup for testing

### Production
Current recommended deployment:

1. **Backend**: Railway.app or Render.com
   - Automatic HTTPS
   - Built-in PostgreSQL
   - Easy scaling
   - CI/CD integration
   - Reasonable pricing

2. **Frontend**: Vercel
   - Global CDN
   - Automatic deployments
   - Free tier available
   - Great performance
   - Easy configuration

3. **Future Scaling**:
   - Ready for AWS migration when needed
   - Containerized for easy transfer
   - Database export/import support
   - Scalable architecture

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Python 3.8+
- npm or yarn
- OpenAI API key

### Environment Variables
Create a `.env` file in the backend directory:

```env
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET_KEY=your_jwt_secret
DATABASE_URL=sqlite:///instance/spa.db  # or your PostgreSQL URL
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/spa-chatbot.git
cd spa-chatbot
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Running Locally

1. Start the frontend development server:
```bash
cd frontend
npm start
```

2. Start the backend server:
```bash
cd backend
flask run
```

The application will be available at http://localhost:3000

### Deployment Steps

1. **Backend (Railway/Render)**:
   - Connect your GitHub repository
   - Set environment variables
   - Choose deployment region
   - Configure PostgreSQL

2. **Frontend (Vercel)**:
   - Import from GitHub
   - Configure build settings
   - Set environment variables
   - Deploy

## Documentation

Detailed documentation is available in the `/docs` directory:
- API Documentation
- Widget Integration Guide
- Document Training Guide
- Deployment Guide

## License

MIT License 