import { writable, get } from 'svelte/store';
import { supabase } from '../services/supabase';
import { authStore } from './authStore';

const createChatStore = () => {
    const { subscribe, set, update } = writable({
        activeChat: null, // Puede ser un ID de usuario (chat directo) o un ID de grupo
        activeType: null, // 'direct' o 'group'
        messages: [],
        typingUsers: {},
        loading: false,
        error: null,
        messageSubscription: null,
        typingSubscription: null
    });

    // Limpiar suscripciones
    const cleanupSubscriptions = () => {
        const state = get({ subscribe });
        
        if (state.messageSubscription) {
            state.messageSubscription.unsubscribe();
        }
        
        if (state.typingSubscription) {
            state.typingSubscription.unsubscribe();
        }
        
        update(s => ({
            ...s,
            messageSubscription: null,
            typingSubscription: null
        }));
    };

    // Suscribirse a nuevos mensajes
    const subscribeToMessages = (chatId, chatType) => {
        const user = get(authStore).user;
        
        if (!user || !chatId || !chatType) return null;
        
        // Limpiar suscripción anterior
        cleanupSubscriptions();
        
        // Configurar filtro según el tipo de chat
        const filter = chatType === 'direct'
            ? `or(and(sender_id=eq.${user.id},recipient_id=eq.${chatId}),and(sender_id=eq.${chatId},recipient_id=eq.${user.id}))`
            : `group_id=eq.${chatId}`;
            
        // Crear canal de suscripción
        const channel = supabase
            .channel(`${chatType}-messages-${chatId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter
                },
                (payload) => {
                    // Obtener información del remitente
                    supabase
                        .from('users')
                        .select('id, username, avatar_url')
                        .eq('id', payload.new.sender_id)
                        .single()
                        .then(({ data: sender }) => {
                            const newMessage = {
                                ...payload.new,
                                sender
                            };
                            
                            update(state => ({
                                ...state,
                                messages: [...state.messages, newMessage]
                            }));
                        });
                }
            )
            .subscribe();
        
        update(state => ({
            ...state,
            messageSubscription: channel
        }));
        
        return channel;
    };

    // Suscribirse a eventos de escritura
    const subscribeToTyping = (chatId, chatType) => {
        const user = get(authStore).user;
        
        if (!user || !chatId || !chatType) return null;
        
        // Configurar filtro según el tipo de chat
        const filter = chatType === 'direct'
            ? `and(user_id=eq.${chatId},recipient_id=eq.${user.id})`
            : `and(group_id=eq.${chatId},user_id=neq.${user.id})`;
            
        // Crear canal de suscripción
        const channel = supabase
            .channel(`typing-${chatType}-${chatId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'typing_status',
                    filter
                },
                (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        // Alguien está escribiendo
                        update(state => ({
                            ...state,
                            typingUsers: {
                                ...state.typingUsers,
                                [payload.new.user_id]: {
                                    isTyping: true,
                                    timestamp: new Date(payload.new.updated_at)
                                }
                            }
                        }));
                        
                        // Después de 3 segundos sin actualización, consideramos que ya no está escribiendo
                        setTimeout(() => {
                            const currentState = get({ subscribe });
                            const typingInfo = currentState.typingUsers[payload.new.user_id];
                            
                            if (typingInfo && new Date() - new Date(typingInfo.timestamp) > 3000) {
                                update(state => ({
                                    ...state,
                                    typingUsers: {
                                        ...state.typingUsers,
                                        [payload.new.user_id]: {
                                            isTyping: false,
                                            timestamp: new Date()
                                        }
                                    }
                                }));
                            }
                        }, 3000);
                    } else if (payload.eventType === 'DELETE') {
                        // El usuario dejó de escribir
                        update(state => ({
                            ...state,
                            typingUsers: {
                                ...state.typingUsers,
                                [payload.old.user_id]: {
                                    isTyping: false,
                                    timestamp: new Date()
                                }
                            }
                        }));
                    }
                }
            )
            .subscribe();
        
        update(state => ({
            ...state,
            typingSubscription: channel
        }));
        
        return channel;
    };

    // Marcar mensajes como leídos
    const markMessagesAsRead = async (chatId, chatType) => {
        const user = get(authStore).user;
        
        if (!user || !chatId) return;
        
        try {
            if (chatType === 'direct') {
                // Marcar como leídos mensajes en chat directo
                await supabase
                    .from('messages')
                    .update({ read: true })
                    .eq('sender_id', chatId)
                    .eq('recipient_id', user.id)
                    .eq('read', false);
            } else if (chatType === 'group') {
                // Implementación para grupos (si es necesario)
                // Aquí podrías mantener una tabla de mensajes_leídos o similar
            }
        } catch (error) {
            console.error('Error al marcar mensajes como leídos:', error);
        }
    };

    // Cargar mensajes para un chat específico
    const loadMessages = async (chatId, chatType) => {
        const user = get(authStore).user;
        
        if (!user || !chatId || !chatType) return;
        
        update(state => ({ ...state, loading: true }));
        
        try {
            // Configurar consulta según el tipo de chat
            const filter = chatType === 'direct'
                ? `.or(\`and(sender_id.eq.${user.id},recipient_id.eq.${chatId}),and(sender_id.eq.${chatId},recipient_id.eq.${user.id})\`).is('group_id', null)`
                : `.eq('group_id', chatId)`;
                
            // Ejecutar consulta
            const { data, error } = await supabase
                .from('messages')
                .select(`
                    id,
                    sender_id,
                    recipient_id,
                    group_id,
                    content,
                    created_at,
                    sender:sender_id(id, username, avatar_url)
                `)
                .or(`and(sender_id.eq.${user.id},recipient_id.eq.${chatId}),and(sender_id.eq.${chatId},recipient_id.eq.${user.id})`)
                .is(chatType === 'direct' ? 'group_id' : null, null)
                .order('created_at', { ascending: true });
                
            if (error) throw error;
            
            update(state => ({
                ...state,
                messages: data,
                loading: false,
                activeChat: chatId,
                activeType: chatType
            }));
            
            // Suscribirse a nuevos mensajes
            subscribeToMessages(chatId, chatType);
            
            // Suscribirse a eventos de escritura
            subscribeToTyping(chatId, chatType);
            
            // Marcar como leídos los mensajes
            await markMessagesAsRead(chatId, chatType);
            
        } catch (error) {
            console.error('Error al cargar mensajes:', error);
            update(state => ({
                ...state,
                error: error.message,
                loading: false
            }));
        }
    };
    
    return {
        subscribe,
        loadMessages,
        cleanupSubscriptions,
        
        // Enviar mensaje
        sendMessage: async (content) => {
            const user = get(authStore).user;
            const state = get({ subscribe });
            const { activeChat, activeType } = state;
            
            if (!user || !activeChat || !content.trim()) {
                return { error: 'No se puede enviar el mensaje' };
            }
            
            try {
                const messageData = {
                    sender_id: user.id,
                    content,
                    created_at: new Date(),
                    read: false,
                    recipient_id: activeType === 'direct' ? activeChat : null,
                    group_id: activeType === 'group' ? activeChat : null
                };
                
                const { data, error } = await supabase
                    .from('messages')
                    .insert(messageData)
                    .select()
                    .single();
                    
                if (error) throw error;
                
                // Eliminar estado de escritura
                await supabase
                    .from('typing_status')
                    .delete()
                    .eq('user_id', user.id)
                    .eq(activeType === 'direct' ? 'recipient_id' : 'group_id', activeChat);
                
                return { data, error: null };
            } catch (error) {
                console.error('Error al enviar mensaje:', error);
                return { data: null, error };
            }
        },
        
        // Actualizar estado de escritura
        updateTypingStatus: async (isTyping) => {
            const user = get(authStore).user;
            const state = get({ subscribe });
            const { activeChat, activeType } = state;
            
            if (!user || !activeChat) return;
            
            try {
                if (isTyping) {
                    // Insertar o actualizar estado de escritura
                    const typingData = {
                        user_id: user.id,
                        updated_at: new Date(),
                        recipient_id: activeType === 'direct' ? activeChat : null,
                        group_id: activeType === 'group' ? activeChat : null
                    };
                    
                    const { error } = await supabase
                        .from('typing_status')
                        .upsert(typingData)
                        .select()
                        .single();
                        
                    if (error) throw error;
                } else {
                    // Eliminar estado de escritura
                    const { error } = await supabase
                        .from('typing_status')
                        .delete()
                        .eq('user_id', user.id)
                        .eq(activeType === 'direct' ? 'recipient_id' : 'group_id', activeChat);
                        
                    if (error) throw error;
                }
            } catch (error) {
                console.error('Error al actualizar estado de escritura:', error);
            }
        },
        
        // Cambiar chat activo
        setActiveChat: (chatId, chatType) => {
            if (!chatId || !chatType) return;
            
            // Limpiar estado anterior
            cleanupSubscriptions();
            
            update(state => ({
                ...state,
                activeChat: chatId,
                activeType: chatType,
                messages: [],
                loading: true
            }));
            
            // Cargar mensajes para el nuevo chat
            loadMessages(chatId, chatType);
        },
        
        // Cerrar chat activo
        closeActiveChat: () => {
            cleanupSubscriptions();
            
            update(state => ({
                ...state,
                activeChat: null,
                activeType: null,
                messages: [],
                typingUsers: {}
            }));
        },
        
        // Restablecer el estado
        reset: () => {
            cleanupSubscriptions();
            
            set({
                activeChat: null,
                activeType: null,
                messages: [],
                typingUsers: {},
                loading: false,
                error: null,
                messageSubscription: null,
                typingSubscription: null
            });
        }
    };
};

export const chatStore = createChatStore();