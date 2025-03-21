import { supabase } from './supabase';

// Obtener grupos a los que pertenece un usuario
export const getUserGroups = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('group_members')
            .select(`
                id,
                role,
                groups:group_id(
                    id,
                    name,
                    description,
                    created_at,
                    creator_id
                )
            `)
            .eq('user_id', userId);
            
        if (error) throw error;
        
        // Transformar datos para obtener la lista de grupos
        const groupsList = data.map(membership => ({
            id: membership.groups.id,
            name: membership.groups.name,
            description: membership.groups.description,
            created_at: membership.groups.created_at,
            isCreator: membership.groups.creator_id === userId,
            role: membership.role,
            membershipId: membership.id
        }));
        
        return { data: groupsList, error: null };
    } catch (error) {
        console.error('Error al obtener grupos del usuario:', error);
        return { data: [], error };
    }
};

// Obtener información de un grupo específico
export const getGroupInfo = async (groupId) => {
    try {
        const { data, error } = await supabase
            .from('groups')
            .select(`
                id,
                name,
                description,
                created_at,
                creator_id,
                creator:creator_id(username, avatar_url)
            `)
            .eq('id', groupId)
            .single();
            
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al obtener información del grupo:', error);
        return { data: null, error };
    }
};

// Obtener miembros de un grupo
export const getGroupMembers = async (groupId) => {
    try {
        const { data, error } = await supabase
            .from('group_members')
            .select(`
                id,
                user_id,
                role,
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
            userId: member.users.id,
            username: member.users.username,
            avatar_url: member.users.avatar_url,
            status: member.users.status,
            role: member.role,
            joined_at: member.joined_at
        }));
        
        return { data: membersList, error: null };
    } catch (error) {
        console.error('Error al obtener miembros del grupo:', error);
        return { data: [], error };
    }
};

// Crear un nuevo grupo
export const createGroup = async (userId, name, description = '') => {
    try {
        // Crear el grupo
        const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .insert({
                name,
                description,
                creator_id: userId
            })
            .select()
            .single();
            
        if (groupError) throw groupError;
        
        // Añadir al creador como miembro del grupo
        const { data: memberData, error: memberError } = await supabase
            .from('group_members')
            .insert({
                group_id: groupData.id,
                user_id: userId,
                role: 'admin'
            })
            .select()
            .single();
            
        if (memberError) throw memberError;
        
        return { data: groupData, error: null };
    } catch (error) {
        console.error('Error al crear grupo:', error);
        return { data: null, error };
    }
};

// Actualizar información de un grupo
export const updateGroup = async (groupId, updates, userId) => {
    try {
        // Verificar si el usuario es el creador o admin del grupo
        const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .select('creator_id')
            .eq('id', groupId)
            .single();
            
        if (groupError) throw groupError;
        
        // Si no es el creador, verificar si es un administrador
        if (groupData.creator_id !== userId) {
            const { data: memberData, error: memberError } = await supabase
                .from('group_members')
                .select('role')
                .eq('group_id', groupId)
                .eq('user_id', userId)
                .single();
                
            if (memberError) throw memberError;
            
            if (memberData.role !== 'admin') {
                return { 
                    data: null, 
                    error: { message: 'No tienes permisos para actualizar este grupo' } 
                };
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
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al actualizar grupo:', error);
        return { data: null, error };
    }
};

// Eliminar un grupo
export const deleteGroup = async (groupId, userId) => {
    try {
        // Verificar si el usuario es el creador del grupo
        const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .select('creator_id')
            .eq('id', groupId)
            .single();
            
        if (groupError) throw groupError;
        
        if (groupData.creator_id !== userId) {
            return { 
                data: null, 
                error: { message: 'Solo el creador puede eliminar el grupo' } 
            };
        }
        
        // Eliminar el grupo
        const { data, error } = await supabase
            .from('groups')
            .delete()
            .eq('id', groupId)
            .select()
            .single();
            
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al eliminar grupo:', error);
        return { data: null, error };
    }
};

// Añadir miembro a un grupo
export const addGroupMember = async (groupId, userId, role = 'member', addedBy) => {
    try {
        // Verificar si el usuario ya es miembro
        const { data: existingMember, error: checkError } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();
            
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = No se encontró
            throw checkError;
        }
        
        if (existingMember) {
            return { 
                data: null, 
                error: { message: 'El usuario ya es miembro del grupo' } 
            };
        }
        
        // Verificar que quien añade tenga permisos (admin o creador)
        if (addedBy) {
            const { data: memberPermission, error: permissionError } = await supabase
                .from('group_members')
                .select('role')
                .eq('group_id', groupId)
                .eq('user_id', addedBy)
                .single();
                
            if (permissionError) throw permissionError;
            
            if (memberPermission.role !== 'admin') {
                // Verificar si es el creador
                const { data: groupInfo, error: groupError } = await supabase
                    .from('groups')
                    .select('creator_id')
                    .eq('id', groupId)
                    .single();
                    
                if (groupError) throw groupError;
                
                if (groupInfo.creator_id !== addedBy) {
                    return { 
                        data: null, 
                        error: { message: 'No tienes permisos para añadir miembros' } 
                    };
                }
            }
        }
        
        // Añadir miembro
        const { data, error } = await supabase
            .from('group_members')
            .insert({
                group_id: groupId,
                user_id: userId,
                role
            })
            .select()
            .single();
            
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al añadir miembro al grupo:', error);
        return { data: null, error };
    }
};

// Eliminar miembro de un grupo
export const removeGroupMember = async (groupId, userId, removedBy) => {
    try {
        // Si se está eliminando a sí mismo (abandonar grupo)
        if (userId === removedBy) {
            const { data, error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', userId)
                .select()
                .single();
                
            if (error) throw error;
            
            return { data, error: null };
        }
        
        // Verificar que quien elimina tenga permisos (admin o creador)
        const { data: memberPermission, error: permissionError } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', removedBy)
            .single();
            
        if (permissionError) throw permissionError;
        
        const { data: groupInfo, error: groupError } = await supabase
            .from('groups')
            .select('creator_id')
            .eq('id', groupId)
            .single();
            
        if (groupError) throw groupError;
        
        const isCreator = groupInfo.creator_id === removedBy;
        const isAdmin = memberPermission.role === 'admin';
        
        if (!isCreator && !isAdmin) {
            return { 
                data: null, 
                error: { message: 'No tienes permisos para eliminar miembros' } 
            };
        }
        
        // Si intentan eliminar al creador y no son el propio creador
        if (groupInfo.creator_id === userId && !isCreator) {
            return { 
                data: null, 
                error: { message: 'No puedes eliminar al creador del grupo' } 
            };
        }
        
        // Eliminar miembro
        const { data, error } = await supabase
            .from('group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .select()
            .single();
            
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al eliminar miembro del grupo:', error);
        return { data: null, error };
    }
};

// Cambiar rol de un miembro
export const changeGroupMemberRole = async (groupId, userId, newRole, changedBy) => {
    try {
        // Verificar que quien cambia tenga permisos (creador)
        const { data: groupInfo, error: groupError } = await supabase
            .from('groups')
            .select('creator_id')
            .eq('id', groupId)
            .single();
            
        if (groupError) throw groupError;
        
        if (groupInfo.creator_id !== changedBy) {
            return { 
                data: null, 
                error: { message: 'Solo el creador puede cambiar roles' } 
            };
        }
        
        // No permitir cambiar el rol del creador
        if (groupInfo.creator_id === userId) {
            return { 
                data: null, 
                error: { message: 'No se puede cambiar el rol del creador' } 
            };
        }
        
        // Actualizar rol
        const { data, error } = await supabase
            .from('group_members')
            .update({ role: newRole })
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .select()
            .single();
            
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al cambiar rol:', error);
        return { data: null, error };
    }
};