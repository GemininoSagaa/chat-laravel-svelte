<script>
    import { onMount, onDestroy } from 'svelte';
    import { authStore } from '../../stores/authStore';
    import { friendsStore } from '../../stores/friendsStore';
    import { groupsStore } from '../../stores/groupsStore';
    import { chatStore } from '../../stores/chatStore';
    import { logoutUser } from '../../services/auth';
    
    import FriendsList from './FriendsList.svelte';
    import GroupsList from './GroupsList.svelte';
    import ChatMessage from './ChatMessage.svelte';
    import MessageInput from './MessageInput.svelte';
    import TypingIndicator from './TypingIndicator.svelte';
    
    // Variables reactivas
    let user = $authStore.user;
    let activeTab = 'friends'; // 'friends' o 'groups'
    let searchQuery = '';
    let searchResults = [];
    let isSearching = false;
    let menuOpen = false;
    
    // Referencia al contenedor de mensajes para scroll automático
    let messagesContainer;
    
    $: if (messagesContainer && $chatStore.messages.length > 0) {
        // Scroll al último mensaje cuando se recibe uno nuevo
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 0);
    }
    
    // Función para cerrar sesión
    async function handleLogout() {
        const { error } = await logoutUser();
        
        if (error) {
            console.error('Error al cerrar sesión:', error);
        }
    }
    
    // Función para buscar usuarios
    async function handleSearch() {
        if (!searchQuery || searchQuery.length < 3) {
            searchResults = [];
            return;
        }
        
        isSearching = true;
        
        try {
            const { data, error } = await friendsStore.searchUsers(searchQuery);
            
            if (error) throw error;
            
            searchResults = data || [];
        } catch (error) {
            console.error('Error al buscar usuarios:', error);
        } finally {
            isSearching = false;
        }
    }
    
    // Función para enviar solicitud de amistad
    async function sendFriendRequest(friendId) {
        const { error } = await friendsStore.sendFriendRequest(friendId);
        
        if (error) {
            alert('Error al enviar solicitud: ' + error.message);
        } else {
            alert('Solicitud de amistad enviada');
            // Limpiar búsqueda
            searchQuery = '';
            searchResults = [];
        }
    }
    
    // Función para aceptar solicitud de amistad
    async function acceptFriendRequest(requestId) {
        const { error } = await friendsStore.acceptFriendRequest(requestId);
        
        if (error) {
            alert('Error al aceptar solicitud: ' + error.message);
        }
    }
    
    // Función para rechazar solicitud de amistad
    async function rejectFriendRequest(requestId) {
        const { error } = await friendsStore.rejectFriendRequest(requestId);
        
        if (error) {
            alert('Error al rechazar solicitud: ' + error.message);
        }
    }
    
    // Funciones para gestionar chats
    function openChat(friendId, friendName) {
        chatStore.setActiveChat(friendId, 'direct');
    }
    
    function openGroupChat(groupId, groupName) {
        chatStore.setActiveChat(groupId, 'group');
    }
    
    function closeChat() {
        chatStore.closeActiveChat();
    }
    
    // Función para crear un nuevo grupo
    async function createGroup() {
        const groupName = prompt('Nombre del grupo:');
        
        if (!groupName) return;
        
        const groupDescription = prompt('Descripción (opcional):');
        
        const { data, error } = await groupsStore.createGroup(groupName, groupDescription || '');
        
        if (error) {
            alert('Error al crear grupo: ' + error.message);
        } else {
            alert('Grupo creado correctamente');
        }
    }
    
    // Función para invitar amigos al grupo actual
    async function inviteFriendToGroup() {
        if (!$chatStore.activeChat || $chatStore.activeType !== 'group') {
            alert('Selecciona un grupo primero');
            return;
        }
        
        // Obtener amigos que no estén en el grupo
        const { data: members } = await groupsStore.loadGroupMembers($chatStore.activeChat);
        const memberIds = members.map(m => m.userId);
        
        const availableFriends = $friendsStore.friends.filter(
            friend => !memberIds.includes(friend.friendId)
        );
        
        if (availableFriends.length === 0) {
            alert('No tienes más amigos para invitar a este grupo');
            return;
        }
        
        // Construir lista de amigos para mostrar
        let friendsList = 'Selecciona un amigo para invitar:\n';
        availableFriends.forEach((friend, index) => {
            friendsList += `${index + 1}. ${friend.username}\n`;
        });
        
        const selection = prompt(friendsList);
        
        if (!selection) return;
        
        const index = parseInt(selection) - 1;
        
        if (isNaN(index) || index < 0 || index >= availableFriends.length) {
            alert('Selección inválida');
            return;
        }
        
        const selectedFriend = availableFriends[index];
        
        // Añadir amigo al grupo
        const { error } = await groupsStore.addGroupMember(
            $chatStore.activeChat,
            selectedFriend.friendId
        );
        
        if (error) {
            alert('Error al añadir miembro: ' + error.message);
        } else {
            alert(`${selectedFriend.username} añadido al grupo`);
        }
    }
    
    // Limpiar suscripciones al desmontar
    onDestroy(() => {
        chatStore.cleanupSubscriptions();
    });
</script>

<div class="chat-app">
    <!-- Barra lateral -->
    <aside class="sidebar">
        <div class="user-info">
            <div class="avatar">
                {#if user.profile && user.profile.avatar_url}
                    <img src={user.profile.avatar_url} alt={user.profile.username} />
                {:else}
                    <div class="avatar-placeholder">
                        {user.profile ? user.profile.username.charAt(0).toUpperCase() : '?'}
                    </div>
                {/if}
            </div>
            <div class="user-details">
                <div class="username">{user.profile ? user.profile.username : 'Usuario'}</div>
                <div class="status online">En línea</div>
            </div>
            <button class="menu-button" on:click={() => menuOpen = !menuOpen}>
                &#9776;
            </button>
            
            {#if menuOpen}
                <div class="dropdown-menu">
                    <button on:click={handleLogout}>Cerrar sesión</button>
                </div>
            {/if}
        </div>
        
        <!-- Búsqueda de usuarios -->
        <div class="search-container">
            <input
                type="text"
                placeholder="Buscar usuarios..."
                bind:value={searchQuery}
                on:input={handleSearch}
            />
            
            {#if searchResults.length > 0}
                <div class="search-results">
                    {#each searchResults as user}
                        <div class="search-result-item">
                            <div class="user-info">
                                <div class="avatar-small">
                                    {#if user.avatar_url}
                                        <img src={user.avatar_url} alt={user.username} />
                                    {:else}
                                        <div class="avatar-placeholder small">
                                            {user.username.charAt(0).toUpperCase()}
                                        </div>
                                    {/if}
                                </div>
                                <span>{user.username}</span>
                            </div>
                            <button 
                                class="btn-small"
                                on:click={() => sendFriendRequest(user.id)}
                            >
                                Agregar
                            </button>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
        
        <!-- Pestañas para alternar entre amigos y grupos -->
        <div class="tabs">
            <button 
                class={activeTab === 'friends' ? 'active' : ''}
                on:click={() => activeTab = 'friends'}
            >
                Amigos
            </button>
            <button 
                class={activeTab === 'groups' ? 'active' : ''}
                on:click={() => activeTab = 'groups'}
            >
                Grupos
            </button>
        </div>
        
        {#if activeTab === 'friends'}
            <!-- Lista de amigos -->
            <FriendsList 
                on:openChat={e => openChat(e.detail.friendId, e.detail.username)}
                on:acceptRequest={e => acceptFriendRequest(e.detail.requestId)}
                on:rejectRequest={e => rejectFriendRequest(e.detail.requestId)}
            />
        {:else}
            <!-- Lista de grupos -->
            <GroupsList
                on:openChat={e => openGroupChat(e.detail.groupId, e.detail.name)}
            />
            
            <div class="group-actions">
                <button class="btn-create-group" on:click={createGroup}>
                    Crear nuevo grupo
                </button>
            </div>
        {/if}
    </aside>
    
    <!-- Área de chat -->
    <div class="chat-area">
        {#if $chatStore.activeChat}
            <div class="chat-header">
                <button class="btn-back" on:click={closeChat}>
                    &larr;
                </button>
                
                <div class="chat-info">
                    <h2>
                        {#if $chatStore.activeType === 'direct'}
                            <!-- Encontrar amigo por ID -->
                            {$friendsStore.friends.find(f => f.friendId === $chatStore.activeChat)?.username || 'Chat'}
                        {:else}
                            <!-- Encontrar grupo por ID -->
                            {$groupsStore.groups.find(g => g.id === $chatStore.activeChat)?.name || 'Grupo'}
                        {/if}
                    </h2>
                    
                    {#if $chatStore.activeType === 'group'}
                        <div class="group-actions-header">
                            <button class="btn-small" on:click={inviteFriendToGroup}>
                                Invitar amigos
                            </button>
                        </div>
                    {/if}
                </div>
            </div>
            
            <div class="messages-container" bind:this={messagesContainer}>
                {#if $chatStore.loading}
                    <div class="loading-messages">
                        Cargando mensajes...
                    </div>
                {:else if $chatStore.messages.length === 0}
                    <div class="no-messages">
                        No hay mensajes aún. ¡Sé el primero en enviar uno!
                    </div>
                {:else}
                    {#each $chatStore.messages as message}
                        <ChatMessage 
                            {message} 
                            isOwnMessage={message.sender_id === user.id}
                        />
                    {/each}
                {/if}
                
                <!-- Indicador de escritura -->
                <TypingIndicator />
            </div>
            
            <MessageInput />
        {:else}
            <div class="no-chat-selected">
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h2>Chatapp</h2>
                    <p>Selecciona un amigo o grupo para comenzar a chatear</p>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .chat-app {
        display: flex;
        width: 100%;
        height: 100vh;
        overflow: hidden;
    }
    
    .sidebar {
        width: 320px;
        background-color: #f8fafc;
        border-right: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    
    .user-info {
        display: flex;
        align-items: center;
        padding: 15px;
        background-color: #edf2f7;
        position: relative;
    }
    
    .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: hidden;
        margin-right: 10px;
        background-color: #4299e1;
    }
    
    .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .avatar-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 18px;
    }
    
    .avatar-placeholder.small {
        font-size: 14px;
    }
    
    .avatar-small {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        overflow: hidden;
        margin-right: 10px;
        background-color: #4299e1;
    }
    
    .user-details {
        flex: 1;
    }
    
    .username {
        font-weight: bold;
        color: #2d3748;
    }
    
    .status {
        font-size: 0.75rem;
        color: #718096;
    }
    
    .status.online {
        color: #38a169;
    }
    
    .menu-button {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #4a5568;
    }
    
    .dropdown-menu {
        position: absolute;
        top: 100%;
        right: 15px;
        background-color: white;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10;
    }
    
    .dropdown-menu button {
        display: block;
        width: 100%;
        padding: 10px 15px;
        background: none;
        border: none;
        text-align: left;
        cursor: pointer;
    }
    
    .dropdown-menu button:hover {
        background-color: #f8fafc;
    }
    
    .search-container {
        padding: 10px 15px;
        position: relative;
    }
    
    .search-container input {
        width: 100%;
        padding: 8px;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
        font-size: 0.875rem;
    }
    
    .search-results {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background-color: white;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10;
        max-height: 200px;
        overflow-y: auto;
    }
    
    .search-result-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 15px;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .search-result-item:last-child {
        border-bottom: none;
    }
    
    .search-result-item .user-info {
        display: flex;
        align-items: center;
        background: none;
        padding: 0;
    }
    
    .tabs {
        display: flex;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .tabs button {
        flex: 1;
        padding: 10px;
        background: none;
        border: none;
        font-size: 0.875rem;
        cursor: pointer;
        color: #718096;
        position: relative;
    }
    
    .tabs button.active {
        color: #4299e1;
        font-weight: bold;
    }
    
    .tabs button.active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background-color: #4299e1;
    }
    
    .group-actions {
        padding: 10px 15px;
        border-top: 1px solid #e2e8f0;
        margin-top: auto;
    }
    
    .btn-create-group {
        width: 100%;
        padding: 8px;
        background-color: #4299e1;
        color: white;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
    }
    
    .chat-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        background-color: white;
    }
    
    .chat-header {
        display: flex;
        align-items: center;
        padding: 15px;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .btn-back {
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        margin-right: 10px;
        color: #4a5568;
    }
    
    .chat-info {
        flex: 1;
    }
    
    .chat-info h2 {
        margin: 0;
        font-size: 1.1rem;
        color: #2d3748;
    }
    
    .group-actions-header {
        margin-top: 5px;
    }
    
    .btn-small {
        padding: 4px 8px;
        background-color: #4299e1;
        color: white;
        border: none;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        cursor: pointer;
    }
    
    .messages-container {
        flex: 1;
        padding: 15px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    }
    
    .loading-messages,
    .no-messages {
        text-align: center;
        color: #a0aec0;
        margin: auto;
        padding: 20px;
    }
    
    .no-chat-selected {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #f7fafc;
    }
    
    .empty-state {
        text-align: center;
        padding: 30px;
    }
    
    .empty-icon {
        font-size: 3rem;
        margin-bottom: 15px;
    }
    
    .empty-state h2 {
        color: #4a5568;
        margin-bottom: 10px;
    }
    
    .empty-state p {
        color: #718096;
    }
</style>