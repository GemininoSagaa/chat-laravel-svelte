<script>
    export let message;
    export let isOwnMessage = false;
    
    // Formatear la fecha del mensaje
    function formatMessageTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Formatear la fecha completa para el tooltip
    function formatFullDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }
</script>

<div class="message-wrapper {isOwnMessage ? 'own-message' : ''}">
    <div class="message {isOwnMessage ? 'own' : 'other'}">
        {#if !isOwnMessage && message.sender}
            <div class="message-sender">{message.sender.username}</div>
        {/if}
        
        <div class="message-content">{message.content}</div>
        
        <div class="message-time" title={formatFullDate(message.created_at)}>
            {formatMessageTime(message.created_at)}
        </div>
    </div>
</div>

<style>
    .message-wrapper {
        display: flex;
        margin-bottom: 10px;
    }
    
    .message-wrapper.own-message {
        justify-content: flex-end;
    }
    
    .message {
        max-width: 80%;
        padding: 10px;
        border-radius: 8px;
        position: relative;
    }
    
    .message.other {
        background-color: #edf2f7;
        color: #2d3748;
        margin-right: auto;
        border-bottom-left-radius: 0;
    }
    
    .message.own {
        background-color: #4299e1;
        color: white;
        margin-left: auto;
        border-bottom-right-radius: 0;
    }
    
    .message-sender {
        font-size: 0.75rem;
        font-weight: bold;
        margin-bottom: 4px;
        color: #4a5568;
    }
    
    .message-content {
        word-wrap: break-word;
    }
    
    .message-time {
        font-size: 0.7rem;
        opacity: 0.8;
        text-align: right;
        margin-top: 4px;
    }
    
    .message.own .message-time {
        color: rgba(255, 255, 255, 0.9);
    }
</style>