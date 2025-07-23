# ChatApp Deployment Guide

## Files Included in Package

Your deployment package contains all the necessary files for deploying the ChatApp to GitHub and Railway:

### Core Application Files
- `app.py` - Flask application factory with Socket.IO configuration
- `main.py` - Application entry point optimized for Railway
- `models.py` - Database models for users, conversations, and messages
- `routes.py` - Main application routes including thumbnail upload
- `auth.py` - Authentication routes (login/register)

### Templates & Static Files
- `templates/` - All HTML templates (base, index, login, register, chat, profile)
- `static/css/style.css` - Custom styles with thumbnail and avatar support
- `static/js/chat.js` - Real-time chat functionality
- `static/uploads/` - Directory for uploaded files (voice messages and avatars)

### Configuration Files
- `Procfile` - Railway deployment configuration
- `railway.json` - Railway settings and build configuration
- `pyproject.toml` - Python dependencies
- `runtime.txt` - Python runtime version
- `.env.example` - Environment variables template
- `README.md` - Comprehensive documentation

## Step-by-Step Deployment

### 1. GitHub Setup

1. **Create a new repository on GitHub**
   - Go to https://github.com/new
   - Name it `chatapp` or your preferred name
   - Set it to public or private
   - Don't initialize with README (we have one included)

2. **Upload your files**
   - Extract the `chatapp-deployment.tar.gz` file
   - Upload all files to your GitHub repository
   - Commit and push to main branch

### 2. Railway Deployment

1. **Sign up for Railway**
   - Go to https://railway.app
   - Sign up with GitHub account

2. **Create new project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your chatapp repository

3. **Configure environment variables**
   Railway will automatically provision a PostgreSQL database. You only need to add:
   ```
   SESSION_SECRET=your-super-long-random-secret-key-here-make-it-very-secure
   ```
   
   To generate a secure session secret, you can use:
   ```python
   import secrets
   print(secrets.token_urlsafe(32))
   ```

4. **Deploy**
   - Railway will automatically detect the Procfile and start building
   - The build process will install dependencies and start the application
   - Your app will be available at a `.up.railway.app` URL

### 3. Environment Variables Reference

| Variable | Description | Required | Auto-provided by Railway |
|----------|-------------|----------|--------------------------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | ✅ Yes |
| `SESSION_SECRET` | Session encryption key | Yes | ❌ You must set |
| `PORT` | Application port | No | ✅ Yes |
| `PGHOST` | Database host | No | ✅ Yes |
| `PGPORT` | Database port | No | ✅ Yes |
| `PGUSER` | Database username | No | ✅ Yes |
| `PGPASSWORD` | Database password | No | ✅ Yes |
| `PGDATABASE` | Database name | No | ✅ Yes |

### 4. Post-Deployment

1. **Test the application**
   - Visit your Railway app URL
   - Register a new account
   - Test uploading a profile thumbnail
   - Try sending messages and voice notes

2. **Optional: Custom Domain**
   - In Railway dashboard, go to Settings
   - Add your custom domain
   - Configure DNS records as instructed

## Features Included

✅ **Real-time Chat** - WebSocket-based messaging
✅ **User Thumbnails** - Upload and manage profile photos
✅ **Voice Messages** - Record and send audio files
✅ **Search Functionality** - Find users and search messages
✅ **Responsive Design** - Works on mobile and desktop
✅ **User Authentication** - Secure login and registration
✅ **Online Status** - Real-time presence indicators
✅ **Typing Indicators** - See when someone is typing

## File Upload Limits

- **Profile Images**: 5MB max (PNG, JPG, JPEG, GIF, WEBP)
- **Voice Messages**: 16MB max (MP3, WAV, OGG, M4A, WEBM)

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Ensure `SESSION_SECRET` is set in Railway
   - Should be a long, random string

2. **Database Connection Issues**
   - Railway auto-provisions PostgreSQL
   - Check that DATABASE_URL is set correctly

3. **File Upload Issues**
   - Ensure upload directory permissions are correct
   - Railway handles file storage automatically

4. **WebSocket Connection Problems**
   - The app uses eventlet for better WebSocket support
   - Procfile is configured with correct worker class

### Performance Optimization

- **Single Worker**: Configuration uses 1 worker for WebSocket compatibility
- **Eventlet**: Async worker class for better real-time performance
- **Database Pooling**: Connection pooling enabled for PostgreSQL

## Support

If you encounter issues:

1. Check Railway deployment logs
2. Verify all environment variables are set
3. Ensure your repository has all required files
4. Check that dependencies are correctly specified in pyproject.toml

## Security Notes

- Always use a strong `SESSION_SECRET` in production
- Railway provides HTTPS by default
- File uploads are validated and sanitized
- Password hashing uses Werkzeug security utilities
- CSRF protection enabled through Flask

## Scaling

For production use with high traffic:
- Consider upgrading Railway plan for more resources
- Implement Redis for session storage
- Use CDN for static file delivery
- Enable database connection pooling

Your ChatApp is now ready for production deployment on Railway! 🚀