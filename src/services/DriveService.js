import { CONFIG } from '../config.js';

export class DriveService {
    constructor(authService) {
        this.authService = authService;
    }

    async listFiles() {
        if (!this.authService.isAuthenticated()) throw new Error("Não autenticado!");
        const url = `https://www.googleapis.com/drive/v3/files?q='${CONFIG.GOOGLE_DRIVE_FOLDER_ID}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&pageSize=200`;
        const res = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + this.authService.getToken() }
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.files;
    }

    async listImages() {
        if (!this.authService.isAuthenticated()) throw new Error("Não autenticado!");

        const folderId = CONFIG.GOOGLE_IMAGES_FOLDER_ID || CONFIG.GOOGLE_DRIVE_FOLDER_ID;
        let allFiles = [];
        let pageToken = null;

        do {
            const query = `'${folderId}'+in+parents+and+mimeType+contains+'image/'+and+trashed=false`;
            let url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=nextPageToken,files(id,name,mimeType,thumbnailLink)&pageSize=1000`;

            if (pageToken) {
                url += `&pageToken=${pageToken}`;
            }

            const res = await fetch(url, {
                headers: { 'Authorization': 'Bearer ' + this.authService.getToken() }
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error.message);

            if (data.files) {
                allFiles = allFiles.concat(data.files);
            }

            pageToken = data.nextPageToken;

        } while (pageToken);

        return allFiles;
    }

    async getFileContent(fileId) {
        if (!this.authService.isAuthenticated()) throw new Error("Não autenticado!");
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        const res = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + this.authService.getToken() }
        });
        if (!res.ok) throw new Error("Erro ao ler arquivo: " + res.statusText);
        return await res.text();
    }

    async uploadFile(file) {
        if (!this.authService.isAuthenticated()) throw new Error("Não autenticado!");

        const metadata = {
            name: file.name,
            mimeType: file.type,
            parents: [CONFIG.GOOGLE_DRIVE_FOLDER_ID]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,thumbnailLink';
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + this.authService.getToken() },
            body: form
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error('Erro no upload: ' + (err.error?.message || res.statusText));
        }
        return await res.json();
    }

    async findFile(name) {
        if (!this.authService.isAuthenticated()) throw new Error("Não autenticado!");
        const q = `'${CONFIG.GOOGLE_DRIVE_FOLDER_ID}' in parents and name = '${name}' and trashed = false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
        const res = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + this.authService.getToken() }
        });
        const data = await res.json();
        return data.files && data.files.length > 0 ? data.files[0] : null;
    }

    async createJsonFile(name, contentObj) {
        const file = new Blob([JSON.stringify(contentObj)], { type: 'application/json' });
        // Use uploadFile logic but specific for JSON creation
        const metadata = {
            name: name,
            mimeType: 'application/json',
            parents: [CONFIG.GOOGLE_DRIVE_FOLDER_ID]
        };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + this.authService.getToken() },
            body: form
        });
        if (!res.ok) throw new Error('Erro criar JSON');
        return await res.json();
    }

    async updateJsonFile(fileId, contentObj) {
        if (!this.authService.isAuthenticated()) throw new Error("Não autenticado!");

        const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + this.authService.getToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(contentObj)
        });

        if (!res.ok) throw new Error('Erro ao atualizar JSON');
        return await res.json();
    }
}
