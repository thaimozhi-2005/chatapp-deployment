// ChatApp JavaScript functionality
class ChatApp {
    constructor() {
        this.socket = null;
        this.currentConversationId = null;
        this.currentUserId = window.currentUserId;
        this.mediaRecorder = null;
        this.recordingChunks = [];
        this.recordingStartTime = null;
        this.typingTimeout = null;
        this.isTyping = false;
        
        this.init();
    }
    
    init() {
        this.initSocket();
        this.bindEvents();
        this.loadEmojis();
    }
    
    initSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
        
        this.socket.on('new_message', (message) => {
            this.handleNewMessage(message);
        });
        
        this.socket.on('user_typing', (data) => {
            this.handleUserTyping(data);
        });
        
        this.socket.on('user_status', (data) => {
            this.handleUserStatus(data);
        });
        
        this.socket.on('error', (data) => {
            this.showAlert('Error: ' + data.message, 'danger');
        });
    }
    
    bindEvents() {
        // Message form submission
        document.getElementById('messageForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        // Message input typing
        document.getElementById('messageInput').addEventListener('input', () => {
            this.handleTyping();
        });
        
        // New chat button
        document.getElementById('newChatBtn').addEventListener('click', () => {
            this.showNewChatModal();
        });
        
        // Search functionality
        let searchTimeout;
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });
        
        // Conversation selection
        document.addEventListener('click', (e) => {
            const conversationItem = e.target.closest('.conversation-item');
            if (conversationItem) {
                const conversationId = conversationItem.dataset.conversationId;
                this.selectConversation(conversationId);
            }
        });
        
        // User selection for new chat
        document.addEventListener('click', (e) => {
            const userItem = e.target.closest('.user-item');
            if (userItem) {
                const userId = userItem.dataset.userId;
                this.startNewChat(userId);
            }
        });
        
        // Voice recording
        document.getElementById('voiceBtn').addEventListener('click', () => {
            this.toggleVoiceRecording();
        });
        
        document.getElementById('stopRecording').addEventListener('click', () => {
            this.stopRecording();
        });
        
        document.getElementById('cancelRecording').addEventListener('click', () => {
            this.cancelRecording();
        });
        
        // Mobile responsive
        document.getElementById('backToSidebar')?.addEventListener('click', () => {
            this.showSidebar();
        });
        
        // Emoji button
        document.getElementById('emojiBtn').addEventListener('click', () => {
            this.toggleEmojiPicker();
        });
    }
    
    selectConversation(conversationId) {
        if (this.currentConversationId) {
            this.socket.emit('leave_conversation', {
                conversation_id: this.currentConversationId
            });
        }
        
        this.currentConversationId = conversationId;
        
        // Update UI
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const selectedItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
        
        // Show chat area
        document.getElementById('emptyState').classList.add('d-none');
        document.getElementById('chatArea').classList.remove('d-none');
        document.getElementById('chatArea').classList.add('d-flex');
        
        // Join conversation room
        this.socket.emit('join_conversation', {
            conversation_id: conversationId
        });
        
        // Load messages
        this.loadMessages(conversationId);
        
        // Update chat header
        this.updateChatHeader(conversationId);
        
        // Hide sidebar on mobile
        if (window.innerWidth < 768) {
            document.getElementById('sidebar').classList.remove('show');
        }
    }
    
    async loadMessages(conversationId) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}/messages`);
            const data = await response.json();
            
            if (response.ok) {
                this.displayMessages(data.messages);
            } else {
                this.showAlert('Failed to load messages', 'danger');
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            this.showAlert('Error loading messages', 'danger');
        }
    }
    
    displayMessages(messages) {
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = '';
        
        messages.forEach(message => {
            this.appendMessage(message);
        });
        
        this.scrollToBottom();
    }
    
    appendMessage(message) {
        const messagesList = document.getElementById('messagesList');
        const messageElement = this.createMessageElement(message);
        messagesList.appendChild(messageElement);
    }
    
    createMessageElement(message) {
        const isOwn = message.sender_id === this.currentUserId;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'own' : ''}`;
        
        let content = '';
        if (message.message_type === 'voice') {
            content = this.createVoiceMessageHTML(message);
        } else {
            content = this.formatMessageContent(message.content);
        }
        
        const time = new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageDiv.innerHTML = `
            <div class="message-bubble">
                ${content}
            </div>
            <div class="message-info">
                ${!isOwn ? `<strong>${message.sender_username}</strong> ` : ''}
                <span class="message-timestamp">${time}</span>
            </div>
        `;
        
        return messageDiv;
    }
    
    createVoiceMessageHTML(message) {
        return `
            <div class="voice-message">
                <button class="voice-play-btn" onclick="chatApp.playVoiceMessage('${message.file_url}')">
                    <i class="fas fa-play"></i>
                </button>
                <div class="voice-waveform"></div>
                <span class="voice-duration">${this.formatFileSize(message.file_size)}</span>
            </div>
        `;
    }
    
    formatMessageContent(content) {
        if (!content) return '';
        
        // Simple emoji support and line break handling
        return content
            .replace(/\n/g, '<br>')
            .replace(/:\)/g, '😊')
            .replace(/:\(/g, '😢')
            .replace(/:D/g, '😃')
            .replace(/;\)/g, '😉')
            .replace(/:P/g, '😛')
            .replace(/<3/g, '❤️');
    }
    
    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();
        
        if (!content || !this.currentConversationId) {
            return;
        }
        
        this.socket.emit('send_message', {
            conversation_id: this.currentConversationId,
            content: content,
            message_type: 'text'
        });
        
        messageInput.value = '';
        this.stopTyping();
    }
    
    handleNewMessage(message) {
        if (message.conversation_id === this.currentConversationId) {
            this.appendMessage(message);
            this.scrollToBottom();
        }
        
<<<<<<< HEAD
        // Update conversation list preview
        this.updateConversationPreview(message.conversation_id, message.content, message.message_type);
    }
    
    updateConversationPreview(conversationId, content, messageType) {
        const previewElement = document.querySelector(`.conversation-preview[data-conversation-id="${conversationId}"]`);
        if (previewElement) {
            if (messageType === 'voice') {
                previewElement.textContent = '🎤 Voice message';
            } else {
                const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
                previewElement.textContent = preview;
            }
        }
=======
        // Update conversation list timestamp
        this.updateConversationTimestamp(message.conversation_id);
>>>>>>> origin/main
    }
    
    handleTyping() {
        if (!this.currentConversationId) return;
        
        if (!this.isTyping) {
            this.isTyping = true;
            this.socket.emit('typing', {
                conversation_id: this.currentConversationId,
                is_typing: true
            });
        }
        
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 2000);
    }
    
    stopTyping() {
        if (this.isTyping && this.currentConversationId) {
            this.isTyping = false;
            this.socket.emit('typing', {
                conversation_id: this.currentConversationId,
                is_typing: false
            });
        }
        clearTimeout(this.typingTimeout);
    }
    
    handleUserTyping(data) {
        if (data.conversation_id === this.currentConversationId && data.user_id !== this.currentUserId) {
            const typingIndicator = document.getElementById('typingIndicator');
            const typingText = document.getElementById('typingText');
            
            if (data.is_typing) {
                typingText.textContent = `${data.username} is typing...`;
                typingIndicator.style.display = 'block';
            } else {
                typingIndicator.style.display = 'none';
            }
        }
    }
    
    handleUserStatus(data) {
        // Update user online status in UI
        console.log('User status update:', data);
    }
    
    async performSearch(query) {
        if (!query.trim()) {
            document.getElementById('searchModal').querySelector('.modal-body').innerHTML = '';
            return;
        }
        
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (response.ok) {
                this.displaySearchResults(data);
                new bootstrap.Modal(document.getElementById('searchModal')).show();
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }
    
    displaySearchResults(results) {
        const resultsContainer = document.getElementById('searchResults');
        let html = '';
        
        if (results.users && results.users.length > 0) {
            html += '<div class="search-section"><h6>Users</h6>';
            results.users.forEach(user => {
                html += `
                    <div class="list-group-item list-group-item-action user-item" data-user-id="${user.id}">
                        <div class="d-flex align-items-center">
                            <div class="flex-shrink-0 me-3">
                                ${user.avatar_url ? 
                                    `<img src="${user.avatar_url}" alt="Avatar" class="rounded-circle" width="32" height="32">` :
                                    `<div class="bg-secondary rounded-circle d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
                                        <i class="fas fa-user text-white" style="font-size: 14px;"></i>
                                    </div>`
                                }
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="mb-0">${user.username}</h6>
                                <p class="mb-0 text-muted small">${user.is_online ? 'Online' : 'Offline'}</p>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        if (results.messages && results.messages.length > 0) {
            html += '<div class="search-section"><h6>Messages</h6>';
            results.messages.forEach(message => {
                const time = new Date(message.created_at).toLocaleString();
                html += `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between">
                            <strong>${message.sender_username}</strong>
                            <small class="text-muted">${time}</small>
                        </div>
                        <p class="mb-0">${this.highlightSearchTerm(message.content, document.getElementById('searchInput').value)}</p>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        if (!html) {
            html = '<div class="text-center text-muted py-4">No results found</div>';
        }
        
        resultsContainer.innerHTML = html;
    }
    
    highlightSearchTerm(text, term) {
        if (!term || !text) return text;
        const regex = new RegExp(`(${term})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    showNewChatModal() {
        new bootstrap.Modal(document.getElementById('newChatModal')).show();
    }
    
    async startNewChat(userId) {
        try {
            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    participant_ids: [parseInt(userId)],
                    is_group: false
                })
            });
            
            const conversation = await response.json();
            
            if (response.ok) {
                bootstrap.Modal.getInstance(document.getElementById('newChatModal')).hide();
                this.selectConversation(conversation.id);
                // Refresh conversations list
                location.reload();
            } else {
                this.showAlert('Failed to create conversation', 'danger');
            }
        } catch (error) {
            console.error('Error creating conversation:', error);
            this.showAlert('Error creating conversation', 'danger');
        }
    }
    
    async toggleVoiceRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.stopRecording();
            return;
        }
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.recordingChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.recordingChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = () => {
                this.processRecording();
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start();
            this.startRecordingUI();
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.showAlert('Could not access microphone', 'danger');
        }
    }
    
    startRecordingUI() {
        document.getElementById('voiceRecording').style.display = 'block';
        document.getElementById('voiceBtn').innerHTML = '<i class="fas fa-stop"></i>';
        this.recordingStartTime = Date.now();
        this.updateRecordingTime();
    }
    
    updateRecordingTime() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('recordingTime').textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            setTimeout(() => this.updateRecordingTime(), 1000);
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        this.endRecordingUI();
    }
    
    cancelRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        this.recordingChunks = [];
        this.endRecordingUI();
    }
    
    endRecordingUI() {
        document.getElementById('voiceRecording').style.display = 'none';
        document.getElementById('voiceBtn').innerHTML = '<i class="fas fa-microphone"></i>';
    }
    
    async processRecording() {
        if (this.recordingChunks.length === 0) return;
        
        const blob = new Blob(this.recordingChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('voice', blob, 'voice_message.webm');
        
        try {
            const response = await fetch('/api/upload-voice', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.socket.emit('send_message', {
                    conversation_id: this.currentConversationId,
                    content: '',
                    message_type: 'voice',
                    file_data: {
                        url: data.url,
                        name: data.original_name,
                        size: data.size
                    }
                });
            } else {
                this.showAlert('Failed to upload voice message', 'danger');
            }
        } catch (error) {
            console.error('Error uploading voice message:', error);
            this.showAlert('Error uploading voice message', 'danger');
        }
    }
    
    async playVoiceMessage(url) {
        try {
            const audio = new Audio(url);
            await audio.play();
        } catch (error) {
            console.error('Error playing voice message:', error);
            this.showAlert('Error playing voice message', 'danger');
        }
    }
    
    loadEmojis() {
        // Simple emoji support - could be expanded with a proper emoji picker
        this.emojis = ['😊', '😢', '😃', '😉', '😛', '❤️', '👍', '👎', '🎉', '🔥'];
    }
    
    toggleEmojiPicker() {
        const messageInput = document.getElementById('messageInput');
        // Simple emoji insertion - could be enhanced with a proper picker UI
        const emoji = this.emojis[Math.floor(Math.random() * this.emojis.length)];
        messageInput.value += emoji;
        messageInput.focus();
    }
    
    updateChatHeader(conversationId) {
        // This would typically fetch conversation details and update the header
        // For now, we'll use the existing conversation data
        const conversationItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (conversationItem) {
            const title = conversationItem.querySelector('h6').textContent;
            document.getElementById('chatTitle').textContent = title;
        }
    }
    
    updateConversationTimestamp(conversationId) {
        // Update the conversation item with latest message time
        const conversationItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (conversationItem) {
            // This would typically show the latest message preview
            // For now, we'll just mark it as updated
            conversationItem.classList.add('updated');
        }
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    showSidebar() {
        document.getElementById('sidebar').classList.add('show');
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    showAlert(message, type = 'info') {
        // Create and show bootstrap alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Insert at top of page
        const container = document.querySelector('.container, .container-fluid');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        }
    }
}

// Initialize the chat app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Current user ID will be set in the template
    window.chatApp = new ChatApp();
});
