import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Обрабатывает регистрацию и авторизацию пользователей
    """
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'register':
                username = body.get('username')
                name = body.get('name')
                
                cur.execute(
                    "INSERT INTO users (username, name, avatar, is_online) VALUES (%s, %s, %s, true) RETURNING id, username, name, avatar, is_premium",
                    (username, name, f'https://api.dicebear.com/7.x/avataaars/svg?seed={username}')
                )
                user = cur.fetchone()
                conn.commit()
                
                cur.execute(
                    "INSERT INTO activity_logs (user_id, action, details) VALUES (%s, %s, %s)",
                    (user[0], 'register', f'Пользователь {username} зарегистрировался')
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'id': user[0],
                        'username': user[1],
                        'name': user[2],
                        'avatar': user[3],
                        'isPremium': user[4]
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'login':
                username = body.get('username')
                
                cur.execute(
                    "SELECT id, username, name, avatar, banner, is_premium, is_admin FROM users WHERE username = %s",
                    (username,)
                )
                user = cur.fetchone()
                
                if user:
                    cur.execute("UPDATE users SET is_online = true WHERE id = %s", (user[0],))
                    conn.commit()
                    
                    cur.execute(
                        "INSERT INTO activity_logs (user_id, action, details) VALUES (%s, %s, %s)",
                        (user[0], 'login', f'Пользователь {username} вошёл в систему')
                    )
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({
                            'id': user[0],
                            'username': user[1],
                            'name': user[2],
                            'avatar': user[3],
                            'banner': user[4],
                            'isPremium': user[5],
                            'isAdmin': user[6]
                        }),
                        'isBase64Encoded': False
                    }
                else:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Пользователь не найден'}),
                        'isBase64Encoded': False
                    }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()
