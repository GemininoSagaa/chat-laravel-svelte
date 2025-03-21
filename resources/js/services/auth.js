import { supabase } from './supabase';

// Registro de usuario
export const registerUser = async (email, password, userData) => {
    try {
        // Registrar usuario en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) throw authError;

        if (authData?.user) {
            // Insertar datos en la tabla 'users' (perfil)
            const { error: profileError } = await supabase
                .from('users')
                .insert([
                    {
                        id: authData.user.id,
                        email: email,
                        username: userData.username,
                        avatar_url: userData.avatar_url || null,
                        status: 'online'
                    }
                ]);

            if (profileError) throw profileError;
        }

        return { data: authData, error: null };
    } catch (error) {
        console.error('Error en registro:', error);
        return { data: null, error };
    }
};

// Inicio de sesión
export const loginUser = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        // Actualizar estado del usuario a 'online'
        if (data?.user) {
            await supabase
                .from('users')
                .update({ status: 'online', last_seen: new Date() })
                .eq('id', data.user.id);
        }

        return { data, error: null };
    } catch (error) {
        console.error('Error en inicio de sesión:', error);
        return { data: null, error };
    }
};

// Cerrar sesión
export const logoutUser = async () => {
    try {
        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        
        // Actualizar estado a 'offline' antes de cerrar sesión
        if (user) {
            await supabase
                .from('users')
                .update({ status: 'offline', last_seen: new Date() })
                .eq('id', user.id);
        }

        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        return { error: null };
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        return { error };
    }
};

// Obtener usuario actual
export const getCurrentUser = async () => {
    try {
        const { data, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        // Si tenemos un usuario, obtenemos también sus datos de perfil
        if (data?.user) {
            const { data: profileData, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single();
                
            if (profileError) throw profileError;
            
            return { 
                user: { 
                    ...data.user, 
                    profile: profileData 
                }, 
                error: null 
            };
        }
        
        return { user: null, error: null };
    } catch (error) {
        console.error('Error al obtener usuario actual:', error);
        return { user: null, error };
    }
};

// Actualizar datos del perfil de usuario
export const updateUserProfile = async (userId, userData) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .update(userData)
            .eq('id', userId)
            .select()
            .single();
            
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        return { data: null, error };
    }
};
