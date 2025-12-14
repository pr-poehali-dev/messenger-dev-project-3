import { useState, useEffect } from 'react';
import AuthScreen from '@/components/AuthScreen';
import VideoCall from '@/components/VideoCall';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Icon from '@/components/ui/icon';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Message {
  id: number;
  text: string;
  sender: 'me' | 'other';
  senderId: number;
  time: string;
}

interface Chat {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string | null;
  unread: number;
  online: boolean;
  isPinned: boolean;
  isGroup: boolean;
  userId?: number;
}

interface User {
  id: number;
  name: string;
  username: string;
  avatar: string;
  banner?: string;
  isPremium: boolean;
  isAdmin: boolean;
}

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'chats' | 'profile' | 'admin'>('chats');
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [activeCall, setActiveCall] = useState<{ 
    active: boolean; 
    type?: 'audio' | 'video'; 
    isIncoming?: boolean;
    callerId?: number;
    callerName?: string;
    callerAvatar?: string;
  } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      loadChats(user.id);
      api.profile.setOnlineStatus(user.id, true);
    }
  }, []);

  const loadChats = async (userId: string) => {
    try {
      const chatsData = await api.messages.getChats(userId);
      setChats(chatsData);
    } catch (error) {
      toast.error('Ошибка загрузки чатов');
    }
  };

  const loadMessages = async (chatId: number) => {
    if (!currentUser) return;
    try {
      const messagesData = await api.messages.getMessages(currentUser.id.toString(), chatId.toString());
      setMessages(messagesData);
    } catch (error) {
      toast.error('Ошибка загрузки сообщений');
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || !currentUser) return;
    
    try {
      await api.messages.sendMessage(currentUser.id.toString(), selectedChat.toString(), messageInput);
      setMessageInput('');
      await loadMessages(selectedChat);
      await loadChats(currentUser.id.toString());
      toast.success('Сообщение отправлено');
    } catch (error) {
      toast.error('Ошибка отправки');
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!currentUser || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const results = await api.messages.searchUsers(currentUser.id.toString(), query);
      setSearchResults(results);
    } catch (error) {
      toast.error('Ошибка поиска');
    }
  };

  const handleCreateChat = async (otherUserId: string) => {
    if (!currentUser) return;
    
    try {
      const result = await api.messages.createChat(currentUser.id.toString(), otherUserId);
      setIsSearchOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      await loadChats(currentUser.id.toString());
      setSelectedChat(result.chat_id);
      await loadMessages(result.chat_id);
      toast.success('Чат создан');
    } catch (error) {
      toast.error('Ошибка создания чата');
    }
  };

  const handleCreateGroup = async () => {
    if (!currentUser || !groupName.trim()) {
      toast.error('Введите название группы');
      return;
    }
    
    try {
      await api.messages.createGroup(currentUser.id.toString(), groupName, []);
      setIsGroupDialogOpen(false);
      setGroupName('');
      await loadChats(currentUser.id.toString());
      toast.success('Группа создана');
    } catch (error) {
      toast.error('Ошибка создания группы');
    }
  };

  const handlePinChat = async (chatId: number, isPinned: boolean) => {
    if (!currentUser) return;
    
    try {
      await api.messages.pinChat(currentUser.id.toString(), chatId.toString(), !isPinned);
      await loadChats(currentUser.id.toString());
      toast.success(isPinned ? 'Чат откреплён' : 'Чат закреплён');
    } catch (error) {
      toast.error('Ошибка');
    }
  };

  const handleClearChat = async (chatId: number) => {
    if (!currentUser) return;
    
    try {
      await api.messages.clearChat(currentUser.id.toString(), chatId.toString());
      await loadMessages(chatId);
      toast.success('Чат очищен');
    } catch (error) {
      toast.error('Ошибка очистки');
    }
  };

  const handleCall = async (type: 'audio' | 'video') => {
    if (!currentUser || !selectedChat) return;
    
    const currentChat = chats.find(c => c.id === selectedChat);
    if (!currentChat || currentChat.isGroup) return;
    
    try {
      await api.calls.initiateCall(
        currentUser.id.toString(), 
        currentChat.userId?.toString() || '', 
        type, 
        {}
      );
      
      setActiveCall({
        active: true,
        type,
        isIncoming: false,
        callerName: currentChat.name,
        callerAvatar: currentChat.avatar
      });
    } catch (error) {
      toast.error('Ошибка инициализации звонка');
    }
  };

  const handleEndCall = async () => {
    if (!currentUser || !activeCall) return;
    
    try {
      await api.calls.endCall(currentUser.id.toString(), '1', 0);
      setActiveCall(null);
      toast.success('Звонок завершён');
    } catch (error) {
      toast.error('Ошибка завершения звонка');
    }
  };

  const handleAcceptCall = async () => {
    if (!currentUser || !activeCall) return;
    
    try {
      await api.calls.answerCall(currentUser.id.toString(), '1', {});
      toast.success('Звонок принят');
    } catch (error) {
      toast.error('Ошибка принятия звонка');
    }
  };

  const handleRejectCall = async () => {
    if (!currentUser || !activeCall) return;
    
    try {
      await api.calls.rejectCall(currentUser.id.toString(), '1');
      setActiveCall(null);
      toast.success('Звонок отклонён');
    } catch (error) {
      toast.error('Ошибка отклонения звонка');
    }
  };

  const handleBuyPremium = async () => {
    if (!currentUser) return;
    
    try {
      await api.profile.buyPremium(currentUser.id.toString());
      const updatedUser = { ...currentUser, isPremium: true };
      setCurrentUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      toast.success('Premium активирован!');
    } catch (error) {
      toast.error('Ошибка покупки');
    }
  };

  const loadAdminData = async () => {
    if (!currentUser || !currentUser.isAdmin) return;
    
    try {
      const stats = await api.admin.getStats(currentUser.id.toString());
      const logs = await api.admin.getLogs(currentUser.id.toString(), 50);
      setAdminStats(stats);
      setAdminLogs(logs);
    } catch (error) {
      toast.error('Ошибка загрузки данных');
    }
  };

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat);
    }
  }, [selectedChat]);

  useEffect(() => {
    if (currentView === 'admin' && currentUser?.isAdmin) {
      loadAdminData();
    }
  }, [currentView]);

  if (!currentUser) {
    return <AuthScreen onLogin={(user) => setCurrentUser(user)} />;
  }

  const currentChat = chats.find(chat => chat.id === selectedChat);

  return (
    <div className="flex h-screen bg-background">
      <div className="w-80 border-r border-border flex flex-col bg-white">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">Чаты</h1>
            <div className="flex gap-2">
              <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Icon name="UserPlus" size={20} />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Найти пользователя</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Введите имя или @username"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                    <ScrollArea className="h-64">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleCreateChat(user.id)}
                          className="w-full p-3 hover:bg-secondary rounded-lg flex items-center gap-3"
                        >
                          <Avatar>
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="font-semibold">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.username}</p>
                          </div>
                          {user.online && <Badge className="ml-auto">онлайн</Badge>}
                        </button>
                      ))}
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Icon name="Users" size={20} />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Создать группу</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Название группы</Label>
                      <Input
                        placeholder="Моя группа"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateGroup}>Создать</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setCurrentView('profile')}
              >
                <Icon name="User" size={20} />
              </Button>
              
              {currentUser.isAdmin && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setCurrentView('admin')}
                >
                  <Icon name="Shield" size={20} />
                </Button>
              )}
            </div>
          </div>
          <div className="relative">
            <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Поиск чатов..."
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {chats.map((chat) => (
              <div key={chat.id} className="relative group">
                <button
                  onClick={() => {
                    setSelectedChat(chat.id);
                    setCurrentView('chats');
                  }}
                  className={`w-full p-3 rounded-lg hover:bg-secondary/80 transition-colors mb-1 text-left ${
                    selectedChat === chat.id ? 'bg-secondary' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={chat.avatar} />
                        <AvatarFallback>{chat.name[0]}</AvatarFallback>
                      </Avatar>
                      {chat.online && !chat.isGroup && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {chat.name}
                          </span>
                          {chat.isPinned && <Icon name="Pin" size={12} className="text-primary" />}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                        {chat.unread > 0 && (
                          <Badge className="ml-2 bg-primary text-primary-foreground">
                            {chat.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"
                    >
                      <Icon name="MoreVertical" size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handlePinChat(chat.id, chat.isPinned)}>
                      <Icon name="Pin" size={16} className="mr-2" />
                      {chat.isPinned ? 'Открепить' : 'Закрепить'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleClearChat(chat.id)}>
                      <Icon name="Trash2" size={16} className="mr-2" />
                      Очистить чат
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {currentView === 'chats' && selectedChat && currentChat ? (
          <>
            <div className="p-4 border-b border-border bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={currentChat.avatar} />
                  <AvatarFallback>{currentChat.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold text-foreground">{currentChat.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {currentChat.online ? 'в сети' : 'не в сети'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!currentChat.isGroup && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleCall('audio')}>
                      <Icon name="Phone" size={20} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleCall('video')}>
                      <Icon name="Video" size={20} />
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="icon">
                  <Icon name="MoreVertical" size={20} />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4 bg-secondary/30">
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        message.sender === 'me'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-white text-foreground border border-border'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {message.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border bg-white">
              <div className="flex gap-2 max-w-4xl mx-auto">
                <Button variant="ghost" size="icon">
                  <Icon name="Paperclip" size={20} />
                </Button>
                <Input
                  placeholder="Введите сообщение..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} size="icon">
                  <Icon name="Send" size={20} />
                </Button>
              </div>
            </div>
          </>
        ) : currentView === 'profile' ? (
          <div className="flex-1 overflow-auto bg-secondary/30">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm m-4">
              <div className="relative h-48 bg-gradient-to-r from-primary/80 to-primary rounded-t-lg overflow-hidden">
                {currentUser.banner && (
                  <img src={currentUser.banner} alt="Banner" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="px-6 pb-6">
                <div className="flex items-end gap-4 -mt-16 mb-6">
                  <Avatar className="w-32 h-32 border-4 border-white">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback className="text-3xl">{currentUser.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 mb-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-foreground">{currentUser.name}</h2>
                      {currentUser.isPremium && (
                        <Badge className="bg-amber-500 text-white">
                          <Icon name="Crown" size={14} className="mr-1" />
                          Premium
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">{currentUser.username}</p>
                  </div>
                  <Button onClick={() => setCurrentView('chats')}>
                    <Icon name="ArrowLeft" size={16} className="mr-2" />
                    К чатам
                  </Button>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Icon name="Crown" size={20} className="text-amber-500" />
                      Premium подписка
                    </h3>
                    {currentUser.isPremium ? (
                      <p className="text-sm text-muted-foreground">Активна</p>
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Получите эксклюзивные функции и преимущества
                        </p>
                        <Button 
                          className="bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={handleBuyPremium}
                        >
                          Купить Premium
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-secondary/50 rounded-lg p-4 text-center">
                      <Icon name="MessageCircle" size={24} className="mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold text-foreground">{chats.length}</p>
                      <p className="text-sm text-muted-foreground">Чатов</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-4 text-center">
                      <Icon name="Users" size={24} className="mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold text-foreground">{chats.filter(c => c.isGroup).length}</p>
                      <p className="text-sm text-muted-foreground">Групп</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-4 text-center">
                      <Icon name="Phone" size={24} className="mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold text-foreground">0</p>
                      <p className="text-sm text-muted-foreground">Звонков</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'admin' && currentUser.isAdmin ? (
          <div className="flex-1 overflow-auto bg-secondary/30 p-4">
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Админ-панель</h1>
                <Button onClick={() => setCurrentView('chats')} variant="outline">
                  <Icon name="ArrowLeft" size={16} className="mr-2" />
                  К чатам
                </Button>
              </div>

              {adminStats && (
                <div className="grid grid-cols-5 gap-4">
                  <div className="bg-white p-6 rounded-lg">
                    <Icon name="Users" size={32} className="text-primary mb-2" />
                    <p className="text-3xl font-bold">{adminStats.totalUsers}</p>
                    <p className="text-muted-foreground">Всего пользователей</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg">
                    <Icon name="UserCheck" size={32} className="text-green-500 mb-2" />
                    <p className="text-3xl font-bold">{adminStats.onlineUsers}</p>
                    <p className="text-muted-foreground">Онлайн</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg">
                    <Icon name="MessageCircle" size={32} className="text-blue-500 mb-2" />
                    <p className="text-3xl font-bold">{adminStats.totalMessages}</p>
                    <p className="text-muted-foreground">Сообщений</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg">
                    <Icon name="Phone" size={32} className="text-purple-500 mb-2" />
                    <p className="text-3xl font-bold">{adminStats.totalCalls}</p>
                    <p className="text-muted-foreground">Звонков</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg">
                    <Icon name="Users" size={32} className="text-amber-500 mb-2" />
                    <p className="text-3xl font-bold">{adminStats.totalGroups}</p>
                    <p className="text-muted-foreground">Групп</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Логи активности</h2>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {adminLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{log.userName} (@{log.username})</p>
                            <p className="text-sm text-muted-foreground">{log.details}</p>
                          </div>
                          <Badge variant="outline">{log.action}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.timestamp).toLocaleString('ru-RU')}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-secondary/30">
            <div className="text-center">
              <Icon name="MessageCircle" size={64} className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Выберите чат
              </h3>
              <p className="text-muted-foreground">
                Выберите чат из списка слева, чтобы начать общение
              </p>
            </div>
          </div>
        )}
      </div>

      {activeCall && activeCall.active && (
        <VideoCall
          isIncoming={activeCall.isIncoming}
          callerName={activeCall.callerName}
          callerAvatar={activeCall.callerAvatar}
          callType={activeCall.type || 'audio'}
          onEnd={handleEndCall}
          onAccept={activeCall.isIncoming ? handleAcceptCall : undefined}
          onReject={activeCall.isIncoming ? handleRejectCall : undefined}
        />
      )}
    </div>
  );
};

export default Index;