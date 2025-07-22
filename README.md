# ChatApp - Real-time Flask Chat Application

A Telegram-like chat application built with Flask, Socket.IO, and PostgreSQL featuring real-time messaging, voice messages, user thumbnails, and search functionality.

## Features

- 🚀 **Real-time Messaging** - Instant message delivery with WebSocket connections
- 🎤 **Voice Messages** - Record and send voice notes (mp3, wav, ogg, m4a, webm)
- 🔍 **Smart Search** - Search for users and messages across conversations
- 👤 **User Profiles** - Upload and manage profile thumbnails/avatars
- 📱 **Responsive Design** - Mobile-friendly interface with Bootstrap dark theme
- 🔐 **User Authentication** - Secure login and registration system
- 💬 **Group & Direct Chats** - Support for both private and group conversations
- ⚡ **Typing Indicators** - See when someone is typing
- 🌐 **Online Status** - Real-time user presence indicators

## Technologies Used

- **Backend**: Flask, Flask-SocketIO, SQLAlchemy
- **Database**: PostgreSQL
- **Frontend**: Bootstrap 5, Vanilla JavaScript, Socket.IO client
- **Real-time**: WebSocket connections via Socket.IO
- **File Upload**: Support for voice messages and profile images
- **Authentication**: Flask-Login with password hashing

## Quick Start

### Railway Deployment (Recommended)

1. Fork this repository to your GitHub account
2. Connect your GitHub repo to Railway
3. Add the following environment variables in Railway:
   ```
   DATABASE_URL=postgresql://...  (Auto-provided by Railway)
   SESSION_SECRET=your-super-secret-session-key-here
   PORT=5000
   ```
4. Deploy! Railway will automatically handle the build process.

### Local Development

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd chatapp
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and session secret
   ```

4. Set up PostgreSQL database and update DATABASE_URL in .env

5. Run the application:
   ```bash
   python main.py
   ```

6. Visit `http://localhost:5000` in your browser

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Secret key for session management | Yes |
| `PORT` | Port number (default: 5000) | No |
| `FLASK_ENV` | Environment (production/development) | No |

## File Structure

```
chatapp/
├── app.py              # Flask application factory
├── main.py             # Application entry point
├── models.py           # Database models
├── routes.py           # Main application routes
├── auth.py             # Authentication routes
├── templates/          # Jinja2 templates
│   ├── base.html
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── chat.html
│   └── profile.html
├── static/            # Static assets
│   ├── css/style.css
│   ├── js/chat.js
│   └── uploads/       # User uploaded files
├── Procfile           # Railway deployment config
├── railway.json       # Railway settings
└── pyproject.toml     # Python dependencies
```

## Usage

1. **Registration**: Create a new account with username, email, and password
2. **Profile Setup**: Upload a profile thumbnail via the Profile page
3. **Start Chatting**: Search for users and start new conversations
4. **Voice Messages**: Click the microphone button to record voice notes
5. **Search**: Use the search bar to find users or search through message history

## API Endpoints

- `GET /` - Landing page
- `GET /chat` - Main chat interface
- `GET /profile` - User profile management
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /api/upload-avatar` - Upload profile picture
- `POST /api/upload-voice` - Upload voice message
- `GET /api/search` - Search users and messages

## WebSocket Events

- `connect/disconnect` - User presence management
- `join_conversation` - Join a chat room
- `send_message` - Send text/voice messages
- `typing` - Typing indicators
- `user_status` - Online/offline status updates

## Deployment Notes

### Railway
- Uses `Procfile` for deployment configuration
- Automatically provisions PostgreSQL database
- Handles environment variables securely
- Supports custom domains

### Environment Setup
- Ensure `SESSION_SECRET` is a long, random string in production
- Database tables are created automatically on first run
- File uploads are stored in `/static/uploads/` directory

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues and questions, please open an issue on GitHub or contact the development team.