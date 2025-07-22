import os
import uuid
from datetime import datetime
from flask import Blueprint, render_template, request, jsonify, redirect, url_for, current_app, send_from_directory
from flask_login import login_required, current_user
from flask_socketio import emit, join_room, leave_room
from werkzeug.utils import secure_filename
from sqlalchemy import or_, and_
from app import db, socketio
from models import User, Conversation, ConversationParticipant, Message

main_bp = Blueprint('main', __name__)

ALLOWED_VOICE_EXTENSIONS = {'mp3', 'wav', 'ogg', 'm4a', 'webm'}
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_voice_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_VOICE_EXTENSIONS

def allowed_image_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

@main_bp.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main.chat'))
    return render_template('index.html')

@main_bp.route('/chat')
@login_required
def chat():
    conversations = current_user.get_conversations()
    users = User.query.filter(User.id != current_user.id).all()
    return render_template('chat.html', conversations=conversations, users=users)

@main_bp.route('/api/conversations')
@login_required
def get_conversations():
    conversations = current_user.get_conversations()
    return jsonify([conv.to_dict(current_user.id) for conv in conversations])

@main_bp.route('/api/conversations/<int:conversation_id>/messages')
@login_required
def get_messages(conversation_id):
    # Verify user is participant in conversation
    participant = ConversationParticipant.query.filter_by(
        conversation_id=conversation_id,
        user_id=current_user.id
    ).first()
    
    if not participant:
        return jsonify({'error': 'Unauthorized'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = 50
    
    messages = Message.query.filter_by(
        conversation_id=conversation_id,
        is_deleted=False
    ).order_by(Message.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'messages': [msg.to_dict() for msg in reversed(messages.items)],
        'has_more': messages.has_next,
        'page': page
    })

@main_bp.route('/api/conversations', methods=['POST'])
@login_required
def create_conversation():
    data = request.get_json()
    participant_ids = data.get('participant_ids', [])
    is_group = data.get('is_group', False)
    name = data.get('name', '')
    
    if not participant_ids:
        return jsonify({'error': 'At least one participant is required'}), 400
    
    # For direct conversations, check if one already exists
    if not is_group and len(participant_ids) == 1:
        existing_conv = db.session.query(Conversation).join(ConversationParticipant).filter(
            Conversation.is_group == False,
            ConversationParticipant.user_id.in_([current_user.id, participant_ids[0]])
        ).group_by(Conversation.id).having(
            db.func.count(ConversationParticipant.user_id) == 2
        ).first()
        
        if existing_conv:
            return jsonify(existing_conv.to_dict(current_user.id))
    
    # Create new conversation
    conversation = Conversation(
        name=name if is_group else None,
        is_group=is_group
    )
    db.session.add(conversation)
    db.session.flush()
    
    # Add current user as participant
    participant = ConversationParticipant(
        conversation_id=conversation.id,
        user_id=current_user.id
    )
    db.session.add(participant)
    
    # Add other participants
    for user_id in participant_ids:
        if user_id != current_user.id:
            participant = ConversationParticipant(
                conversation_id=conversation.id,
                user_id=user_id
            )
            db.session.add(participant)
    
    db.session.commit()
    return jsonify(conversation.to_dict(current_user.id))

@main_bp.route('/api/search')
@login_required
def search():
    query = request.args.get('q', '').strip()
    search_type = request.args.get('type', 'all')  # all, users, messages
    
    if not query:
        return jsonify({'users': [], 'messages': []})
    
    results = {'users': [], 'messages': []}
    
    if search_type in ['all', 'users']:
        users = User.query.filter(
            and_(
                User.id != current_user.id,
                or_(
                    User.username.ilike(f'%{query}%'),
                    User.email.ilike(f'%{query}%')
                )
            )
        ).limit(10).all()
        results['users'] = [user.to_dict() for user in users]
    
    if search_type in ['all', 'messages']:
        # Search in user's conversations
        user_conversation_ids = db.session.query(ConversationParticipant.conversation_id).filter_by(
            user_id=current_user.id
        ).subquery()
        
        messages = Message.query.filter(
            and_(
                Message.conversation_id.in_(user_conversation_ids),
                Message.content.ilike(f'%{query}%'),
                Message.is_deleted == False
            )
        ).order_by(Message.created_at.desc()).limit(20).all()
        
        results['messages'] = [msg.to_dict() for msg in messages]
    
    return jsonify(results)

@main_bp.route('/api/upload-voice', methods=['POST'])
@login_required
def upload_voice():
    if 'voice' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['voice']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_voice_file(file.filename):
        # Generate unique filename
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
        
        file.save(file_path)
        file_size = os.path.getsize(file_path)
        
        return jsonify({
            'filename': unique_filename,
            'original_name': filename,
            'size': file_size,
            'url': url_for('main.uploaded_file', filename=unique_filename)
        })
    
    return jsonify({'error': 'Invalid file type'}), 400

@main_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

@main_bp.route('/profile')
@login_required
def profile():
    return render_template('profile.html')

@main_bp.route('/api/upload-avatar', methods=['POST'])
@login_required
def upload_avatar():
    if 'avatar' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['avatar']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_image_file(file.filename):
        # Remove old avatar if exists
        if current_user.avatar_url:
            old_filename = current_user.avatar_url.split('/')[-1]
            old_path = os.path.join(current_app.config['UPLOAD_FOLDER'], old_filename)
            if os.path.exists(old_path):
                os.remove(old_path)
        
        # Generate unique filename
        filename = secure_filename(file.filename)
        unique_filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}.{filename.rsplit('.', 1)[1].lower()}"
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
        
        file.save(file_path)
        
        # Update user's avatar URL
        current_user.avatar_url = url_for('main.uploaded_file', filename=unique_filename)
        db.session.commit()
        
        return jsonify({
            'avatar_url': current_user.avatar_url,
            'message': 'Avatar updated successfully'
        })
    
    return jsonify({'error': 'Invalid file type. Please upload PNG, JPG, JPEG, GIF, or WEBP files'}), 400

@main_bp.route('/api/remove-avatar', methods=['POST'])
@login_required
def remove_avatar():
    if current_user.avatar_url:
        # Remove file from disk
        filename = current_user.avatar_url.split('/')[-1]
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Clear avatar URL from database
        current_user.avatar_url = ''
        db.session.commit()
        
        return jsonify({'message': 'Avatar removed successfully'})
    
    return jsonify({'error': 'No avatar to remove'}), 400

# Socket.IO events
@socketio.on('connect')
@login_required
def handle_connect():
    current_user.is_online = True
    current_user.last_seen = datetime.utcnow()
    db.session.commit()
    
    # Join user to their conversation rooms
    conversations = current_user.get_conversations()
    for conv in conversations:
        join_room(f'conversation_{conv.id}')
    
    emit('user_status', {
        'user_id': current_user.id,
        'is_online': True
    }, broadcast=True)

@socketio.on('disconnect')
@login_required
def handle_disconnect():
    current_user.is_online = False
    current_user.last_seen = datetime.utcnow()
    db.session.commit()
    
    emit('user_status', {
        'user_id': current_user.id,
        'is_online': False,
        'last_seen': current_user.last_seen.isoformat()
    }, broadcast=True)

@socketio.on('join_conversation')
@login_required
def handle_join_conversation(data):
    conversation_id = data['conversation_id']
    
    # Verify user is participant
    participant = ConversationParticipant.query.filter_by(
        conversation_id=conversation_id,
        user_id=current_user.id
    ).first()
    
    if participant:
        join_room(f'conversation_{conversation_id}')
        emit('joined_conversation', {'conversation_id': conversation_id})

@socketio.on('leave_conversation')
@login_required
def handle_leave_conversation(data):
    conversation_id = data['conversation_id']
    leave_room(f'conversation_{conversation_id}')

@socketio.on('send_message')
@login_required
def handle_send_message(data):
    conversation_id = data['conversation_id']
    content = data.get('content', '').strip()
    message_type = data.get('message_type', 'text')
    file_data = data.get('file_data', {})
    
    # Verify user is participant
    participant = ConversationParticipant.query.filter_by(
        conversation_id=conversation_id,
        user_id=current_user.id
    ).first()
    
    if not participant:
        emit('error', {'message': 'Unauthorized'})
        return
    
    if not content and message_type == 'text':
        emit('error', {'message': 'Message content is required'})
        return
    
    # Create message
    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=content,
        message_type=message_type,
        file_url=file_data.get('url'),
        file_name=file_data.get('name'),
        file_size=file_data.get('size')
    )
    
    db.session.add(message)
    
    # Update conversation timestamp
    conversation = Conversation.query.get(conversation_id)
    conversation.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    # Emit to all participants in the conversation
    socketio.emit('new_message', message.to_dict(), room=f'conversation_{conversation_id}')

@socketio.on('typing')
@login_required
def handle_typing(data):
    conversation_id = data['conversation_id']
    is_typing = data.get('is_typing', False)
    
    # Verify user is participant
    participant = ConversationParticipant.query.filter_by(
        conversation_id=conversation_id,
        user_id=current_user.id
    ).first()
    
    if participant:
        emit('user_typing', {
            'user_id': current_user.id,
            'username': current_user.username,
            'conversation_id': conversation_id,
            'is_typing': is_typing
        }, room=f'conversation_{conversation_id}', include_self=False)
