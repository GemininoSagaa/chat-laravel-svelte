<script>
    import { chatStore } from '../../stores/chatStore';
    import { friendsStore } from '../../stores/friendsStore';
    import { groupsStore } from '../../stores/groupsStore';
    
    // Función para obtener los usuarios que están escribiendo
    function getTypingUsers() {
        const typingUsers = Object.entries($chatStore.typingUsers)
            .filter(([userId, data]) => data.isTyping)
            .map(([userId]) => {
                // Si es chat directo, solo hay un usuario
                if ($chatStore.activeType === 'direct') {
                    return $friendsStore.friends.find(f => f.friendId === userId)?.username || 'Alguien';
                }
                
                // Si es chat de grupo, buscar el usuario en los miembros del grupo
                return 'Alguien'; // Aquí podrías mejorar buscando el usuario en los miembros del grupo
            });
            
        return typingUsers;
    }
    
    $: typingUsers = getTypingUsers();
</script>

{#if typingUsers.length > 0}
    <div class="typing-indicator">
        <div class="typing-animation">
            <span></span>
            <span></span>
            <span></span>
        </div>
        <span class="typing-text">
            {#if typingUsers.length === 1}
                {typingUsers[0]} está escribiendo...
            {:else if typingUsers.length === 2}
                {typingUsers[0]} y {typingUsers[1]} están escribiendo...
            {:else}
                Varias personas están escribiendo...
            {/if}
        </span>
    </div>
{/if}

<style>
    .typing-indicator {
        display: flex;
        align-items: center;
        padding: 5px 10px;
        margin-top: 5px;
    }
    
    .typing-animation {
        display: flex;
        align-items: center;
        margin-right: 8px;
    }
    
    .typing-animation span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: #a0aec0;
        margin-right: 3px;
        animation: typing-animation 1.4s infinite ease-in-out;
    }
    
    .typing-animation span:nth-child(1) {
        animation-delay: 0s;
    }
    
    .typing-animation span:nth-child(2) {
        animation-delay: 0.2s;
    }
    
    .typing-animation span:nth-child(3) {
        animation-delay: 0.4s;
        margin-right: 0;
    }
    
    .typing-text {
        font-size: 0.75rem;
        color: #718096;
        font-style: italic;
    }
    
    @keyframes typing-animation {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-4px);
        }
    }
</style>