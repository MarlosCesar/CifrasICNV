import { AuthService } from './services/AuthService.js';
import { DriveService } from './services/DriveService.js';
import { LocalFileService } from './services/LocalFileService.js';
import { AppUI } from './ui/AppUI.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Services
    const authService = new AuthService((isAuthenticated) => {
        appUI.updateAuthUI(isAuthenticated);
    });

    const driveService = new DriveService(authService);
    const localFileService = new LocalFileService();

    // 2. Initialize UI
    const appUI = new AppUI(authService, driveService, localFileService);

    // 3. Start Auth
    authService.init();
});
