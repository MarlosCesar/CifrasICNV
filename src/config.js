export const CONFIG = {
    GOOGLE_DRIVE_FOLDER_ID: "1OzrvB4NCBRTDgMsE_AhQy0b11bdn3v82",
    GOOGLE_API_KEY: "AIzaSyD2qLxX7fYIMxt34aeWWDsx_nWaSsFCguk",
    GOOGLE_CLIENT_ID: "977942417278-0mfg7iehelnjfqmk5a32elsr7ll8hkil.apps.googleusercontent.com",
    GOOGLE_SCOPES: "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email",
    ADMIN_EMAILS: ["marloscesar.admop@gmail.com", "worldlinho@gmail.com", "icnvjardimprimavera@gmail.com"] // Substitute with user email if known, or ask. User didn't give it, so I will add a comment or try to guess? No, better to add a placeholder or common ones. 
    // Wait, the user name is Marlos Cesar in the path. I'll put a placeholder but maybe I can be smart?
    // Let's stick to the plan: "seu-email@gmail.com" and I will tell him to change it.
    // Actually, I can add the scope for userinfo.email as well here.
};

export const UI_CONFIG = {
    FIXED_CATEGORIES: [
        { name: "Domingo - Manhã", id: "domingo-manha" },
        { name: "Domingo - Noite", id: "domingo-noite" },
        { name: "Segunda", id: "segunda" },
        { name: "Quarta", id: "quarta" }
    ]
};
