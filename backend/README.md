# SignVerse Backend API

A production-ready FastAPI backend application for SignVerse.

## Features

- FastAPI with async/await support
- SQLAlchemy with async support
- JWT authentication
- Pydantic for data validation
- CORS middleware
- Structured logging
- Environment-based configuration
- Health check endpoints

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       ├── dependencies/
│   │       └── api.py
│   ├── core/
│   │   ├── config.py
│   │   └── security.py
│   ├── db/
│   │   └── database.py
│   ├── models/
│   │   └── user.py
│   ├── schemas/
│   │   └── auth.py
│   ├── services/
│   │   └── auth_service.py
│   ├── utils/
│   │   └── logger.py
│   └── main.py
├── tests/
├── static/
├── templates/
├── requirements.txt
├── env.example
└── run.py
```

## Setup

1. Create and activate virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy environment file and configure:
```bash
cp env.example .env
# Edit .env with your configuration
```

4. Run the application:
```bash
python run.py
```

The API will be available at `http://localhost:5001`

## API Documentation

- Swagger UI: `http://localhost:5001/docs`
- ReDoc: `http://localhost:5001/redoc`

## Environment Variables

See `env.example` for all available configuration options.

## Development

- The application uses async/await throughout
- Database operations are async
- JWT tokens for authentication
- Structured logging with configurable levels
- CORS enabled for frontend integration
