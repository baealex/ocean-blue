import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, symlink, access, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const cliPackageDir = path.join(repoRoot, 'packages/cli');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const tempRoot = await mkdtemp(path.join(repoRoot, '.tmp-ocean-blue-cli-smoke-'));

function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: options.cwd || repoRoot,
            env: {
                ...process.env,
                ...options.env
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString('utf8');
        });

        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString('utf8');
        });

        child.once('error', reject);
        child.once('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
                return;
            }

            reject(new Error([
                `Command failed: ${command} ${args.join(' ')}`,
                stdout.trim(),
                stderr.trim()
            ].filter(Boolean).join('\n')));
        });
    });
}

async function pathExists(targetPath) {
    try {
        await access(targetPath);
        return true;
    } catch {
        return false;
    }
}

function logStep(message) {
    console.log(`\n▶ ${message}`);
}

function logSuccess(message) {
    console.log(`  ✓ ${message}`);
}

try {
    const cliPackageJson = JSON.parse(await readFile(path.join(cliPackageDir, 'package.json'), 'utf8'));

    logStep('Packing the CLI npm artifact');
    const packResult = await runCommand(npmCommand, ['pack', '--json', '--pack-destination', tempRoot], {
        cwd: cliPackageDir,
        env: {
            npm_config_cache: path.join(tempRoot, '.npm-cache'),
            npm_config_update_notifier: 'false'
        }
    });
    const [packed] = JSON.parse(packResult.stdout);
    assert.ok(packed?.filename, 'Expected npm pack to report the package filename');
    const tarballPath = path.join(tempRoot, packed.filename);
    logSuccess(`Created ${packed.filename}`);

    logStep('Extracting the packed artifact');
    await runCommand('tar', ['-xzf', tarballPath, '-C', tempRoot]);
    const extractedPackageDir = path.join(tempRoot, 'package');
    logSuccess('Extracted npm package contents');

    logStep('Checking package entry points');
    const packedPackageJson = JSON.parse(await readFile(path.join(extractedPackageDir, 'package.json'), 'utf8'));
    assert.equal(packedPackageJson.name, 'ocean-blue');
    assert.equal(packedPackageJson.version, cliPackageJson.version);
    assert.equal(packedPackageJson.bin?.['ocean-blue'], 'dist/cli.js');
    assert.equal(packedPackageJson.main, 'dist/index.js');

    for (const requiredFile of ['dist/cli.js', 'dist/index.js', 'dist/index.d.ts', 'README.md', 'LICENSE']) {
        assert.equal(await pathExists(path.join(extractedPackageDir, requiredFile)), true, `Missing ${requiredFile} from packed artifact`);
    }

    const cliSource = await readFile(path.join(extractedPackageDir, 'dist/cli.js'), 'utf8');
    assert.equal(cliSource.startsWith('#!/usr/bin/env node'), true, 'CLI bin must keep the node shebang');
    logSuccess('Package metadata and required files are present');

    const installedCliNodeModules = path.join(cliPackageDir, 'node_modules');
    if (await pathExists(installedCliNodeModules)) {
        await symlink(installedCliNodeModules, path.join(extractedPackageDir, 'node_modules'), 'dir');
    }

    logStep('Running the packed CLI entry point');
    const cliPath = path.join(extractedPackageDir, 'dist/cli.js');
    const cliStats = await stat(cliPath);
    assert.notEqual(cliStats.mode & 0o111, 0, 'CLI bin should be executable in the packed artifact');

    const versionResult = await runCommand(process.execPath, [cliPath, '--version'], {
        cwd: extractedPackageDir
    });
    assert.equal(versionResult.stdout.trim(), cliPackageJson.version);

    const helpResult = await runCommand(process.execPath, [cliPath, '--help'], {
        cwd: extractedPackageDir
    });
    assert.match(helpResult.stdout, /proxy/);
    assert.match(helpResult.stdout, /auth/);
    logSuccess('Packed CLI reports version and help successfully');

    console.log('\n✅ Ocean Blue CLI package smoke checks passed');
} finally {
    await rm(tempRoot, { recursive: true, force: true });
}
