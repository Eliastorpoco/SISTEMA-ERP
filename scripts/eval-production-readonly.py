"""Read-only authenticated smoke; tokens and actor identities are never printed."""
import json
import os
import time
import urllib.request
import urllib.error
from jose import jwt
from sqlalchemy import text
from app.db.database import engine

secret = os.getenv('JWT_SECRET')
with engine.connect() as con:
    con.execute(text('SET TRANSACTION READ ONLY'))
    actor = con.execute(text("SELECT username,tenant_id,role FROM usuarios WHERE UPPER(role) IN ('ADMIN','DIRECTOR') AND tenant_id IS NOT NULL ORDER BY id LIMIT 1")).mappings().first()
if not actor or not secret:
    print('EVAL_AUTHENTICATED_SMOKE=NO_ACTOR_OR_SIGNING_CONFIG; use isolated harness evidence')
else:
    token = jwt.encode({'sub': actor['username'], 'tenant_id': str(actor['tenant_id']), 'role': actor['role'], 'exp': int(time.time()) + 90}, secret, algorithm='HS256')
    for path in ['/evaluaciones', '/evaluaciones/catalogos']:
        request = urllib.request.Request('http://127.0.0.1:8000' + path, headers={'Authorization': 'Bearer ' + token})
        with urllib.request.urlopen(request, timeout=15) as response:
            assert response.status == 200
            result = json.load(response)
            if isinstance(result, list):
                assert all(str(row.get('tenant_id')) == str(actor['tenant_id']) for row in result)
            else:
                assert 'asignaciones' in result and 'competencias' in result
        print(path + '=200 AUTHENTICATED_READONLY')
    print('EVAL_AUTHENTICATED_SMOKE=PASS')
