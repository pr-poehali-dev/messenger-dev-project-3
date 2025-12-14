import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

interface Message {
  id: number;
  text: string;
  sender: 'me' | 'other';
  time: string;
}

interface Chat {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}

interface User {
  name: string;
  username: string;
  avatar: string;
  banner: string;
  isPremium: boolean;
}

const Index = () => {
  const [selectedChat, setSelectedChat] = useState<number | null>(1);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'chats' | 'profile'>('chats');
  
  const [user, setUser] = useState<User>({
    name: 'Александр Петров',
    username: '@alexander',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    banner: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=200&fit=crop',
    isPremium: false,
  });

  const [chats, setChats] = useState<Chat[]>([
    {
      id: 1,
      name: 'Мария Иванова',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
      lastMessage: 'Привет! Как дела?',
      time: '14:23',
      unread: 2,
      online: true,
    },
    {
      id: 2,
      name: 'Дмитрий Смирнов',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dmitry',
      lastMessage: 'Встречаемся завтра?',
      time: '13:45',
      unread: 0,
      online: true,
    },
    {
      id: 3,
      name: 'Елена Соколова',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
      lastMessage: 'Спасибо за помощь!',
      time: 'вчера',
      unread: 0,
      online: false,
    },
  ]);

  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'Привет! Как дела?', sender: 'other', time: '14:20' },
    { id: 2, text: 'Привет! Всё отлично, спасибо!', sender: 'me', time: '14:21' },
    { id: 3, text: 'Что нового?', sender: 'other', time: '14:23' },
  ]);

  const handleSendMessage = () => {
    if (messageInput.trim() && selectedChat) {
      const newMessage: Message = {
        id: messages.length + 1,
        text: messageInput,
        sender: 'me',
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...messages, newMessage]);
      setMessageInput('');
      
      setChats(chats.map(chat => 
        chat.id === selectedChat 
          ? { ...chat, lastMessage: messageInput, time: 'сейчас' }
          : chat
      ));
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentChat = chats.find(chat => chat.id === selectedChat);

  return (
    <div className="flex h-screen bg-background">
      <div className="w-80 border-r border-border flex flex-col bg-white">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">Чаты</h1>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setCurrentView('profile')}
              >
                <Icon name="User" size={20} />
              </Button>
              <Button variant="ghost" size="icon">
                <Icon name="Settings" size={20} />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Поиск чатов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
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
                    {chat.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {chat.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{chat.time}</span>
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
                <Button variant="ghost" size="icon">
                  <Icon name="Phone" size={20} />
                </Button>
                <Button variant="ghost" size="icon">
                  <Icon name="Video" size={20} />
                </Button>
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
                <img src={user.banner} alt="Banner" className="w-full h-full object-cover" />
              </div>
              <div className="px-6 pb-6">
                <div className="flex items-end gap-4 -mt-16 mb-6">
                  <Avatar className="w-32 h-32 border-4 border-white">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-3xl">{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 mb-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
                      {user.isPremium && (
                        <Badge className="bg-amber-500 text-white">
                          <Icon name="Crown" size={14} className="mr-1" />
                          Premium
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">{user.username}</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Icon name="Edit" size={16} className="mr-2" />
                        Редактировать
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Редактировать профиль</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Имя</Label>
                          <Input
                            id="name"
                            value={user.name}
                            onChange={(e) => setUser({ ...user, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="username">Имя пользователя</Label>
                          <Input
                            id="username"
                            value={user.username}
                            onChange={(e) => setUser({ ...user, username: e.target.value })}
                          />
                        </div>
                        <Button className="w-full">Сохранить</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Icon name="Crown" size={20} className="text-amber-500" />
                      Premium подписка
                    </h3>
                    {user.isPremium ? (
                      <p className="text-sm text-muted-foreground">Активна до 01.01.2025</p>
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Получите эксклюзивные функции и преимущества
                        </p>
                        <Button 
                          className="bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={() => setUser({ ...user, isPremium: true })}
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
                      <p className="text-2xl font-bold text-foreground">0</p>
                      <p className="text-sm text-muted-foreground">Групп</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-4 text-center">
                      <Icon name="Phone" size={24} className="mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold text-foreground">12</p>
                      <p className="text-sm text-muted-foreground">Звонков</p>
                    </div>
                  </div>
                </div>
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
    </div>
  );
};

export default Index;
