import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Управление звонками между пользователями
    """
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
        
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'initiate_call':
                receiver_id = body.get('receiver_id')
                call_type = body.get('call_type', 'audio')
                offer = body.get('offer')
                
                cur.execute(
                    "INSERT INTO calls (caller_id, receiver_id, call_type, status) VALUES (%s, %s, %s, %s) RETURNING id",
                    (user_id, receiver_id, call_type, 'ringing')
                )
                call = cur.fetchone()
                conn.commit()
                
                cur.execute(
                    "INSERT INTO activity_logs (user_id, action, details) VALUES (%s, %s, %s)",
                    (user_id, 'call_initiated', f'Инициировал {call_type} звонок пользователю {receiver_id}')
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'call_id': call[0],
                        'offer': offer
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'answer_call':
                call_id = body.get('call_id')
                answer = body.get('answer')
                
                cur.execute("UPDATE calls SET status = %s WHERE id = %s", ('active', call_id))
                conn.commit()
                
                cur.execute(
                    "INSERT INTO activity_logs (user_id, action, details) VALUES (%s, %s, %s)",
                    (user_id, 'call_answered', f'Принял звонок {call_id}')
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'call_id': call_id,
                        'answer': answer
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'ice_candidate':
                call_id = body.get('call_id')
                candidate = body.get('candidate')
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'call_id': call_id,
                        'candidate': candidate
                    }),
                    'isBase64Encoded': False
                }
        
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'end_call':
                call_id = body.get('call_id')
                duration = body.get('duration', 0)
                
                cur.execute("UPDATE calls SET status = %s, duration = %s WHERE id = %s",
                           ('completed', duration, call_id))
                conn.commit()
                
                cur.execute(
                    "INSERT INTO activity_logs (user_id, action, details) VALUES (%s, %s, %s)",
                    (user_id, 'call_ended', f'Завершил звонок {call_id}, длительность {duration} сек')
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
            
            elif action == 'reject_call':
                call_id = body.get('call_id')
                
                cur.execute("UPDATE calls SET status = %s WHERE id = %s", ('rejected', call_id))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
        
        elif method == 'GET':
            params = event.get('queryStringParameters', {})
            action = params.get('action')
            
            if action == 'call_history':
                cur.execute("""
                    SELECT c.id, c.call_type, c.duration, c.status, c.created_at,
                           u1.name as caller_name, u2.name as receiver_name,
                           c.caller_id, c.receiver_id
                    FROM calls c
                    JOIN users u1 ON c.caller_id = u1.id
                    JOIN users u2 ON c.receiver_id = u2.id
                    WHERE c.caller_id = %s OR c.receiver_id = %s
                    ORDER BY c.created_at DESC
                    LIMIT 50
                """, (user_id, user_id))
                
                calls_data = cur.fetchall()
                calls = []
                for call in calls_data:
                    calls.append({
                        'id': call[0],
                        'type': call[1],
                        'duration': call[2],
                        'status': call[3],
                        'time': call[4].isoformat(),
                        'callerName': call[5],
                        'receiverName': call[6],
                        'isIncoming': str(call[8]) == str(user_id)
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(calls),
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
