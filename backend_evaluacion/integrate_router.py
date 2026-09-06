"""Build-time integration: preserve every byte of the verified productive main."""
from hashlib import sha256
from pathlib import Path

BASE_SHA256 = '3d12862322d44e92129cbc7239425c57d485046dbe8eb014d3e57b0b3abcf082'
ANCHOR = b'app.include_router(apoderados_comunicacion_controller.router)\n'
ADDITION = b'from controllers import evaluaciones_controller\napp.include_router(evaluaciones_controller.router)\n'


def integrate(path):
    original = path.read_bytes()
    if sha256(original).hexdigest() != BASE_SHA256 or original.count(ANCHOR) != 1:
        raise RuntimeError('Productive main changed: refuse integration until reviewed')
    candidate = original.replace(ANCHOR, ANCHOR + ADDITION, 1)
    assert candidate.replace(ADDITION, b'', 1) == original
    path.write_bytes(candidate)
    print('EVAL_MAIN_PRODUCTIVE_PRESERVED=sí; ROUTER_ADDED_ONLY=PASS')


if __name__ == '__main__':
    integrate(Path('/app/main.py'))
