export class StorageService {
    static getCustomCategories() {
        return JSON.parse(localStorage.getItem('customCategories') || '[]');
    }

    static setCustomCategories(categories) {
        localStorage.setItem('customCategories', JSON.stringify(categories));
    }

    static getCifrasPorCategoria() {
        return JSON.parse(localStorage.getItem('cifrasPorCategoria') || '{}');
    }

    static setCifrasPorCategoria(obj) {
        localStorage.setItem('cifrasPorCategoria', JSON.stringify(obj));
    }

    static getDarkMode() {
        return localStorage.getItem('darkmode') === '1';
    }

    static setDarkMode(enabled) {
        localStorage.setItem('darkmode', enabled ? '1' : '0');
    }

    static getUsers() {
        return JSON.parse(localStorage.getItem('user_roles') || '{}');
    }

    static setUsers(users) {
        localStorage.setItem('user_roles', JSON.stringify(users));
    }
}
