const test = require('node:test');
const assert = require('node:assert/strict');

const authMiddleware = require('../middlewares/authMiddleware');

test('permite acceso cuando hay sesion admin', () => {
    const req = { session: { adminId: 123 }, headers: {} };
    let nextCalled = false;
    const res = {
        status() {
            throw new Error('no deberia llamar status');
        },
        redirect() {
            throw new Error('no deberia redirigir');
        }
    };

    authMiddleware(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
});

test('responde 401 JSON cuando espera application/json', () => {
    const req = { session: null, headers: { accept: 'application/json' }, xhr: false };
    let statusCode;
    let jsonBody;
    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(body) {
            jsonBody = body;
        },
        redirect() {
            throw new Error('no deberia redirigir en request json');
        }
    };

    authMiddleware(req, res, () => {});

    assert.equal(statusCode, 401);
    assert.deepEqual(jsonBody, { success: false, message: 'No autorizado' });
});

test('redirige a login en request web sin sesion', () => {
    const req = { session: null, headers: { accept: 'text/html' }, xhr: false };
    let redirectPath;
    const res = {
        status() {
            throw new Error('no deberia llamar status');
        },
        json() {
            throw new Error('no deberia responder json');
        },
        redirect(path) {
            redirectPath = path;
        }
    };

    authMiddleware(req, res, () => {});

    assert.equal(redirectPath, '/login');
});
