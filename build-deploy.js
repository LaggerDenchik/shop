// build-deploy.js
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

console.log('🚀 Начинаем сборку бэкенда...');

// Очистка предыдущих сборокyarn add -D archiver

const deployDir = 'deploy-backend';
const zipFile = 'backend-deploy.zip';

if (fs.existsSync(deployDir)) {
    fs.rmSync(deployDir, { recursive: true, force: true });
}
if (fs.existsSync(zipFile)) {
    fs.rmSync(zipFile, { force: true });
}

// Создаем директорию для деплоя
fs.mkdirSync(deployDir, { recursive: true });

// Функция для копирования файлов/папок
function copyRecursiveSync(src, dest) {
    if (!fs.existsSync(src)) return;
    
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(item => {
            copyRecursiveSync(path.join(src, item), path.join(dest, item));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Копируем необходимые файлы
const filesToCopy = [
    'dist',
    'node_modules',
    'package.json',
    'yarn.lock',
    '.env.production',
    'ecosystem.config.js',
    'src',
    's-monte.env',
    'Dockerfile',
    'docker-compose.prod.yml'
];

filesToCopy.forEach(item => {
    if (fs.existsSync(item)) {
        copyRecursiveSync(item, path.join(deployDir, item));
    }
});

// Создаем директорию для логов
fs.mkdirSync(path.join(deployDir, 'logs'), { recursive: true });

// Создаем архив
const output = fs.createWriteStream(zipFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    const sizeMB = archive.pointer() / (1024 * 1024);
    console.log(`✅ Сборка завершена! Архив: ${zipFile}`);
    console.log(`📦 Размер архива: ${sizeMB.toFixed(2)} MB`);
    
    // Очищаем временные файлы
    fs.rmSync(deployDir, { recursive: true, force: true });
});

archive.on('error', (err) => {
    throw err;
});

archive.pipe(output);
archive.directory(deployDir, false);
archive.finalize();