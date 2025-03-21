<script>
    import { chatStore } from '../../stores/chatStore';
    
    let message = '';
    let typingTimeout = null;
    let isTyping = false;
    
    // Función para enviar mensaje
    async function handleSubmit() {
        if (!message.trim()) return;
        
        // Enviar el mensaje
        const { error } = await chatStore.sendMessage(message.trim());
        
        if (error) {
            console.error('Error al enviar mensaje:', error);
            alert('Error al enviar el mensaje. Intenta de nuevo.');
            return;
        }
        
        // Limpiar el campo de entrada
        message = '';
    }
    
    // Función para manejar el estado de escritura
    function handleTyping() {
        if (!isTyping) {
            isTyping = true;
            chatStore.updateTypingStatus(true);
        }
        
        // Limpiar el timeout anterior
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        
        // Configurar un nuevo timeout
        typingTimeout = setTimeout(() => {
            isTyping = false;
            chatStore.updateTypingStatus(false);
        }, 2000);
    }
    
    // Función para manejar la tecla Enter
    function handleKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSubmit();
        }
    }
</script>

<div class="message-input-container">
    <form on:submit|preventDefault={handleSubmit}>
        <div class="input-wrapper">
            <textarea
                placeholder="Escribe un mensaje..."
                bind:value={message}
                on:input={handleTyping}
                on:keydown={handleKeyDown}
            ></textarea>
            <button type="submit" class="send-button" disabled={!message.trim()}>
                Enviar
            </button>
        </div>
    </form>
</div>

<style>
    .message-input-container {
        padding: 15px;
        border-top: 1px solid #e2e8f0;
    }
    
    .input-wrapper {
        display: flex;
        align-items: flex-end;
    }
    
    textarea {
        flex: 1;
        padding: 10px;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
        resize: none;
        height: 60px;
        font-family: inherit;
        font-size: 1rem;
    }
    
    textarea:focus {
        outline: none;
        border-color: #4299e1;
        box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.2);
    }
    
    .send-button {
        background-color: #4299e1;
        color: white;
        border: none;
        border-radius: 0.25rem;
        padding: 10px 15px;
        margin-left: 10px;
        cursor: pointer;
        height: 40px;
        font-size: 0.875rem;
        transition: background-color 0.2s;
    }
    
    .send-button:hover {
        background-color: #3182ce;
    }
    
    .send-button:disabled {
        background-color: #a0aec0;
        cursor: not-allowed;
    }
</style>