import http from 'k6/http';
import { check, fail, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } };

export const options = {
    // Montée progressive à 20 utilisateurs simultanés, palier d'1 minute, puis descente
    stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 20 },
        { duration: '15s', target: 0 },
    ],
    // Objectifs : le test échoue s'ils ne sont pas tenus
    thresholds: {
        http_req_failed: ['rate<0.01'],                        // moins de 1 % d'erreurs
        'http_req_duration{name:infos}': ['p(95)<300'],        // 95 % des réponses en moins de 300 ms
        'http_req_duration{name:ticket}': ['p(95)<300'],
        'http_req_duration{name:fichier}': ['p(95)<1000'],     // fichier de 1 Mo
    },
};

// Exécuté une seule fois avant le test : crée un compte et dépose un fichier de 1 Mo
export function setup() {
    const email = `k6-${Date.now()}@datashare.test`;
    const password = 'Motdepasse123';

    let res = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({ email, password }), JSON_HEADERS);
    if (res.status !== 201) fail(`Inscription : ${res.status} ${res.body}`);

    res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email, password }), JSON_HEADERS);
    if (res.status !== 200) fail(`Connexion : ${res.status} ${res.body}`);
    const accessToken = res.json('accessToken');

    res = http.post(
        `${BASE_URL}/api/files`,
        {
            file: http.file('x'.repeat(1024 * 1024), 'k6-1mo.bin', 'application/octet-stream'),
            expirationDays: '1',
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (res.status !== 201) fail(`Upload : ${res.status} ${res.body}`);

    return { token: res.json('token') };
}

// Exécuté en boucle par chaque utilisateur virtuel : le parcours de téléchargement
export default function (data) {
    const base = `${BASE_URL}/api/download/${data.token}`;

    let res = http.get(base, { tags: { name: 'infos' } });
    check(res, { 'infos : 200': (r) => r.status === 200 });

    res = http.post(`${base}/ticket`, JSON.stringify({}), { ...JSON_HEADERS, tags: { name: 'ticket' } });
    check(res, { 'ticket : 200': (r) => r.status === 200 });
    const ticket = res.json('ticket');

    res = http.get(`${base}/file?ticket=${encodeURIComponent(ticket)}`, {
        tags: { name: 'fichier' },
        responseType: 'none', // le fichier est bien reçu, mais k6 ne le garde pas en mémoire
    });
    check(res, { 'fichier : 200': (r) => r.status === 200 });

    sleep(1); // un vrai utilisateur ne clique pas en continu
}