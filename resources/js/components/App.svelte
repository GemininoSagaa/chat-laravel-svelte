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
    let forceLoginScreen = false; // Nueva variable para forzar la pantalla de login
    
    onMount(async () => {
        // Añadir timeout para no quedarse cargando infinitamente
        setTimeout(() => {
            if (isLoading) {
                console.log("Forzando fin de carga por timeout");
                isLoading = false;
            }
        }, 5000); // 5 segundos máximo de carga
        
        try {
            // Inicializar el store de autenticación
            destroyAuthStore = await authStore.init();
            
            // Suscribirse a cambios en el store de autenticación
            authUnsubscribe = authStore.subscribe(state => {
                isLoading = state.loading;
                
                if (state.user) {
                    // Si hay un usuario autenticado, cargar amigos y grupos
                    try {
                        friendsStore.loadFriends();
                        friendsStore.loadFriendRequests();
                        friendsSubscription = friendsStore.subscribeFriendships();
                        
                        groupsStore.loadGroups();
                        groupsSubscription = groupsStore.subscribeGroups();
                    } catch (error) {
                        console.error("Error al cargar datos:", error);
                    }
                }
            });
        } catch (error) {
            console.error("Error en la inicialización:", error);
            isLoading = false;
        }
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
    
    // Función para forzar la pantalla de login
    const forceLogin = () => {
        isLoading = false;
        forceLoginScreen = true;
        authStore.reset(); // Resetear el store de autenticación
    };
</script>

<main>
    {#if isLoading}
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Cargando...</p>
            <button class="emergency-button" on:click={forceLogin}>
                Cancelar carga y mostrar login
            </button>
        </div>
    {:else if !$authStore.user || forceLoginScreen}
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
    /* Estilos existentes... */
    
    .emergency-button {
        margin-top: 20px;
        padding: 8px 16px;
        background-color: #f56565;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    }
    
    .emergency-button:hover {
        background-color: #e53e3e;
    }
</style>