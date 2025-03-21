import { supabase } from './supabase';

// Enviar mensaje a un usuario o grupo
export const sendMessage = async (senderId, content, recipientId = null, groupId = null) => {
    try {
        const messageData = {
            sender_id: senderId,
            content,
            created_at: new Date(),
            read: false
        };
        
        if (recipientId) {
            messageData.recipient_id = recipientId;
        }
        
        if (groupId) {
            messageData.group_id = groupId;
        }
        
        const { data, error } = await supabase
            .from('messages')
            .insert(messageData)
            .select()
            .single();
            
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        return { data: null, error };
    }
};

// Obtener mensajes de un chat directo
export const getDirectMessages = async (userId1, userId2) => {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select(`
                id,
                sender_id,
                recipient_id,
                content,
                created_at,
                read,
                sender:sender_id(id, username, avatar_url)
            `)
            .or(`and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`)
            .is('group_id', null)
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al obtener mensajes directos:', error);
        return { data: [], error };
    }
};

// Obtener mensajes de un grupo
export const getGroupMessages = async (groupId) => {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select(`
                id,
                sender_id,
                group_id,
                content,
                created_at,
                sender:sender_id(id, username, avatar_url)
            `)
            .eq('group_id', groupId)
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al obtener mensajes del grupo:', error);
        return { data: [], error };
    }
};

// Marcar mensajes como leídos
export const markMessagesAsRead = async (recipientId, senderId) => {
    try {
        const { data, error } = await supabase
            .from('messages')
            .update({ read: true })
            .eq('recipient_id', recipientId)
            .eq('sender_id', senderId)
            .eq('read', false);
            
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al marcar mensajes como leídos:', error);
        return { data: null, error };
    }
};

// Actualizar estado de escritura
export const updateTypingStatus = async (userId, recipientId = null, groupId = null) => {
    try {
        const typingData = {
            user_id: userId,
            updated_at: new Date()
        };
        
        if (recipientId) {
            typingData.recipient_id = recipientId;
        }
        
        if (groupId) {
            typingData.group_id = groupId;
        }
        
        const { data, error } = await supabase
            .from('typing_status')
            .upsert(typingData)
            .select()
            .single();
            
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al actualizar estado de escritura:', error);
        return { data: null, error };
    }
};

// Eliminar estado de escritura
export const clearTypingStatus = async (userId, recipientId = null, groupId = null) => {
    try {
        let query = supabase
            .from('typing_status')
            .delete()
            .eq('user_id', userId);
            
        if (recipientId) {
            query = query.eq('recipient_id', recipientId);
        }
        
        if (groupId) {
            query = query.eq('group_id', groupId);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error al eliminar estado de escritura:', error);
        return { data: null, error };
    }
};

// Obtener conversaciones recientes
export const getRecentConversations = async (userId) => {
    try {
        // Obtener últimos mensajes para cada conversación directa
        const { data: directMessages, error: directError } = await supabase.rpc(
            'get_latest_direct_messages',
            { user_id_param: userId }
        );
        
        if (directError) throw directError;
        
        // Obtener últimos mensajes para cada grupo
        const { data: groupMessages, error: groupError } = await supabase.rpc(
            'get_latest_group_messages',
            { user_id_param: userId }
        );
        
        if (groupError) throw groupError;
        
        // Combinar y ordenar por fecha de último mensaje
        const conversations = [
            ...directMessages.map(msg => ({ ...msg, type: 'direct' })),
            ...groupMessages.map(msg => ({ ...msg, type: 'group' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        return { data: conversations, error: null };
    } catch (error) {
        console.error('Error al obtener conversaciones recientes:', error);
        return { data: [], error };
    }
};

// Nota: Para que las funciones get_latest_direct_messages y get_latest_group_messages funcionen,
// deberás crear estas funciones en Supabase:

/*
-- Función para obtener los últimos mensajes de chats directos
CREATE OR REPLACE FUNCTION get_latest_direct_messages(user_id_param UUID)
RETURNS TABLE (
    conversation_id UUID,
    other_user_id UUID,
    username TEXT,
    avatar_url TEXT,
    content TEXT,
    created_at TIMESTAMPTZ,
    unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_messages AS (
        SELECT DISTINCT ON (
            CASE
                WHEN sender_id = user_id_param THEN recipient_id
                ELSE sender_id
            END
        )
            CASE
                WHEN sender_id = user_id_param THEN recipient_id
                ELSE sender_id
            END as other_id,
            id,
            content,
            created_at,
            sender_id,
            recipient_id
        FROM messages
        WHERE (sender_id = user_id_param OR recipient_id = user_id_param)
        AND group_id IS NULL
        ORDER BY other_id, created_at DESC
    ),
    unread_counts AS (
        SELECT 
            sender_id,
            COUNT(*) as count
        FROM messages
        WHERE recipient_id = user_id_param
        AND read = false
        AND group_id IS NULL
        GROUP BY sender_id
    )
    SELECT
        m.id as conversation_id,
        m.other_id as other_user_id,
        u.username,
        u.avatar_url,
        m.content,
        m.created_at,
        COALESCE(uc.count, 0) as unread_count
    FROM latest_messages m
    JOIN users u ON u.id = m.other_id
    LEFT JOIN unread_counts uc ON uc.sender_id = m.other_id
    ORDER BY m.created_at DESC;
END;
$ LANGUAGE plpgsql;

-- Función para obtener los últimos mensajes de grupos
CREATE OR REPLACE FUNCTION get_latest_group_messages(user_id_param UUID)
RETURNS TABLE (
    conversation_id UUID,
    group_id UUID,
    name TEXT,
    description TEXT,
    content TEXT,
    created_at TIMESTAMPTZ,
    unread_count BIGINT
) AS $
BEGIN
    RETURN QUERY
    WITH user_groups AS (
        SELECT gm.group_id
        FROM group_members gm
        WHERE gm.user_id = user_id_param
    ),
    latest_messages AS (
        SELECT DISTINCT ON (m.group_id)
            m.id,
            m.group_id,
            m.content,
            m.created_at,
            m.sender_id
        FROM messages m
        JOIN user_groups ug ON ug.group_id = m.group_id
        WHERE m.group_id IS NOT NULL
        ORDER BY m.group_id, m.created_at DESC
    ),
    unread_counts AS (
        SELECT 
            m.group_id,
            COUNT(*) as count
        FROM messages m
        JOIN user_groups ug ON ug.group_id = m.group_id
        WHERE m.sender_id != user_id_param
        AND m.created_at > (
            SELECT COALESCE(MAX(last_read_at), '1970-01-01'::timestamptz)
            FROM group_message_reads
            WHERE user_id = user_id_param
            AND group_id = m.group_id
        )
        GROUP BY m.group_id
    )
    SELECT
        m.id as conversation_id,
        m.group_id,
        g.name,
        g.description,
        m.content,
        m.created_at,
        COALESCE(uc.count, 0) as unread_count
    FROM latest_messages m
    JOIN groups g ON g.id = m.group_id
    LEFT JOIN unread_counts uc ON uc.group_id = m.group_id
    ORDER BY m.created_at DESC;
END;
$ LANGUAGE plpgsql;
*/