import { StorageService } from './StorageService.js';

export class SyncService {
    constructor(driveService) {
        this.driveService = driveService;
        this.FILENAME = 'app-data.json';
        this.fileId = null;
    }

    async init() {
        try {
            const file = await this.driveService.findFile(this.FILENAME);
            if (file) {
                this.fileId = file.id;
                console.log('Sync: Arquivo de dados encontrado:', this.fileId);
            } else {
                console.log('Sync: Arquivo de dados não existe. Será criado ao salvar.');
            }
        } catch (e) {
            console.error('Sync: Erro ao buscar arquivo:', e);
        }
    }

    async loadFromCloud() {
        if (!this.fileId) await this.init();
        if (!this.fileId) return false; // Nothing to load

        try {
            const content = await this.driveService.getFileContent(this.fileId);
            const data = JSON.parse(content);

            if (data.customCategories) StorageService.setCustomCategories(data.customCategories);
            if (data.cifrasPorCategoria) StorageService.setCifrasPorCategoria(data.cifrasPorCategoria);

            console.log('Sync: Dados carregados da nuvem.');
            return true;
        } catch (e) {
            console.error('Sync: Erro ao carregar dados:', e);
            return false;
        }
    }

    async saveToCloud() {
        const data = {
            customCategories: StorageService.getCustomCategories(),
            cifrasPorCategoria: StorageService.getCifrasPorCategoria(),
            updatedAt: new Date().toISOString()
        };

        try {
            if (this.fileId) {
                await this.driveService.updateJsonFile(this.fileId, data);
                console.log('Sync: Dados atualizados na nuvem.');
            } else {
                const file = await this.driveService.createJsonFile(this.FILENAME, data);
                this.fileId = file.id;
                console.log('Sync: Novo arquivo criado na nuvem:', this.fileId);
            }
        } catch (e) {
            console.error('Sync: Erro ao salvar na nuvem:', e);
        }
    }
}
