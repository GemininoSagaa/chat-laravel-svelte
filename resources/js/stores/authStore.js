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
        
        init: async () => {
            try {
                console.log('Iniciando authStore...');
                update(state => ({ ...state, loading: true }));
                
                // Verificar si ya hay una sesión activa
                const { data } = await supabase.auth.getSession();
                console.log('Respuesta de sesión:', data);
                
                // Simplemente actualizar el estado con la sesión y marcar como no cargando
                update(state => ({
                    ...state,
                    session: data.session,
                    user: data.session?.user || null,
                    loading: false
                }));
                
                // Suscribirse a cambios de autenticación de manera simple
                const { data: authListener } = supabase.auth.onAuthStateChange(
                    (event, session) => {
                        console.log('Evento de autenticación:', event);
                        
                        // Actualiza directamente sin hacer más llamadas
                        update(state => ({
                            ...state,
                            session: session,
                            user: session?.user || null,
                            loading: false
                        }));
                    }
                );
                
                return () => {
                    if (authListener && authListener.subscription) {
                        authListener.subscription.unsubscribe();
                    }
                };
            } catch (error) {
                console.error('Error al inicializar authStore:', error);
                // En caso de error, marcamos como no cargando para no bloquear la interfaz
                update(state => ({ ...state, loading: false, error }));
                return () => {};
            }
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