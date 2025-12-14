import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';

interface AuthScreenProps {
  onLogin: (user: any) => void;
}

const AuthScreen = ({ onLogin }: AuthScreenProps) => {
  const [loginUsername, setLoginUsername] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!loginUsername.trim()) {
      toast.error('Введите имя пользователя');
      return;
    }
    
    setIsLoading(true);
    try {
      const user = await api.auth.login(loginUsername);
      if (user.error) {
        toast.error(user.error);
      } else {
        toast.success('Добро пожаловать!');
        onLogin(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
    } catch (error) {
      toast.error('Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerUsername.trim() || !registerName.trim()) {
      toast.error('Заполните все поля');
      return;
    }
    
    setIsLoading(true);
    try {
      const user = await api.auth.register(registerUsername, registerName);
      if (user.error) {
        toast.error(user.error);
      } else {
        toast.success('Регистрация успешна!');
        onLogin(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
    } catch (error) {
      toast.error('Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon name="MessageCircle" size={32} className="text-white" />
          </div>
          <CardTitle className="text-2xl">Добро пожаловать</CardTitle>
          <CardDescription>Войдите или создайте аккаунт</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-username">Имя пользователя</Label>
                <Input
                  id="login-username"
                  placeholder="@username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <Button onClick={handleLogin} className="w-full" disabled={isLoading}>
                {isLoading ? 'Загрузка...' : 'Войти'}
              </Button>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-username">Имя пользователя</Label>
                <Input
                  id="register-username"
                  placeholder="@username"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-name">Полное имя</Label>
                <Input
                  id="register-name"
                  placeholder="Иван Иванов"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                />
              </div>
              <Button onClick={handleRegister} className="w-full" disabled={isLoading}>
                {isLoading ? 'Загрузка...' : 'Зарегистрироваться'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthScreen;
