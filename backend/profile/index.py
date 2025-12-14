import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Управление профилем пользователя
    """
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        headers = event.get('headers', {})
        user_id = headers.get('x-user-id') or headers.get('X-User-Id')
        
        if method == 'GET':
            cur.execute(
                "SELECT id, username, name, avatar, banner, is_premium, is_admin FROM users WHERE id = %s",
                (user_id,)
            )
            user = cur.fetchone()
            
            if user:
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
        
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'update_profile':
                name = body.get('name')
                username = body.get('username')
                avatar = body.get('avatar')
                banner = body.get('banner')
                
                cur.execute(
                    "UPDATE users SET name = %s, username = %s, avatar = COALESCE(%s, avatar), banner = COALESCE(%s, banner) WHERE id = %s",
                    (name, username, avatar, banner, user_id)
                )
                conn.commit()
                
                cur.execute(
                    "INSERT INTO activity_logs (user_id, action, details) VALUES (%s, %s, %s)",
                    (user_id, 'update_profile', 'Обновил профиль')
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
            
            elif action == 'buy_premium':
                cur.execute("UPDATE users SET is_premium = true WHERE id = %s", (user_id,))
                conn.commit()
                
                cur.execute(
                    "INSERT INTO activity_logs (user_id, action, details) VALUES (%s, %s, %s)",
                    (user_id, 'buy_premium', 'Купил Premium подписку')
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
            
            elif action == 'set_online_status':
                is_online = body.get('is_online')
                
                cur.execute("UPDATE users SET is_online = %s, last_seen = CURRENT_TIMESTAMP WHERE id = %s",
                           (is_online, user_id))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
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
