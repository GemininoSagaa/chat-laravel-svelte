<script>
    import { onMount, onDestroy } from 'svelte';
    import { authStore } from '../stores/authStore';
    import { friendsStore } from '../stores/friendsStore';
    import { groupsStore } from '../stores/groupsStore';
    
    import Login from './Auth/Login.svelte';
    import Register from './Auth/Register.svelte';
    import ChatContainer from './Chat/ChatContainer.svelte';
    
    let destroyAuthStore;
    let authUnsubscribe;
    let friendsSubscription;
    let groupsSubscription;
    let showRegister = false;
    let isLoading = true;
    
    onMount(async () => {
        // Inicializar el store de autenticación
        destroyAuthStore = await authStore.init();
        
        // Suscribirse a cambios en el store de autenticación
        authUnsubscribe = authStore.subscribe(state => {
            isLoading = state.loading;
            
            if (state.user) {
                // Si hay un usuario autenticado, cargar amigos y grupos
                friendsStore.loadFriends();
                friendsStore.loadFriendRequests();
                friendsSubscription = friendsStore.subscribeFriendships();
                
                groupsStore.loadGroups();
                groupsSubscription = groupsStore.subscribeGroups();
            }
        });
    });
    
    onDestroy(() => {
        // Limpiar suscripciones
        if (destroyAuthStore) destroyAuthStore();
        if (authUnsubscribe) authUnsubscribe();
        
        if (friendsSubscription) {
            friendsSubscription.unsubscribe();
        }
        
        if (groupsSubscription) {
            groupsSubscription.unsubscribe();
        }
        
        // Restablecer stores
        friendsStore.reset();
        groupsStore.reset();
    });
    
    // Función para cambiar entre formularios de inicio de sesión y registro
    const toggleForm = () => {
        showRegister = !showRegister;
    };
</script>

<main>
    {#if isLoading}
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Cargando...</p>
        </div>
    {:else if !$authStore.user}
        <!-- Si no hay usuario autenticado, mostrar formularios de autenticación -->
        <div class="auth-container">
            <div class="auth-card">
                <h1 class="app-title">Chat en Tiempo Real</h1>
                
                {#if showRegister}
                    <Register />
                    <p class="auth-toggle">
                        ¿Ya tienes una cuenta? <button on:click={toggleForm}>Iniciar sesión</button>
                    </p>
                {:else}
                    <Login />
                    <p class="auth-toggle">
                        ¿No tienes cuenta? <button on:click={toggleForm}>Registrarse</button>
                    </p>
                {/if}
            </div>
        </div>
    {:else}
        <!-- Si hay un usuario autenticado, mostrar el contenedor del chat -->
        <ChatContainer />
    {/if}
</main>

<style>
    main {
        width: 100%;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: #f5f7fb;
    }
    
    .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
    
    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e0e0e0;
        border-radius: 50%;
        border-top-color: #3498db;
        animation: spin 1s linear infinite;
        margin-bottom: 10px;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .auth-container {
        width: 100%;
        max-width: 400px;
        padding: 20px;
    }
    
    .auth-card {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        padding: 30px;
    }
    
    .app-title {
        text-align: center;
        color: #4a5568;
        font-size: 1.8rem;
        margin-bottom: 1.5rem;
    }
    
    .auth-toggle {
        margin-top: 1rem;
        text-align: center;
        font-size: 0.9rem;
        color: #718096;
    }
    
    .auth-toggle button {
        background: none;
        border: none;
        color: #4299e1;
        cursor: pointer;
        font-size: 0.9rem;
        padding: 0;
        text-decoration: underline;
    }
</style>