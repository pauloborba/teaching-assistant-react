// server/jest.setup.ts

let server: any; // Garante que 'server' seja acessível em afterAll

beforeAll(async () => {
    const app = require('./src/server').app;
    // INICIAR NA PORTA 0: O sistema operacional escolherá uma porta livre
    server = app.listen(0); 
});

afterAll(async () => {
    if (server) {
        // Encerra o servidor e espera pela conclusão (Promessa)
        await new Promise<void>((resolve, reject) => {
            // Adiciona o callback para garantir que o Jest espera o fechamento completo
            server.close((err: any) => { 
                if (err) {
                    console.error('Erro ao fechar o servidor de teste:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
});
