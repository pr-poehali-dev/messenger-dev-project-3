const API_URLS = {
  auth: 'https://functions.poehali.dev/4ebb6b1b-78c8-4f27-9e3c-6819dc28b961',
  messages: 'https://functions.poehali.dev/9a87ab4a-cbfe-4b57-872b-239691aa0b05',
  calls: 'https://functions.poehali.dev/2809cb95-de31-4f1f-978b-97297e741a0e',
  profile: 'https://functions.poehali.dev/0b32999c-d0ea-4e21-a63c-d8098680abf0',
  admin: 'https://functions.poehali.dev/afa32274-36d3-4487-9374-8bed85dd4066',
};

export const api = {
  auth: {
    register: async (username: string, name: string) => {
      const response = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', username, name }),
      });
      return response.json();
    },
    login: async (username: string) => {
      const response = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username }),
      });
      return response.json();
    },
  },
  
  messages: {
    getChats: async (userId: string) => {
      const response = await fetch(`${API_URLS.messages}?action=chats`, {
        headers: { 'X-User-Id': userId },
      });
      return response.json();
    },
    getMessages: async (userId: string, chatId: string) => {
      const response = await fetch(`${API_URLS.messages}?action=messages&chat_id=${chatId}`, {
        headers: { 'X-User-Id': userId },
      });
      return response.json();
    },
    sendMessage: async (userId: string, chatId: string, text: string) => {
      const response = await fetch(API_URLS.messages, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ action: 'send_message', chat_id: chatId, text }),
      });
      return response.json();
    },
    searchUsers: async (userId: string, query: string) => {
      const response = await fetch(`${API_URLS.messages}?action=search_users&query=${encodeURIComponent(query)}`, {
        headers: { 'X-User-Id': userId },
      });
      return response.json();
    },
    createChat: async (userId: string, otherUserId: string) => {
      const response = await fetch(API_URLS.messages, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ action: 'create_chat', user_id: otherUserId }),
      });
      return response.json();
    },
    createGroup: async (userId: string, name: string, memberIds: string[]) => {
      const response = await fetch(API_URLS.messages, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ action: 'create_group', name, member_ids: memberIds }),
      });
      return response.json();
    },
    pinChat: async (userId: string, chatId: string, isPinned: boolean) => {
      const response = await fetch(API_URLS.messages, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ action: 'pin_chat', chat_id: chatId, is_pinned: isPinned }),
      });
      return response.json();
    },
    clearChat: async (userId: string, chatId: string) => {
      const response = await fetch(API_URLS.messages, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ action: 'clear_chat', chat_id: chatId }),
      });
      return response.json();
    },
  },
  
  calls: {
    initiateCall: async (userId: string, receiverId: string, callType: 'audio' | 'video', offer: any) => {
      const response = await fetch(API_URLS.calls, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ action: 'initiate_call', receiver_id: receiverId, call_type: callType, offer }),
      });
      return response.json();
    },
    answerCall: async (userId: string, callId: string, answer: any) => {
      const response = await fetch(API_URLS.calls, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ action: 'answer_call', call_id: callId, answer }),
      });
      return response.json();
    },
    endCall: async (userId: string, callId: string, duration: number) => {
      const response = await fetch(API_URLS.calls, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ action: 'end_call', call_id: callId, duration }),
      });
      return response.json();
    },
    rejectCall: async (userId: string, callId: string) => {
      const response = await fetch(API_URLS.calls, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ action: 'reject_call', call_id: callId }),
      });
      return response.json();
    },
    getCallHistory: async (userId: string) => {
      const response = await fetch(`${API_URLS.calls}?action=call_history`, {
        headers: { 'X-User-Id': userId },
      });
      return response.json();
    },
  },
  
  profile: {
    getProfile: async (userId: string) => {
      const response = await fetch(API_URLS.profile, {
        headers: { 'X-User-Id': userId },
      });
      return response.json();
    },
    updateProfile: async (userId: string, data: { name: string; username: string; avatar?: string; banner?: string }) => {
      const response = await fetch(API_URLS.profile, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ action: 'update_profile', ...data }),
      });
      return response.json();
    },
    buyPremium: async (userId: string) => {
      const response = await fetch(API_URLS.profile, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ action: 'buy_premium' }),
      });
      return response.json();
    },
    setOnlineStatus: async (userId: string, isOnline: boolean) => {
      const response = await fetch(API_URLS.profile, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ action: 'set_online_status', is_online: isOnline }),
      });
      return response.json();
    },
  },
  
  admin: {
    getLogs: async (userId: string, limit: number = 100) => {
      const response = await fetch(`${API_URLS.admin}?action=logs&limit=${limit}`, {
        headers: { 'X-User-Id': userId },
      });
      return response.json();
    },
    getStats: async (userId: string) => {
      const response = await fetch(`${API_URLS.admin}?action=stats`, {
        headers: { 'X-User-Id': userId },
      });
      return response.json();
    },
    getUserActivity: async (userId: string, targetUserId: string) => {
      const response = await fetch(`${API_URLS.admin}?action=user_activity&user_id=${targetUserId}`, {
        headers: { 'X-User-Id': userId },
      });
      return response.json();
    },
  },
};
