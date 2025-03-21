import { supabase } from './supabase';

// Obtener lista de amigos
export const getFriends = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('friendships')
            .select(`
                id,
                user1, 
                user2,
                status,
                created_at,
                users1:user1(id, username, avatar_url, status),
                users2:user2(id, username, avatar_url, status)
            `)
            .or(`user1.eq.${userId},user2.eq.${userId}`)
            .eq('status', 'accepted');
            
        if (error) throw error;
        
        // Transformar datos para obtener la lista de amigos
        const friendsList = data.map(friendship => {
            // Determinar cuál usuario es el amigo (el que no es el usuario actual)
            const friend = friendship.user1 === userId 
                ? friendship.users2 
                : friendship.users1;
                
            return {
                id: friendship.id,
                friendId: friend.id,
                username: friend.username,
                avatar_url: friend.avatar_url,
                status: friend.status,
                created_at: friendship.created_at
            };
        });
        
        return { data: friendsList, error: null };
    } catch (error) {
        console.error('Error al obtener amigos:', error);
        return { data: [], error };
    }
};

// Obtener solicitudes de amistad pendientes
export const getFriendRequests = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('friendships')
            .select(`
                id,
                user1,
                status,
                created_at,
                users:user1(id, username, avatar_url)
            `)
            .eq('user2', userId)
            .eq('status', 'pending');
            
        if (error) throw error;
        
        // Transformar los datos para obtener la lista de solicitudes
        const requestsList = data.map(request => ({
            id: request.id,
            userId: request.users.id,
            username: request.users.username,
            avatar_url: request.users.avatar_url,
            created_at: request.created_at
        }));
        
        return { data: requestsList, error: null };
    } catch (error) {
        console.error('Error al obtener solicitudes de amistad:', error);
        return { data: [], error };
    }
};

// Enviar solicitud de amistad
export const sendFriendRequest = async (userId, friendId) => {
    try {
        // Verificar si ya existe una relación
        const { data: existing, error: checkError } = await supabase
            .from('friendships')
            .select('id, status')
            .or(`and(user1.eq.${userId},user2.eq.${friendId}),and(user1.eq.${friendId},user2.eq.${userId})`)
            .single();
            
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = No se encontró
            throw checkError;
        }
        
        if (existing) {
            if (existing.status === 'accepted') {
                return { 
                    data: null, 
                    error: { message: 'Ya sois amigos' } 
                };
            } else if (existing.status === 'pending') {
                return { 
                    data: null, 
                    error: { message: 'Ya existe una solicitud pendiente' } 
                };
            }
        }
        
        // Crear la solicitud de amistad
        const { data, error } = await supabase
            .from('friendships')
            .insert({
                user1: userId,
                user2: friendId,
                status: 'pending'
            })
            .select()
            .single();
            
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al enviar solicitud de amistad:', error);
        return { data: null, error };
    }
};

// Aceptar solicitud de amistad
export const acceptFriendRequest = async (requestId) => {
    try {
        const { data, error } = await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', requestId)
            .select()
            .single();
            
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al aceptar solicitud de amistad:', error);
        return { data: null, error };
    }
};

// Rechazar solicitud de amistad
export const rejectFriendRequest = async (requestId) => {
    try {
        const { data, error } = await supabase
            .from('friendships')
            .delete()
            .eq('id', requestId)
            .select()
            .single();
            
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al rechazar solicitud de amistad:', error);
        return { data: null, error };
    }
};

// Eliminar amistad
export const removeFriend = async (friendshipId) => {
    try {
        const { data, error } = await supabase
            .from('friendships')
            .delete()
            .eq('id', friendshipId)
            .select()
            .single();
            
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al eliminar amistad:', error);
        return { data: null, error };
    }
};

// Buscar usuarios
export const searchUsers = async (query, currentUserId) => {
    if (!query || query.length < 3) {
        return { data: [], error: null };
    }
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, avatar_url')
            .neq('id', currentUserId)
            .ilike('username', `%${query}%`)
            .limit(10);
            
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al buscar usuarios:', error);
        return { data: [], error };
    }
};