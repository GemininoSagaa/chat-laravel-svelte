<script>
    import { createEventDispatcher } from 'svelte';
    import { groupsStore } from '../../stores/groupsStore';
    
    const dispatch = createEventDispatcher();
    
    // Función para abrir un chat de grupo
    function handleOpenChat(groupId, name) {
        dispatch('openChat', { groupId, name });
    }
</script>

<div class="groups-list">
    <h3>Mis Grupos ({$groupsStore.groups.length})</h3>
    
    {#if $groupsStore.loading}
        <div class="loading">Cargando grupos...</div>
    {:else if $groupsStore.groups.length === 0}
        <div class="empty-list">
            No perteneces a ningún grupo aún. Crea uno nuevo o pide a un amigo que te invite.
        </div>
    {:else}
        <div class="groups-container">
            {#each $groupsStore.groups as group}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <div 
                    class="group-item"
                    on:click={() => handleOpenChat(group.id, group.name)}
                >
                    <div class="group-avatar">
                        <div class="group-avatar-placeholder">
                            {group.name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div class="group-info">
                        <div class="group-name">{group.name}</div>
                        {#if group.description}
                            <div class="group-description">{group.description}</div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .groups-list {
        padding: 10px 15px;
        flex: 1;
        overflow-y: auto;
    }
    
    h3 {
        font-size: 0.875rem;
        color: #4a5568;
        margin-bottom: 10px;
    }
    
    .loading, .empty-list {
        text-align: center;
        color: #a0aec0;
        padding: 20px 0;
        font-size: 0.875rem;
    }
    
    .groups-container {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    
    .group-item {
        display: flex;
        align-items: center;
        padding: 10px;
        border-radius: 0.25rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .group-item:hover {
        background-color: #edf2f7;
    }
    
    .group-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: hidden;
        margin-right: 10px;
        background-color: #805ad5;
    }
    
    .group-avatar-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 18px;
    }
    
    .group-info {
        flex: 1;
    }
    
    .group-name {
        font-weight: 500;
        color: #2d3748;
    }
    
    .group-description {
        font-size: 0.75rem;
        color: #718096;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
    }
</style>