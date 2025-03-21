<script>
    import { registerUser } from '../../services/auth';
    
    let username = '';
    let email = '';
    let password = '';
    let confirmPassword = '';
    let loading = false;
    let error = null;
    
    async function handleSubmit() {
        error = null;
        
        if (!username || !email || !password || !confirmPassword) {
            error = 'Por favor, completa todos los campos.';
            return;
        }
        
        if (password !== confirmPassword) {
            error = 'Las contraseñas no coinciden.';
            return;
        }
        
        if (password.length < 6) {
            error = 'La contraseña debe tener al menos 6 caracteres.';
            return;
        }
        
        loading = true;
        
        try {
            const userData = {
                username,
                avatar_url: null
            };
            
            const { data, error: registerError } = await registerUser(email, password, userData);
            
            if (registerError) {
                throw registerError;
            }
            
            // Si el registro fue exitoso, mostrar mensaje
            alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
            
            // Limpiar el formulario
            username = '';
            email = '';
            password = '';
            confirmPassword = '';
        } catch (err) {
            console.error('Error al registrarse:', err);
            error = err.message || 'Error al registrarse. Intenta de nuevo.';
        } finally {
            loading = false;
        }
    }
</script>

<form on:submit|preventDefault={handleSubmit}>
    <h2>Crear una Cuenta</h2>
    
    {#if error}
        <div class="error-message">
            {error}
        </div>
    {/if}
    
    <div class="form-group">
        <label for="username">Nombre de usuario</label>
        <input
            type="text"
            id="username"
            bind:value={username}
            placeholder="Nombre de usuario"
            required
            disabled={loading}
        />
    </div>
    
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
            placeholder="Mínimo 6 caracteres"
            required
            disabled={loading}
        />
    </div>
    
    <div class="form-group">
        <label for="confirmPassword">Confirmar contraseña</label>
        <input
            type="password"
            id="confirmPassword"
            bind:value={confirmPassword}
            placeholder="Confirma tu contraseña"
            required
            disabled={loading}
        />
    </div>
    
    <button type="submit" class="btn-primary" disabled={loading}>
        {loading ? 'Registrando...' : 'Registrarse'}
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