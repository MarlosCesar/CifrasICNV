import { AuthService } from './services/AuthService.js';
import { DriveService } from './services/DriveService.js';
import { LocalFileService } from './services/LocalFileService.js';
import { AppUI } from './ui/AppUI.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Services

    const authService = new AuthService((isAuthenticated) => {
        app.updateAuthUI(isAuthenticated);
    });

    const driveService = new DriveService(authService);
    const localFileService = new LocalFileService();
    const app = new AppUI(authService, driveService, localFileService);

    // Re-check auth on load (handles page refresh)
    // Delay slightly to ensure GIS library might be ready or handled by the new lazy logic
    setTimeout(() => {
        if (authService.isAuthenticated()) {
            app.updateAuthUI(true);
        } else {
            authService.init(); // Tenta init inicial
        }
    }, 500);

    // PWA Service Worker - UNREGISTER FOR NOW TO FIX CACHE ISSUES
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            for (let registration of registrations) {
                registration.unregister();
                console.log('Service Worker não registrado (limpeza de cache).');
            }
        });
    }
});
