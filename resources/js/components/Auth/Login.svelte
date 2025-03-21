<script>
    import { loginUser } from '../../services/auth';
    import { authStore } from '../../stores/authStore';
    
    let email = '';
    let password = '';
    let loading = false;
    let error = null;
    
    async function handleSubmit() {
        error = null;
        
        if (!email || !password) {
            error = 'Por favor, completa todos los campos.';
            return;
        }
        
        loading = true;
        
        try {
            const { data, error: loginError } = await loginUser(email, password);
            
            if (loginError) {
                throw loginError;
            }
            
            if (data) {
                // El store de autenticación se actualizará automáticamente
                // gracias al listener configurado en authStore.init()
            }
        } catch (err) {
            console.error('Error al iniciar sesión:', err);
            error = err.message || 'Error al iniciar sesión. Intenta de nuevo.';
        } finally {
            loading = false;
        }
    }
</script>

<form on:submit|preventDefault={handleSubmit}>
    <h2>Iniciar Sesión</h2>
    
    {#if error}
        <div class="error-message">
            {error}
        </div>
    {/if}
    
    <div class="form-group">
        <label for="email">Correo electrónico</label>
        <input
            type="email"
            id="email"
            bind:value={email}
            placeholder="tu@email.com"
            required
            disabled={loading}
        />
    </div>
    
    <div class="form-group">
        <label for="password">Contraseña</label>
        <input
            type="password"
            id="password"
            bind:value={password}
            placeholder="Tu contraseña"
            required
            disabled={loading}
        />
    </div>
    
    <button type="submit" class="btn-primary" disabled={loading}>
        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
    </button>
</form>

<style>
    form {
        display: flex;
        flex-direction: column;
    }
    
    h2 {
        text-align: center;
        color: #4a5568;
        margin-bottom: 1.5rem;
    }
    
    .form-group {
        margin-bottom: 1rem;
    }
    
    label {
        display: block;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        color: #4a5568;
    }
    
    input {
        width: 100%;
        padding: 0.5rem;
        font-size: 1rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
        outline: none;
    }
    
    input:focus {
        border-color: #4299e1;
        box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.2);
    }
    
    .btn-primary {
        padding: 0.5rem 1rem;
        background-color: #4299e1;
        color: white;
        border: none;
        border-radius: 0.25rem;
        font-size: 1rem;
        cursor: pointer;
        transition: background-color 0.3s;
    }
    
    .btn-primary:hover {
        background-color: #3182ce;
    }
    
    .btn-primary:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
    
    .error-message {
        padding: 0.5rem;
        background-color: #fed7d7;
        color: #c53030;
        border-radius: 0.25rem;
        margin-bottom: 1rem;
        font-size: 0.875rem;
    }
</style>