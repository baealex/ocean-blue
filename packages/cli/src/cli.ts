import { Command, InvalidArgumentError } from 'commander';
import chalk from 'chalk';
import TunnelClient from './client.js';
import { TunnelConfig } from './types.js';
import authManager from './auth.js';
import configManager from './config.js';
import { CLI_VERSION } from './version.js';
import { DEFAULT_SERVER_URL } from '@ocean-blue/shared';

const program = new Command();

type ServerProtocol = 'http' | 'https';

const getDefaultServerUrl = () => process.env.OCEAN_BLUE_SERVER || process.env.SERVER_URL || DEFAULT_SERVER_URL;

const parsePortOption = (value: string) => {
    const port = Number(value);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new InvalidArgumentError('Port must be a number between 1 and 65535.');
    }

    return port;
};

const parseServerUrl = (value: string) => {
    let url: URL;

    try {
        url = new URL(value);
    } catch {
        throw new Error('--server must be an absolute URL, for example http://localhost:25830');
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('--server must start with http:// or https://');
    }

    const protocol = url.protocol === 'https:' ? 'https' : 'http';
    const serverPort = url.port ? parsePortOption(url.port) : protocol === 'https' ? 443 : 80;

    return {
        serverUrl: url.origin,
        serverHost: url.hostname,
        serverPort,
        serverProtocol: protocol as ServerProtocol
    };
};

program
    .name('ocean-blue')
    .description('A client for tunneling local services to the internet')
    .version(CLI_VERSION);

program
    .command('proxy')
    .description('Proxy a local app through an Ocean Blue server')
    .requiredOption('--local-port <port>', 'Port your local app is listening on', parsePortOption)
    .requiredOption('--subdomain <name>', 'Public subdomain to claim on the Ocean Blue server')
    .option('--token <key>', 'Tunnel key used to authenticate this proxy connection')
    .option('--server <url>', 'Ocean Blue server to proxy through', getDefaultServerUrl())
    .action(async (options) => {
        try {
            const server = parseServerUrl(options.server);
            let token = options.token;

            if (!token) {
                console.log(chalk.yellow('No tunnel key provided. Checking saved credentials...'));
                token = await authManager.getApiKey({
                    serverHost: server.serverHost,
                    serverPort: server.serverPort,
                    serverProtocol: server.serverProtocol
                });
            }

            const config: TunnelConfig = {
                localPort: options.localPort,
                subdomain: options.subdomain,
                serverHost: server.serverHost,
                serverPort: server.serverPort,
                serverProtocol: server.serverProtocol,
                apiKey: token
            };

            console.log(chalk.blue('🚀 Starting ocean-blue client...'));
            console.log(chalk.gray(`Ocean Blue server: ${server.serverUrl}`));
            console.log(chalk.gray(`Local app port: ${config.localPort}`));
            console.log(chalk.gray(`Public subdomain: ${config.subdomain}`));
            console.log(chalk.gray(`Tunnel key: ${config.apiKey?.substring(0, 8)}...`));
            console.log('');

            const client = new TunnelClient(config);

            // Handle graceful shutdown
            process.on('SIGINT', () => {
                console.log(chalk.yellow('\n🛑 Shutting down tunnel...'));
                client.disconnect();
                process.exit(0);
            });

            try {
                await client.connect();
            } catch (error) {
                console.error(chalk.red('Failed to connect to tunnel server:'), error);
                process.exit(1);
            }
        } catch (error) {
            console.error(chalk.red('Error starting tunnel:'), error);
            process.exit(1);
        }
    });

program
    .command('auth')
    .description('Manage authentication')
    .option('--login', 'Start authentication flow to get an API key')
    .option('--logout', 'Remove saved API key')
    .option('--status', 'Check authentication status')
    .option('--server <url>', 'Ocean Blue server to authenticate against', getDefaultServerUrl())
    .action(async (options) => {
        try {
            const server = parseServerUrl(options.server);

            if (options.login) {
                console.log(chalk.blue('Starting authentication flow...'));
                try {
                    const apiKey = await authManager.getApiKey({
                        serverHost: server.serverHost,
                        serverPort: server.serverPort,
                        serverProtocol: server.serverProtocol
                    });
                    console.log(chalk.green('✓ Authentication successful!'));
                    console.log(chalk.gray(`Tunnel key: ${apiKey.substring(0, 8)}...`));
                } catch (error) {
                    console.error(chalk.red('Authentication failed:'), error);
                    process.exit(1);
                }
            } else if (options.logout) {
                configManager.setApiKey('');
                console.log(chalk.green('✓ Logged out successfully. API key removed.'));
            } else if (options.status) {
                const apiKey = configManager.getApiKey();
                if (apiKey) {
                    console.log(chalk.green('✓ You are authenticated'));
                    console.log(chalk.gray(`Tunnel key: ${apiKey.substring(0, 8)}...`));
                } else {
                    console.log(chalk.yellow('⚠️ Not authenticated. Run `ocean-blue auth --login` to authenticate.'));
                }
            } else {
                console.log(chalk.yellow('Please specify an action: --login, --logout, or --status'));
            }
        } catch (error) {
            console.error(chalk.red('Error managing authentication:'), error);
            process.exit(1);
        }
    });

program
    .command('help')
    .description('Show help information')
    .action(() => {
        console.log(chalk.blue('🔧 Ocean Blue Tunnel CLI Help'));
        console.log('');
        console.log(chalk.green('Proxy a local app:'));
        console.log('  ocean-blue proxy --server http://localhost:25830 --local-port 3000 --subdomain myapp --token tk_xxx');
        console.log('');
        console.log(chalk.green('Manage authentication:'));
        console.log('  ocean-blue auth --login --server http://localhost:25830');
        console.log('  ocean-blue auth --status');
        console.log('  ocean-blue auth --logout');
        console.log('');
        console.log(chalk.green('Environment variables:'));
        console.log('  OCEAN_BLUE_SERVER                            # Default Ocean Blue server URL');
        console.log('');
        console.log(chalk.green('Examples:'));
        console.log('  # Route localhost:3000 through http://localhost:25830 and claim myapp.localhost:25830');
        console.log('  ocean-blue proxy --server http://localhost:25830 --local-port 3000 --subdomain myapp --token tk_xxx');
        console.log('  ocean-blue proxy --server http://localhost:25830 --local-port 3000 --subdomain myapp');
        console.log('');
        console.log('  # Hosted server');
        console.log('  ocean-blue proxy --server https://ocean.example.com --local-port 3000 --subdomain myapp --token tk_xxx');
    });

// Show help if no command provided
if (process.argv.length <= 2) {
    program.outputHelp();
}

program.parse();

export default program;
