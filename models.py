from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    avatar_url = db.Column(db.String(255), default='')
    is_online = db.Column(db.Boolean, default=False)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    sent_messages = db.relationship('Message', foreign_keys='Message.sender_id', backref='sender', lazy='dynamic')
    conversations = db.relationship('ConversationParticipant', backref='user', lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def get_conversations(self):
        return db.session.query(Conversation).join(ConversationParticipant).filter(
            ConversationParticipant.user_id == self.id
        ).order_by(Conversation.updated_at.desc()).all()
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'avatar_url': self.avatar_url,
            'is_online': self.is_online,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None
        }

class Conversation(db.Model):
    __tablename__ = 'conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=True)  # For group chats
    is_group = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    messages = db.relationship('Message', backref='conversation', lazy='dynamic', order_by='Message.created_at')
    participants = db.relationship('ConversationParticipant', backref='conversation', lazy='dynamic')
    
    def get_participants(self):
        return db.session.query(User).join(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == self.id
        ).all()
    
    def get_other_participant(self, current_user_id):
        """For direct conversations, get the other participant"""
        if self.is_group:
            return None
        participants = self.get_participants()
        for participant in participants:
            if participant.id != current_user_id:
                return participant
        return None
    
    def to_dict(self, current_user_id=None):
        if self.is_group:
            display_name = self.name or "Group Chat"
            avatar_url = ""
        else:
            other_participant = self.get_other_participant(current_user_id)
            display_name = other_participant.username if other_participant else "Unknown"
            avatar_url = other_participant.avatar_url if other_participant else ""
        
        return {
            'id': self.id,
            'name': display_name,
            'is_group': self.is_group,
            'avatar_url': avatar_url,
            'updated_at': self.updated_at.isoformat(),
            'participant_count': self.participants.count()
        }

class ConversationParticipant(db.Model):
    __tablename__ = 'conversation_participants'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('conversation_id', 'user_id'),)

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=True)
    message_type = db.Column(db.String(20), default='text')  # text, voice, file
    file_url = db.Column(db.String(255), nullable=True)
    file_name = db.Column(db.String(255), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    edited_at = db.Column(db.DateTime, nullable=True)
    is_deleted = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'sender_id': self.sender_id,
            'sender_username': self.sender.username,
            'sender_avatar': self.sender.avatar_url,
            'content': self.content,
            'message_type': self.message_type,
            'file_url': self.file_url,
            'file_name': self.file_name,
            'file_size': self.file_size,
            'created_at': self.created_at.isoformat(),
            'edited_at': self.edited_at.isoformat() if self.edited_at else None,
            'is_deleted': self.is_deleted
        }
