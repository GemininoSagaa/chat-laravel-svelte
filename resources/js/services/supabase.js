import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL o Anon Key no encontradas. Asegúrate de configurar las variables de entorno.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Función de utilidad para verificar el estado de suscripción
export const checkSubscription = async () => {
    try {
        const { data, error } = await supabase.realtime.status();
        console.log('Estado de suscripción a Realtime:', data);
        return { data, error };
    } catch (error) {
        console.error('Error al verificar el estado de suscripción:', error);
        return { data: null, error };
    }
};
