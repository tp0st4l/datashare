// Audit Lighthouse de /my-files, qui exige d'être connecté.
// Usage : node /opt/lh/my-files.mjs <baseUrl> <accessToken> <mobile|desktop> <sortieSansExtension>
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

const [baseUrl, accessToken, device, outputBase] = process.argv.slice(2);

const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
    const page = await browser.newPage();

    // Le localStorage appartient à une origine : on ouvre une page du site pour pouvoir y écrire
    await page.goto(`${baseUrl}/login`);
    await page.evaluate((token) => localStorage.setItem('authToken', token), accessToken);

    // On vide le cache, sinon /my-files profiterait des fichiers déjà chargés par /login
    const cdp = await page.createCDPSession();
    await cdp.send('Network.clearBrowserCache');

    const result = await lighthouse(
        `${baseUrl}/my-files`,
        {
            output: ['html', 'json'],
            onlyCategories: ['performance', 'accessibility', 'best-practices'],
            disableStorageReset: true, // sinon Lighthouse efface le token avant de charger la page
            logLevel: 'error',
        },
        device === 'desktop' ? desktopConfig : undefined,
        page,
    );

    // Garde-fou : si le token est refusé, le guard renvoie vers /login et l'audit ne vaut rien
    if (result.lhr.finalDisplayedUrl.endsWith('/login')) {
        throw new Error("Redirigé vers /login : le token n'a pas été pris en compte");
    }

    fs.writeFileSync(`${outputBase}.report.html`, result.report[0]);
    fs.writeFileSync(`${outputBase}.report.json`, result.report[1]);
} finally {
    await browser.close();
}