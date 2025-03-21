import { writable } from 'svelte/store';
import { supabase } from '../services/supabase';
import { get } from 'svelte/store';
import { authStore } from './authStore';

const createFriendsStore = () => {
    const { subscribe, set, update } = writable({
        friends: [],
        friendRequests: [],
        loading: false,
        error: null
    });

    // Función para cargar amigos
    const loadFriends = async () => {
        const user = get(authStore).user;
        
        if (!user) return;
        
        update(state => ({ ...state, loading: true }));
        
        try {
            // Cargar amistades confirmadas (status = 'accepted')
            const { data: friendships, error } = await supabase
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
                .or(`user1.eq.${user.id},user2.eq.${user.id}`)
                .eq('status', 'accepted');
                
            if (error) throw error;
            
            // Transformar datos para obtener la lista de amigos
            const friendsList = friendships.map(friendship => {
                // Determinar cuál usuario es el amigo (el que no es el usuario actual)
                const friend = friendship.user1 === user.id 
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
            
            update(state => ({
                ...state,
                friends: friendsList,
                loading: false
            }));
        } catch (error) {
            console.error('Error al cargar amigos:', error);
            update(state => ({
                ...state,
                error: error.message,
                loading: false
            }));
        }
    };
    
    // Función para cargar solicitudes de amistad pendientes
    const loadFriendRequests = async () => {
        const user = get(authStore).user;
        
        if (!user) return;
        
        update(state => ({ ...state, loading: true }));
        
        try {
            // Solicitudes recibidas (donde el usuario actual es user2 y el estado es 'pending')
            const { data: requests, error } = await supabase
                .from('friendships')
                .select(`
                    id,
                    user1,
                    status,
                    created_at,
                    users:user1(id, username, avatar_url)
                `)
                .eq('user2', user.id)
                .eq('status', 'pending');
                
            if (error) throw error;
            
            // Transformar los datos para obtener la lista de solicitudes
            const requestsList = requests.map(request => ({
                id: request.id,
                userId: request.users.id,
                username: request.users.username,
                avatar_url: request.users.avatar_url,
                created_at: request.created_at
            }));
            
            update(state => ({
                ...state,
                friendRequests: requestsList,
                loading: false
            }));
        } catch (error) {
            console.error('Error al cargar solicitudes de amistad:', error);
            update(state => ({
                ...state,
                error: error.message,
                loading: false
            }));
        }
    };
    
    // Suscribirse a cambios en la tabla de amistades
    const subscribeFriendships = () => {
        const user = get(authStore).user;
        
        if (!user) return null;
        
        const subscription = supabase
            .channel('friendships-changes')
            .on(
                'postgres_changes',
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'friendships',
                    filter: `user1=eq.${user.id}` 
                },
                () => {
                    loadFriends();
                    loadFriendRequests();
                }
            )
            .on(
                'postgres_changes',
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'friendships',
                    filter: `user2=eq.${user.id}` 
                },
                () => {
                    loadFriends();
                    loadFriendRequests();
                }
            )
            .subscribe();
            
        return subscription;
    };
    
    return {
        subscribe,
        loadFriends,
        loadFriendRequests,
        subscribeFriendships,
        
        // Enviar solicitud de amistad
        sendFriendRequest: async (friendId) => {
            const user = get(authStore).user;
            
            if (!user) return { error: 'Usuario no autenticado' };
            
            try {
                const { data, error } = await supabase
                    .from('friendships')
                    .insert({
                        user1: user.id,
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
        },
        
        // Aceptar solicitud de amistad
        acceptFriendRequest: async (requestId) => {
            try {
                const { data, error } = await supabase
                    .from('friendships')
                    .update({ status: 'accepted' })
                    .eq('id', requestId)
                    .select()
                    .single();
                    
                if (error) throw error;
                
                loadFriends();
                loadFriendRequests();
                
                return { data, error: null };
            } catch (error) {
                console.error('Error al aceptar solicitud de amistad:', error);
                return { data: null, error };
            }
        },
        
        // Rechazar solicitud de amistad
        rejectFriendRequest: async (requestId) => {
            try {
                const { data, error } = await supabase
                    .from('friendships')
                    .delete()
                    .eq('id', requestId)
                    .select()
                    .single();
                    
                if (error) throw error;
                
                loadFriendRequests();
                
                return { data, error: null };
            } catch (error) {
                console.error('Error al rechazar solicitud de amistad:', error);
                return { data: null, error };
            }
        },
        
        // Eliminar amistad
        removeFriend: async (friendshipId) => {
            try {
                const { data, error } = await supabase
                    .from('friendships')
                    .delete()
                    .eq('id', friendshipId)
                    .select()
                    .single();
                    
                if (error) throw error;
                
                // Actualizar la lista de amigos
                update(state => ({
                    ...state,
                    friends: state.friends.filter(friend => friend.id !== friendshipId)
                }));
                
                return { data, error: null };
            } catch (error) {
                console.error('Error al eliminar amistad:', error);
                return { data: null, error };
            }
        },
        
        // Buscar usuarios para agregar como amigos
        searchUsers: async (query) => {
            const user = get(authStore).user;
            
            if (!user || !query || query.length < 3) {
                return { data: [], error: null };
            }
            
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('id, username, avatar_url')
                    .neq('id', user.id)
                    .ilike('username', `%${query}%`)
                    .limit(10);
                    
                if (error) throw error;
                
                return { data, error: null };
            } catch (error) {
                console.error('Error al buscar usuarios:', error);
                return { data: [], error };
            }
        },
        
        // Restablecer el estado
        reset: () => {
            set({
                friends: [],
                friendRequests: [],
                loading: false,
                error: null
            });
        }
    };
};

export const friendsStore = createFriendsStore();