import { writable } from 'svelte/store';
import { supabase } from '../services/supabase';
import { getCurrentUser } from '../services/auth';

// Estado inicial
const createAuthStore = () => {
    const { subscribe, set, update } = writable({
        user: null,
        session: null,
        loading: true,
        error: null
    });

    return {
        subscribe,
        setUser: (user) => update(state => ({ ...state, user })),
        setSession: (session) => update(state => ({ ...state, session })),
        setLoading: (loading) => update(state => ({ ...state, loading })),
        setError: (error) => update(state => ({ ...state, error })),
        
        // Inicializar la sesión y configurar listeners
        init: async () => {
            update(state => ({ ...state, loading: true }));
            
            // Verificar si ya hay una sesión activa
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                const { user, error } = await getCurrentUser();
                
                if (!error && user) {
                    update(state => ({
                        ...state,
                        user,
                        session: data.session,
                        loading: false
                    }));
                } else {
                    update(state => ({
                        ...state,
                        user: null,
                        session: null,
                        loading: false
                    }));
                }
            } else {
                update(state => ({
                    ...state,
                    user: null,
                    session: null,
                    loading: false
                }));
            }
            
            // Suscribirse a cambios de autenticación
            const { data: authListener } = supabase.auth.onAuthStateChange(
                async (event, session) => {
                    if (event === 'SIGNED_IN' && session) {
                        const { user, error } = await getCurrentUser();
                        
                        if (!error && user) {
                            update(state => ({
                                ...state,
                                user,
                                session,
                                loading: false
                            }));
                        }
                    } else if (event === 'SIGNED_OUT') {
                        update(state => ({
                            ...state,
                            user: null,
                            session: null,
                            loading: false
                        }));
                    }
                }
            );
            
            return () => {
                if (authListener && authListener.subscription) {
                    authListener.subscription.unsubscribe();
                }
            };
        },
        
        // Limpiar el estado al cerrar sesión
        reset: () => {
            set({
                user: null,
                session: null,
                loading: false,
                error: null
            });
        }
    };
};

export const authStore = createAuthStore();