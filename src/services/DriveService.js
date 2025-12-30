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
        // Use the same folder or specific images folder if defined. Default to same main folder.
        const folderId = CONFIG.GOOGLE_IMAGES_FOLDER_ID || CONFIG.GOOGLE_DRIVE_FOLDER_ID;
        const query = `'${folderId}'+in+parents+and+mimeType+contains+'image/'+and+trashed=false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,thumbnailLink)&pageSize=100`;

        const res = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + this.authService.getToken() }
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.files;
    }

    async getFileContent(fileId) {
        if (!this.authService.isAuthenticated()) throw new Error("Não autenticado!");
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        const res = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + this.authService.getToken() }
        });
        return await res.text();
    }
}
