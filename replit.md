# ChatApp - Real-time Flask Chat Application

## Overview

ChatApp is a real-time messaging application built with Flask, Socket.IO, and PostgreSQL. It provides instant messaging capabilities with support for voice messages, user presence indicators, and conversation management. The application follows a traditional web application architecture with server-side rendering and WebSocket communication for real-time features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Framework**: Flask web framework with Blueprint-based modular architecture
- **Real-time Communication**: Flask-SocketIO for WebSocket connections enabling instant messaging
- **Database**: PostgreSQL with SQLAlchemy ORM for data persistence
- **Authentication**: Flask-Login for session management with password hashing via Werkzeug
- **File Handling**: Built-in file upload system for voice messages and avatars

### Frontend Architecture
- **Template Engine**: Jinja2 templates with server-side rendering
- **UI Framework**: Bootstrap 5 with dark theme for responsive design
- **Real-time Client**: Socket.IO client for WebSocket communication
- **Media Recording**: Web Audio API for voice message recording
- **Interactive Elements**: Vanilla JavaScript for chat functionality

### Data Storage Strategy
- **Primary Database**: PostgreSQL for user accounts, conversations, and messages
- **File Storage**: Local filesystem storage for uploaded voice messages and user avatars
- **Session Management**: Server-side sessions with configurable secret key

## Key Components

### Authentication System
- User registration and login with username/email/password
- Password hashing using Werkzeug's security utilities
- Session-based authentication via Flask-Login
- User presence tracking (online/offline status)

### Messaging Infrastructure
- Real-time message delivery through WebSocket connections
- Support for text messages and voice message attachments
- Conversation management for both direct messages and group chats
- Message history with pagination support

### User Management
- User profiles with avatar/thumbnail upload and management
- Real-time avatar updates across all chat interfaces
- Online status indicators and last seen timestamps
- User search functionality for finding chat partners
- Profile management page with photo upload/removal functionality

### File Upload System
- Voice message recording and upload (supports mp3, wav, ogg, m4a, webm)
- Avatar/thumbnail image uploads for user profiles (supports png, jpg, jpeg, gif, webp)
- File size limitations (16MB for voice, 5MB for images)
- Secure filename handling with unique identifiers
- Automatic old avatar cleanup when updating profile photos

## Data Flow

### Message Sending Process
1. User types message in chat interface
2. Client sends message via Socket.IO to Flask server
3. Server validates user permissions and saves message to database
4. Server broadcasts message to all conversation participants
5. Clients receive and display message in real-time

### User Authentication Flow
1. User submits login credentials via HTML form
2. Server validates credentials against database
3. Flask-Login creates authenticated session
4. User redirected to chat interface
5. Socket.IO connection established for real-time features

### Voice Message Workflow
1. User initiates recording via web interface
2. Browser captures audio using MediaRecorder API
3. Audio file uploaded to server via HTTP POST
4. Server saves file and creates message record
5. Message with audio attachment broadcast to participants

## External Dependencies

### Core Framework Dependencies
- Flask: Web application framework
- Flask-SQLAlchemy: Database ORM integration
- Flask-Login: User session management
- Flask-SocketIO: WebSocket communication
- Werkzeug: WSGI utilities and security functions

### Frontend Libraries
- Bootstrap 5: UI framework with dark theme
- Font Awesome: Icon library for interface elements
- Socket.IO Client: Real-time communication client library

### Database Requirements
- PostgreSQL: Primary database system
- Connection pooling with automatic reconnection
- Environment-based configuration for database URLs

## Deployment Strategy

### Environment Configuration
- Environment variables for sensitive configuration (database URL, secret keys)
- Railway platform optimization with ProxyFix middleware
- Development and production environment separation

### Application Structure
- Modular blueprint architecture for maintainable code organization
- Separate modules for authentication, main routes, and database models
- Static file serving for CSS, JavaScript, and uploaded content

### Runtime Requirements
- Python 3.11 runtime environment
- WSGI server compatibility for production deployment
- File system access for upload directory management

### Security Considerations
- CSRF protection through Flask's built-in mechanisms
- Secure password hashing with salt
- File upload validation and size restrictions
- Proxy headers handling for deployment behind reverse proxies