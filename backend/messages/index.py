import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Управление сообщениями и чатами
    """
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
            params = event.get('queryStringParameters', {})
            action = params.get('action')
            
            if action == 'chats':
                cur.execute("""
                    SELECT DISTINCT c.id, c.name, c.is_group, c.avatar, c.is_pinned,
                           u.id, u.name, u.username, u.avatar, u.is_online,
                           (SELECT text FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                           (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
                           (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND m.sender_id != %s 
                            AND m.created_at > COALESCE((SELECT last_seen FROM users WHERE id = %s), '1970-01-01')) as unread_count
                    FROM chats c
                    JOIN chat_members cm ON c.id = cm.chat_id
                    LEFT JOIN chat_members cm2 ON c.id = cm2.chat_id AND cm2.user_id != %s
                    LEFT JOIN users u ON cm2.user_id = u.id
                    WHERE cm.user_id = %s
                    ORDER BY c.is_pinned DESC, last_message_time DESC NULLS LAST
                """, (user_id, user_id, user_id, user_id))
                
                chats_data = cur.fetchall()
                chats = []
                for chat in chats_data:
                    chats.append({
                        'id': chat[0],
                        'name': chat[1] if chat[2] else chat[6],
                        'isGroup': chat[2],
                        'avatar': chat[3] if chat[2] else chat[8],
                        'isPinned': chat[4],
                        'userId': chat[5],
                        'username': chat[7],
                        'online': chat[9],
                        'lastMessage': chat[10] or '',
                        'lastMessageTime': chat[11].isoformat() if chat[11] else None,
                        'unread': chat[12]
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(chats),
                    'isBase64Encoded': False
                }
            
            elif action == 'messages':
                chat_id = params.get('chat_id')
                
                cur.execute("""
                    SELECT m.id, m.text, m.sender_id, m.created_at, u.name, u.avatar
                    FROM messages m
                    JOIN users u ON m.sender_id = u.id
                    WHERE m.chat_id = %s
                    ORDER BY m.created_at ASC
                """, (chat_id,))
                
                messages_data = cur.fetchall()
                messages = []
                for msg in messages_data:
                    messages.append({
                        'id': msg[0],
                        'text': msg[1],
                        'senderId': msg[2],
                        'sender': 'me' if str(msg[2]) == str(user_id) else 'other',
                        'time': msg[3].strftime('%H:%M'),
                        'senderName': msg[4],
                        'senderAvatar': msg[5]
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(messages),
                    'isBase64Encoded': False
                }
            
            elif action == 'search_users':
                query = params.get('query', '')
                
                cur.execute("""
                    SELECT id, username, name, avatar, is_online
                    FROM users
                    WHERE (username ILIKE %s OR name ILIKE %s) AND id != %s
                    LIMIT 20
                """, (f'%{query}%', f'%{query}%', user_id))
                
                users_data = cur.fetchall()
                users = []
                for user in users_data:
                    users.append({
                        'id': user[0],
                        'username': user[1],
                        'name': user[2],
                        'avatar': user[3],
                        'online': user[4]
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(users),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'send_message':
                chat_id = body.get('chat_id')
                text = body.get('text')
                
                cur.execute(
                    "INSERT INTO messages (chat_id, sender_id, text) VALUES (%s, %s, %s) RETURNING id, created_at",
                    (chat_id, user_id, text)
                )
                message = cur.fetchone()
                conn.commit()
                
                cur.execute(
                    "INSERT INTO activity_logs (user_id, action, details) VALUES (%s, %s, %s)",
                    (user_id, 'send_message', f'Отправил сообщение в чат {chat_id}')
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'id': message[0],
                        'time': message[1].strftime('%H:%M')
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'create_chat':
                other_user_id = body.get('user_id')
                
                cur.execute("""
                    SELECT c.id FROM chats c
                    JOIN chat_members cm1 ON c.id = cm1.chat_id AND cm1.user_id = %s
                    JOIN chat_members cm2 ON c.id = cm2.chat_id AND cm2.user_id = %s
                    WHERE c.is_group = false
                    LIMIT 1
                """, (user_id, other_user_id))
                
                existing = cur.fetchone()
                if existing:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'chat_id': existing[0]}),
                        'isBase64Encoded': False
                    }
                
                cur.execute("INSERT INTO chats (is_group, created_by) VALUES (false, %s) RETURNING id", (user_id,))
                chat = cur.fetchone()
                chat_id = chat[0]
                
                cur.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s), (%s, %s)",
                           (chat_id, user_id, chat_id, other_user_id))
                conn.commit()
                
                cur.execute(
                    "INSERT INTO activity_logs (user_id, action, details) VALUES (%s, %s, %s)",
                    (user_id, 'create_chat', f'Создал чат с пользователем {other_user_id}')
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'chat_id': chat_id}),
                    'isBase64Encoded': False
                }
            
            elif action == 'create_group':
                name = body.get('name')
                member_ids = body.get('member_ids', [])
                
                cur.execute("INSERT INTO chats (name, is_group, created_by) VALUES (%s, true, %s) RETURNING id",
                           (name, user_id))
                chat = cur.fetchone()
                chat_id = chat[0]
                
                members = [(chat_id, user_id)] + [(chat_id, mid) for mid in member_ids]
                cur.executemany("INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s)", members)
                conn.commit()
                
                cur.execute(
                    "INSERT INTO activity_logs (user_id, action, details) VALUES (%s, %s, %s)",
                    (user_id, 'create_group', f'Создал группу {name}')
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'chat_id': chat_id}),
                    'isBase64Encoded': False
                }
        
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'pin_chat':
                chat_id = body.get('chat_id')
                is_pinned = body.get('is_pinned')
                
                cur.execute("UPDATE chats SET is_pinned = %s WHERE id = %s", (is_pinned, chat_id))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
            
            elif action == 'clear_chat':
                chat_id = body.get('chat_id')
                
                cur.execute("UPDATE messages SET text = 'Сообщение удалено' WHERE chat_id = %s AND sender_id = %s",
                           (chat_id, user_id))
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
