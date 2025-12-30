export class LocalFileService {
    constructor() {
        // Estrutura: { 'categoria-id': [ { id: 'uuid', name: 'Nome.jpg', url: 'blob:...' } ] }
        this.files = {};
    }

    addFile(category, fileObj) {
        if (!this.files[category]) {
            this.files[category] = [];
        }

        const url = URL.createObjectURL(fileObj);
        const id = 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        const newFile = {
            id: id,
            name: fileObj.name,
            mimeType: fileObj.type,
            url: url,
            isLocal: true,
            fileObject: fileObj
        };

        this.files[category].push(newFile);
        return newFile;
    }

    getFiles(category) {
        return this.files[category] || [];
    }

    removeFile(category, fileId) {
        if (!this.files[category]) return;

        const idx = this.files[category].findIndex(f => f.id === fileId);
        if (idx !== -1) {
            // Revoke blob URL to avoid memory leaks
            URL.revokeObjectURL(this.files[category][idx].url);
            this.files[category].splice(idx, 1);
        }
    }
}
