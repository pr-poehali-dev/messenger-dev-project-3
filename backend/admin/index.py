import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Админ-панель для просмотра логов и статистики
    """
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
        
        cur.execute("SELECT is_admin FROM users WHERE id = %s", (user_id,))
        result = cur.fetchone()
        
        if not result or not result[0]:
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Access denied'}),
                'isBase64Encoded': False
            }
        
        if method == 'GET':
            params = event.get('queryStringParameters', {})
            action = params.get('action')
            
            if action == 'logs':
                limit = int(params.get('limit', 100))
                
                cur.execute("""
                    SELECT al.id, al.user_id, u.username, u.name, al.action, al.details, al.created_at
                    FROM activity_logs al
                    JOIN users u ON al.user_id = u.id
                    ORDER BY al.created_at DESC
                    LIMIT %s
                """, (limit,))
                
                logs_data = cur.fetchall()
                logs = []
                for log in logs_data:
                    logs.append({
                        'id': log[0],
                        'userId': log[1],
                        'username': log[2],
                        'userName': log[3],
                        'action': log[4],
                        'details': log[5],
                        'timestamp': log[6].isoformat()
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(logs),
                    'isBase64Encoded': False
                }
            
            elif action == 'stats':
                cur.execute("SELECT COUNT(*) FROM users")
                total_users = cur.fetchone()[0]
                
                cur.execute("SELECT COUNT(*) FROM users WHERE is_online = true")
                online_users = cur.fetchone()[0]
                
                cur.execute("SELECT COUNT(*) FROM messages")
                total_messages = cur.fetchone()[0]
                
                cur.execute("SELECT COUNT(*) FROM calls")
                total_calls = cur.fetchone()[0]
                
                cur.execute("SELECT COUNT(*) FROM chats WHERE is_group = true")
                total_groups = cur.fetchone()[0]
                
                cur.execute("""
                    SELECT u.username, u.name, COUNT(m.id) as message_count
                    FROM users u
                    LEFT JOIN messages m ON u.id = m.sender_id
                    GROUP BY u.id, u.username, u.name
                    ORDER BY message_count DESC
                    LIMIT 10
                """)
                top_users = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'totalUsers': total_users,
                        'onlineUsers': online_users,
                        'totalMessages': total_messages,
                        'totalCalls': total_calls,
                        'totalGroups': total_groups,
                        'topUsers': [{'username': u[0], 'name': u[1], 'messageCount': u[2]} for u in top_users]
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'user_activity':
                target_user_id = params.get('user_id')
                
                cur.execute("""
                    SELECT u.id, u.username, u.name, u.avatar, u.is_online,
                           (SELECT COUNT(*) FROM messages WHERE sender_id = u.id) as messages_sent,
                           (SELECT COUNT(*) FROM calls WHERE caller_id = u.id OR receiver_id = u.id) as calls_count
                    FROM users u
                    WHERE u.id = %s
                """, (target_user_id,))
                
                user_data = cur.fetchone()
                if not user_data:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'User not found'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute("""
                    SELECT al.action, al.details, al.created_at
                    FROM activity_logs al
                    WHERE al.user_id = %s
                    ORDER BY al.created_at DESC
                    LIMIT 50
                """, (target_user_id,))
                
                activity = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'user': {
                            'id': user_data[0],
                            'username': user_data[1],
                            'name': user_data[2],
                            'avatar': user_data[3],
                            'online': user_data[4],
                            'messagesSent': user_data[5],
                            'callsCount': user_data[6]
                        },
                        'activity': [{'action': a[0], 'details': a[1], 'time': a[2].isoformat()} for a in activity]
                    }),
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
