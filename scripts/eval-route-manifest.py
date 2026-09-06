"""Inspect real registered routes with all database connections disabled.

No lifespan or requests are executed; both images use identical import harness.
"""
import contextlib
import importlib
import io
import json
import os
import sys
from sqlalchemy import MetaData
from sqlalchemy.engine import Engine

os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
MetaData.create_all = lambda *args, **kwargs: None


def no_connection(*args, **kwargs):
    raise AssertionError('Route inspection must not connect to any database')


Engine.connect = no_connection
sys.path.insert(0, '/app')
with contextlib.redirect_stdout(io.StringIO()):
    main = importlib.import_module('main')
routes = [{'path': route.path, 'methods': sorted(route.methods or []),
           'endpoint': route.endpoint.__module__ + '.' + route.endpoint.__qualname__}
          for route in main.app.routes if hasattr(route, 'methods')]
print(json.dumps(routes, sort_keys=True))
