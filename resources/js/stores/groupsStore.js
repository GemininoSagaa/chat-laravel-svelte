import { writable, get } from 'svelte/store';
import { supabase } from '../services/supabase';
import { authStore } from './authStore';

const createGroupsStore = () => {
    const { subscribe, set, update } = writable({
        groups: [],
        loading: false,
        error: null,
        subscription: null
    });

    // Función para cargar grupos
    const loadGroups = async () => {
        const user = get(authStore).user;
        
        if (!user) return;
        
        update(state => ({ ...state, loading: true }));
        
        try {
            // Cargar grupos a los que pertenece el usuario
            const { data: memberships, error } = await supabase
                .from('group_members')
                .select(`
                    id,
                    groups:group_id(
                        id,
                        name,
                        description,
                        created_at,
                        creator_id
                    )
                `)
                .eq('user_id', user.id);
                
            if (error) throw error;
            
            // Transformar datos para obtener la lista de grupos
            const groupsList = memberships.map(membership => ({
                id: membership.groups.id,
                name: membership.groups.name,
                description: membership.groups.description,
                created_at: membership.groups.created_at,
                isCreator: membership.groups.creator_id === user.id,
                membershipId: membership.id
            }));
            
            update(state => ({
                ...state,
                groups: groupsList,
                loading: false
            }));
        } catch (error) {
            console.error('Error al cargar grupos:', error);
            update(state => ({
                ...state,
                error: error.message,
                loading: false
            }));
        }
    };
    
    // Suscribirse a cambios en la membresía de grupos
    const subscribeGroups = () => {
        const user = get(authStore).user;
        
        if (!user) return null;
        
        const subscription = supabase
            .channel('groups-changes')
            .on(
                'postgres_changes',
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'group_members',
                    filter: `user_id=eq.${user.id}` 
                },
                () => {
                    loadGroups();
                }
            )
            .subscribe();
            
        update(state => ({
            ...state,
            subscription
        }));
            
        return subscription;
    };
    
    // Cargar miembros de un grupo específico
    const loadGroupMembers = async (groupId) => {
        if (!groupId) return { data: [], error: 'ID de grupo no proporcionado' };
        
        try {
            const { data, error } = await supabase
                .from('group_members')
                .select(`
                    id,
                    user_id,
                    joined_at,
                    users:user_id(
                        id,
                        username,
                        avatar_url,
                        status
                    )
                `)
                .eq('group_id', groupId);
                
            if (error) throw error;
            
            // Transformar datos para obtener la lista de miembros
            const membersList = data.map(member => ({
                id: member.id,
                userId: member.user_id,
                username: member.users.username,
                avatar_url: member.users.avatar_url,
                status: member.users.status,
                joined_at: member.joined_at
            }));
            
            return { data: membersList, error: null };
        } catch (error) {
            console.error('Error al cargar miembros del grupo:', error);
            return { data: [], error };
        }
    };
    
    return {
        subscribe,
        loadGroups,
        subscribeGroups,
        loadGroupMembers,
        
        // Crear un nuevo grupo
        createGroup: async (name, description = '') => {
            const user = get(authStore).user;
            
            if (!user || !name.trim()) {
                return { error: 'Datos incompletos' };
            }
            
            try {
                // Crear el grupo
                const { data: groupData, error: groupError } = await supabase
                    .from('groups')
                    .insert({
                        name,
                        description,
                        creator_id: user.id
                    })
                    .select()
                    .single();
                    
                if (groupError) throw groupError;
                
                // Añadir al creador como miembro del grupo
                const { data: memberData, error: memberError } = await supabase
                    .from('group_members')
                    .insert({
                        group_id: groupData.id,
                        user_id: user.id,
                        role: 'admin'
                    })
                    .select()
                    .single();
                    
                if (memberError) throw memberError;
                
                // Recargar la lista de grupos
                loadGroups();
                
                return { data: groupData, error: null };
            } catch (error) {
                console.error('Error al crear grupo:', error);
                return { data: null, error };
            }
        },
        
        // Añadir miembro a un grupo
        addGroupMember: async (groupId, userId) => {
            if (!groupId || !userId) {
                return { error: 'Datos incompletos' };
            }
            
            try {
                const { data, error } = await supabase
                    .from('group_members')
                    .insert({
                        group_id: groupId,
                        user_id: userId,
                        role: 'member'
                    })
                    .select()
                    .single();
                    
                if (error) throw error;
                
                return { data, error: null };
            } catch (error) {
                console.error('Error al añadir miembro al grupo:', error);
                return { data: null, error };
            }
        },
        
        // Eliminar miembro de un grupo
        removeGroupMember: async (membershipId) => {
            if (!membershipId) {
                return { error: 'ID de membresía no proporcionado' };
            }
            
            try {
                const { data, error } = await supabase
                    .from('group_members')
                    .delete()
                    .eq('id', membershipId)
                    .select()
                    .single();
                    
                if (error) throw error;
                
                return { data, error: null };
            } catch (error) {
                console.error('Error al eliminar miembro del grupo:', error);
                return { data: null, error };
            }
        },
        
        // Abandonar un grupo
        leaveGroup: async (groupId) => {
            const user = get(authStore).user;
            
            if (!user || !groupId) {
                return { error: 'Datos incompletos' };
            }
            
            try {
                const { data, error } = await supabase
                    .from('group_members')
                    .delete()
                    .eq('group_id', groupId)
                    .eq('user_id', user.id)
                    .select()
                    .single();
                    
                if (error) throw error;
                
                // Actualizar la lista de grupos
                update(state => ({
                    ...state,
                    groups: state.groups.filter(group => group.id !== groupId)
                }));
                
                return { data, error: null };
            } catch (error) {
                console.error('Error al abandonar grupo:', error);
                return { data: null, error };
            }
        },
        
        // Eliminar un grupo (solo si eres el creador)
        deleteGroup: async (groupId) => {
            const user = get(authStore).user;
            
            if (!user || !groupId) {
                return { error: 'Datos incompletos' };
            }
            
            try {
                // Verificar si el usuario es el creador del grupo
                const { data: groupData, error: groupError } = await supabase
                    .from('groups')
                    .select('creator_id')
                    .eq('id', groupId)
                    .single();
                    
                if (groupError) throw groupError;
                
                if (groupData.creator_id !== user.id) {
                    return { error: 'No tienes permisos para eliminar este grupo' };
                }
                
                // Eliminar el grupo
                const { data, error } = await supabase
                    .from('groups')
                    .delete()
                    .eq('id', groupId)
                    .select()
                    .single();
                    
                if (error) throw error;
                
                // Actualizar la lista de grupos
                update(state => ({
                    ...state,
                    groups: state.groups.filter(group => group.id !== groupId)
                }));
                
                return { data, error: null };
            } catch (error) {
                console.error('Error al eliminar grupo:', error);
                return { data: null, error };
            }
        },
        
        // Actualizar información del grupo
        updateGroup: async (groupId, updates) => {
            const user = get(authStore).user;
            
            if (!user || !groupId || !updates) {
                return { error: 'Datos incompletos' };
            }
            
            try {
                // Verificar si el usuario es el creador o admin del grupo
                const { data: groupData, error: groupError } = await supabase
                    .from('groups')
                    .select('creator_id')
                    .eq('id', groupId)
                    .single();
                    
                if (groupError) throw groupError;
                
                if (groupData.creator_id !== user.id) {
                    // Verificar si es admin
                    const { data: memberData, error: memberError } = await supabase
                        .from('group_members')
                        .select('role')
                        .eq('group_id', groupId)
                        .eq('user_id', user.id)
                        .single();
                        
                    if (memberError) throw memberError;
                    
                    if (memberData.role !== 'admin') {
                        return { error: 'No tienes permisos para actualizar este grupo' };
                    }
                }
                
                // Actualizar el grupo
                const { data, error } = await supabase
                    .from('groups')
                    .update(updates)
                    .eq('id', groupId)
                    .select()
                    .single();
                    
                if (error) throw error;
                
                // Actualizar la lista de grupos
                update(state => ({
                    ...state,
                    groups: state.groups.map(group => 
                        group.id === groupId ? { ...group, ...updates } : group
                    )
                }));
                
                return { data, error: null };
            } catch (error) {
                console.error('Error al actualizar grupo:', error);
                return { data: null, error };
            }
        },
        
        // Restablecer el estado
        reset: () => {
            const state = get({ subscribe });
            
            if (state.subscription) {
                state.subscription.unsubscribe();
            }
            
            set({
                groups: [],
                loading: false,
                error: null,
                subscription: null
            });
        }
    };
};

export const groupsStore = createGroupsStore();