<script>
    import { createEventDispatcher } from 'svelte';
    import { friendsStore } from '../../stores/friendsStore';
    
    const dispatch = createEventDispatcher();
    
    // Función para abrir un chat
    function handleOpenChat(friendId, username) {
        dispatch('openChat', { friendId, username });
    }
    
    // Función para aceptar solicitud de amistad
    function handleAcceptRequest(requestId) {
        dispatch('acceptRequest', { requestId });
    }
    
    // Función para rechazar solicitud de amistad
    function handleRejectRequest(requestId) {
        dispatch('rejectRequest', { requestId });
    }
</script>

<div class="friends-list">
    <!-- Solicitudes de amistad pendientes -->
    {#if $friendsStore.friendRequests.length > 0}
        <div class="friend-requests">
            <h3>Solicitudes de amistad ({$friendsStore.friendRequests.length})</h3>
            
            {#each $friendsStore.friendRequests as request}
                <div class="friend-request-item">
                    <div class="user-info">
                        <div class="avatar-small">
                            {#if request.avatar_url}
                                <img src={request.avatar_url} alt={request.username} />
                            {:else}
                                <div class="avatar-placeholder small">
                                    {request.username.charAt(0).toUpperCase()}
                                </div>
                            {/if}
                        </div>
                        <span>{request.username}</span>
                    </div>
                    <div class="request-actions">
                        <button 
                            class="btn-small accept"
                            on:click={() => handleAcceptRequest(request.id)}
                        >
                            Aceptar
                        </button>
                        <button 
                            class="btn-small reject"
                            on:click={() => handleRejectRequest(request.id)}
                        >
                            Rechazar
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
    
    <!-- Lista de amigos -->
    <h3>Amigos ({$friendsStore.friends.length})</h3>
    
    {#if $friendsStore.loading}
        <div class="loading">Cargando amigos...</div>
    {:else if $friendsStore.friends.length === 0}
        <div class="empty-list">
            No tienes amigos aún. Búscalos por su nombre de usuario para enviarles una solicitud.
        </div>
    {:else}
        <div class="friends-container">
            {#each $friendsStore.friends as friend}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                    class="friend-item"
                    on:click={() => handleOpenChat(friend.friendId, friend.username)}
                >
                    <div class="avatar-small">
                        {#if friend.avatar_url}
                            <img src={friend.avatar_url} alt={friend.username} />
                        {:else}
                            <div class="avatar-placeholder small">
                                {friend.username.charAt(0).toUpperCase()}
                            </div>
                        {/if}
                    </div>
                    <div class="friend-info">
                        <div class="friend-name">{friend.username}</div>
                        <div class="friend-status">
                            <span class={`status-indicator ${friend.status}`}></span>
                            {friend.status === 'online' ? 'En línea' : 'Desconectado'}
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .friends-list {
        padding: 10px 15px;
        flex: 1;
        overflow-y: auto;
    }
    
    h3 {
        font-size: 0.875rem;
        color: #4a5568;
        margin-bottom: 10px;
        margin-top: 15px;
    }
    
    .loading, .empty-list {
        text-align: center;
        color: #a0aec0;
        padding: 20px 0;
        font-size: 0.875rem;
    }
    
    .friend-requests {
        margin-bottom: 20px;
    }
    
    .friend-request-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px;
        border-radius: 0.25rem;
        background-color: #f8fafc;
        margin-bottom: 5px;
    }
    
    .user-info {
        display: flex;
        align-items: center;
    }
    
    .avatar-small {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        overflow: hidden;
        margin-right: 10px;
        background-color: #4299e1;
    }
    
    .avatar-small img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .avatar-placeholder.small {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
    }
    
    .request-actions {
        display: flex;
        gap: 5px;
    }
    
    .btn-small {
        padding: 4px 8px;
        color: white;
        border: none;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        cursor: pointer;
    }
    
    .btn-small.accept {
        background-color: #48bb78;
    }
    
    .btn-small.reject {
        background-color: #f56565;
    }
    
    .friends-container {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    
    .friend-item {
        display: flex;
        align-items: center;
        padding: 10px;
        border-radius: 0.25rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .friend-item:hover {
        background-color: #edf2f7;
    }
    
    .friend-info {
        margin-left: 10px;
    }
    
    .friend-name {
        font-weight: 500;
        color: #2d3748;
    }
    
    .friend-status {
        display: flex;
        align-items: center;
        font-size: 0.75rem;
        color: #718096;
    }
    
    .status-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 5px;
    }
    
    .status-indicator.online {
        background-color: #48bb78;
    }
    
    .status-indicator.offline {
        background-color: #cbd5e0;
    }
</style>