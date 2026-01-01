import { UI_CONFIG, CONFIG } from '../config.js';
import { StorageService } from '../services/StorageService.js';
import { Transposer } from '../utils/Transposer.js';
import { SyncService } from '../services/SyncService.js';

export class AppUI {
    constructor(authService, driveService, localFileService) {
        this.authService = authService;
        this.driveService = driveService;
        this.localFileService = localFileService;
        this.customCategories = StorageService.getCustomCategories();
        this.selectedCategory = UI_CONFIG.FIXED_CATEGORIES[0].id;
        this.isEditMode = false;
        this.allCifras = [];
        this.cifrasPorCategoria = StorageService.getCifrasPorCategoria();
        this.currentTranspose = 0;
        this.cifraModalOriginal = "";
        this.isSidebarOpen = false;

        this.dom = {
            sidebar: document.getElementById('sidebar'),
            sidebarBackdrop: document.getElementById('sidebarBackdrop'),
            sidebarToggle: document.getElementById('sidebarToggle'),
            categoryList: document.getElementById('categoryList'),
            categoryTitle: document.getElementById('categoryTitle'),
            songGrid: document.getElementById('songGrid'),
            searchInput: document.getElementById('searchInput'),
            loginBtn: document.getElementById('loginBtn'),
            userSection: document.getElementById('userSection'),
            userAvatar: document.getElementById('userAvatar'),
            userName: document.getElementById('userName'),
            logoutBtn: document.getElementById('logoutBtn'),
            modal: document.getElementById('cifraModal'),
            modalContent: document.getElementById('modalContent'),
            modalTitle: document.getElementById('modalTitle'),
            closeModal: document.getElementById('closeModal'),
            btnTransposeUp: document.getElementById('btnTransposeUp'),
            btnTransposeDown: document.getElementById('btnTransposeDown'),
            transposeLabel: document.getElementById('transposeLabel'),
            transposeControls: document.getElementById('transposeControls'),
            btnFullscreen: document.getElementById('btnFullscreen'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            addToCategoryWrap: document.getElementById('addToCategoryWrap'),
            autocompleteList: document.getElementById('autocompleteList'),
            fileInput: document.createElement('input'),
            imageSelectorModal: document.createElement('div'),
            mainFab: document.getElementById('mainFab'),
            fabMenu: document.getElementById('fabMenu'),
            fabIcon: document.getElementById('fabIcon'),
            fabCamera: document.getElementById('fabCamera'),
            fabDrive: document.getElementById('fabDrive'),
            cameraInput: document.getElementById('cameraInput'),
            renameModal: document.getElementById('renameModal'),
            renameInput: document.getElementById('renameInput'),
            cancelRenameBtn: document.getElementById('cancelRenameBtn'),
            confirmRenameBtn: document.getElementById('confirmRenameBtn')
        };

        this.initImageSelectorModal();
        this.initFAB();
        this.initRenameModal();

        this.syncService = new SyncService(this.driveService);

        this.init();
    }

    initImageSelectorModal() {
        this.dom.imageSelectorModal.className = 'fixed inset-0 z-[60] hidden bg-black/90 flex flex-col p-6';
        this.dom.imageSelectorModal.innerHTML = `
            <div class="flex flex-col gap-4 mb-4 max-w-4xl mx-auto w-full h-full">
                <div class="flex justify-between items-center">
                    <h3 class="text-xl font-bold text-white">Selecionar Imagem</h3>
                    <button id="closeImgSel" class="text-slate-400 hover:text-white text-2xl"><i class="fas fa-times"></i></button>
                </div>
                
                <div class="relative">
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                    <input type="text" id="driveImgSearch" class="w-full bg-slate-800 border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium" placeholder="Pesquisar imagem..." autofocus>
                </div>

                <div id="driveImagesGrid" class="flex-1 overflow-y-auto min-h-0 bg-slate-900/50 rounded-xl border border-slate-700/50 p-2 space-y-1">
                    <div class="text-center text-slate-500 py-10">Carregando...</div>
                </div>
            </div>
        `;
        document.body.appendChild(this.dom.imageSelectorModal);

        this.dom.imageSelectorModal.querySelector('#closeImgSel').onclick = () => {
            this.dom.imageSelectorModal.classList.add('hidden');
        };

        // Search Logic
        const searchInput = this.dom.imageSelectorModal.querySelector('#driveImgSearch');
        searchInput.addEventListener('input', (e) => this.filterDriveImages(e.target.value));
    }

    initFAB() {
        if (!this.dom.mainFab) return;

        let isOpen = false;
        const toggleMenu = () => {
            isOpen = !isOpen;
            if (isOpen) {
                this.dom.fabMenu.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none', 'scale-90');
                this.dom.fabIcon.classList.add('rotate-45');
            } else {
                this.dom.fabMenu.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none', 'scale-90');
                this.dom.fabIcon.classList.remove('rotate-45');
            }
        };

        this.dom.mainFab.addEventListener('click', toggleMenu);

        // Drive Action
        this.dom.fabDrive?.addEventListener('click', () => {
            toggleMenu();
            this.openDriveImageSelector();
        });

        // Camera Action
        this.dom.fabCamera?.addEventListener('click', () => {
            toggleMenu();
            this.dom.cameraInput.click();
        });

        // Camera Input Change
        this.dom.cameraInput?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleCameraImage(e.target.files[0]);
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (isOpen && !e.target.closest('#mainFab') && !e.target.closest('#fabMenu')) {
                toggleMenu();
            }
        });
    }

    initRenameModal() {
        if (!this.dom.renameModal) return;

        const close = () => {
            this.dom.renameModal.classList.add('hidden');
            this.pendingRename = null;
        };

        this.dom.cancelRenameBtn.addEventListener('click', close);

        this.dom.confirmRenameBtn.addEventListener('click', () => {
            if (this.pendingRename && this.dom.renameInput.value.trim()) {
                this.saveRename(this.pendingRename.idx, this.pendingRename.isLocal, this.dom.renameInput.value.trim());
                close();
            }
        });

        this.dom.renameModal.addEventListener('click', (e) => {
            if (e.target === this.dom.renameModal) close();
        });
    }

    handleCameraImage(file) {
        // Show indicator
        this.dom.loadingIndicator.classList.remove('hidden');
        this.dom.loadingIndicator.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin text-4xl text-indigo-500 mb-4"></i><p class="text-slate-400">Enviando para o Drive...</p></div>';

        // 1. Upload to Drive
        this.driveService.uploadFile(file).then(uploadedFile => {
            // 2. Add to Local State (using Drive ID now)
            const newFile = {
                id: uploadedFile.id,
                name: uploadedFile.name,
                mimeType: uploadedFile.mimeType,
                thumbnailLink: uploadedFile.thumbnailLink,
                webViewLink: uploadedFile.webViewLink,
                // treating as if it was in the category list like any other drive file
            };

            this.addCifraToCategory(newFile, this.selectedCategory);

            // 3. Sync State to Cloud
            this.syncService.saveToCloud();

            this.dom.loadingIndicator.classList.add('hidden');
            this.renderSongs();

            alert("Imagem salva no Drive e sincronizada!");

        }).catch(err => {
            console.error(err);
            this.dom.loadingIndicator.classList.add('hidden');
            alert("Erro ao enviar imagem: " + err.message);
        });
    }

    init() {
        this.renderCategories();
        this.setupEventListeners();
        this.updateAuthUI(false);
    }

    setupEventListeners() {
        this.dom.sidebarToggle?.addEventListener('click', () => this.toggleSidebar());
        this.dom.sidebarBackdrop?.addEventListener('click', () => this.toggleSidebar());
        this.dom.loginBtn?.addEventListener('click', () => this.authService.signIn());
        this.dom.logoutBtn?.addEventListener('click', () => {
            if (confirm("Sair da conta?")) {
                this.authService.signOut();
                window.location.reload();
            }
        });

        // Admin Toggle Listener
        document.getElementById('adminToggleBtn')?.addEventListener('click', () => {
            this.isEditMode = !this.isEditMode;
            const btn = document.getElementById('adminToggleBtn');
            if (this.isEditMode) {
                btn.classList.add('bg-indigo-600', 'text-white', 'border-indigo-500');
                btn.classList.remove('text-slate-400', 'bg-slate-800/50');
            } else {
                btn.classList.remove('bg-indigo-600', 'text-white', 'border-indigo-500');
                btn.classList.add('text-slate-400', 'bg-slate-800/50');
            }
            this.renderCategories();
        });
        this.dom.searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.dom.searchInput?.addEventListener('blur', () => setTimeout(() => this.dom.autocompleteList.classList.add('hidden'), 200));

        this.dom.categoryList.addEventListener('click', (e) => {
            const catBtn = e.target.closest('[data-category]');
            if (catBtn) this.selectCategory(catBtn.dataset.category);
            if (e.target.closest('.delete-cat-btn')) {
                e.stopPropagation();
                this.deleteCategory(e.target.closest('.delete-cat-btn').dataset.idx);
            }
            if (e.target.closest('.toggle-public-btn')) {
                e.stopPropagation();
                this.toggleCategoryPublic(e.target.closest('.toggle-public-btn').dataset.idx);
            }
            if (e.target.id === 'addCategoryBtn') this.promptAddCategory(e.target.closest('li'));
        });

        this.dom.songGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.song-card');
            const actionBtn = e.target.closest('.swipe-action-btn');

            if (actionBtn) {
                e.stopPropagation();
                const action = actionBtn.dataset.action;
                const wrapper = actionBtn.closest('.song-wrapper');
                if (!wrapper) return;

                const idx = parseInt(wrapper.dataset.idx);
                const isLocal = wrapper.dataset.islocal === 'true';

                if (action === 'delete') {
                    this.removeSongFromCategory(idx, isLocal);
                } else if (action === 'save') {
                    // Get current name from the dataset of the CARD inside the wrapper
                    const card = wrapper.querySelector('.song-card');
                    const name = card.dataset.name;
                    this.openRenameModal(idx, isLocal, name);
                }
                return;
            }

            if (card) {
                // Determine context (Public vs Local) based on wrapper
                const wrapper = card.closest('.song-wrapper');
                if (!wrapper) return; // Should not happen

                // Check if card was just swiped (don't open if snapping back) -- optional check, but usually click fires.
                // Assuming normal click

                // Get index and type
                const idx = parseInt(wrapper.dataset.idx);
                const isLocal = wrapper.dataset.islocal === 'true';

                // Call new unified opener with navigation support
                this.openImageViewer(idx, isLocal);
            }
        });

        this.dom.closeModal?.addEventListener('click', () => this.closeModal());
        this.dom.btnTransposeUp?.addEventListener('click', () => this.changeTranspose(1));
        this.dom.btnTransposeDown?.addEventListener('click', () => this.changeTranspose(-1));
        this.dom.btnFullscreen?.addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('refreshBtn')?.addEventListener('click', () => window.location.reload());

        // Header Public Switch Listener
        document.getElementById('headerPublicToggle')?.addEventListener('click', () => {
            // 1. Check Custom Categories
            let catIndex = this.customCategories.findIndex(c => c.id === this.selectedCategory);

            if (catIndex >= 0) {
                // Update Existing Custom Category (or Fixed Override)
                this.customCategories[catIndex].isPublic = !this.customCategories[catIndex].isPublic;
            } else {
                // 2. Check if it's a Fixed Category that hasn't been saved yet
                const fixed = UI_CONFIG.FIXED_CATEGORIES.find(c => c.id === this.selectedCategory);
                if (fixed) {
                    // Create new override entry
                    this.customCategories.push({
                        id: fixed.id,
                        name: fixed.name,
                        isPublic: true // Toggle from default False to True
                    });
                }
            }

            // Save and Refresh
            StorageService.setCustomCategories(this.customCategories);
            this.syncService.saveToCloud();

            // Update UI
            this.updateHeaderSwitch();
            this.renderCategories();
        });

        this.dom.addToCategoryWrap.addEventListener('click', (e) => {
            if (e.target.id === 'btnAddToCategory') {
                if (this.currentCifraMeta) {
                    this.addCifraToCategory(this.currentCifraMeta, this.selectedCategory);
                    this.closeModal();
                    this.renderSongs();
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.dom.imageSelectorModal.classList.add('hidden');
                // Check if image viewer needs closing too? Handled inside openImageModal logic
            }
        });
    }

    openImageModal(url, name, isLocal = false) {
        const existingOverlay = document.getElementById('imageViewerOverlay');
        if (existingOverlay) existingOverlay.remove();

        const overlay = document.createElement('div');
        overlay.id = 'imageViewerOverlay';
        overlay.className = 'fixed inset-0 z-[70] bg-black flex flex-col animate-fade-in touch-none'; // touch-none prevents browser zoom/scroll interference

        // Floating Controls Container (Top)
        const controls = document.createElement('div');
        controls.className = 'absolute top-0 left-0 right-0 p-4 flex items-start justify-between z-30 pointer-events-none transition-opacity duration-300';
        controls.style.background = 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)';

        // Close Button (Small floating X) - Optional/Visual cue since we have swipe
        // Kept for desktop accessibility
        controls.innerHTML = `
            <button id="closeImgViewer" class="pointer-events-auto w-10 h-10 flex items-center justify-center text-white/70 hover:text-white bg-black/20 hover:bg-black/50 backdrop-blur rounded-full transition-all">
                <i class="fas fa-arrow-left"></i>
            </button>

            <div class="pointer-events-auto flex flex-col items-end gap-2">
                 <button id="btnOCR" class="px-4 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur flex items-center gap-2 transition-all">
                    <i class="fas fa-magic"></i>
                    <span>Ler Acordes</span>
                 </button>
                 <span id="ocrStatus" class="text-[10px] text-white/80 font-mono hidden bg-black/50 px-2 py-1 rounded">Aguardando...</span>

                 <!-- Transpose Controls (Initially Hidden) -->
                 <div id="ocrControls" class="hidden flex items-center gap-1 bg-black/60 backdrop-blur rounded-full p-1 border border-white/10">
                    <button id="imgTranspDown" class="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full"><i class="fas fa-minus"></i></button>
                    <span id="imgTranspVal" class="text-sm font-bold text-indigo-400 w-8 text-center">+0</span>
                    <button id="imgTranspUp" class="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full"><i class="fas fa-plus"></i></button>
                 </div>
            </div>
        `;

        // Image Container
        const content = document.createElement('div');
        content.className = 'flex-1 flex items-center justify-center relative bg-black overflow-hidden';
        content.id = 'imgContainer';

        const wrapper = document.createElement('div');
        wrapper.className = 'relative inline-block transition-transform duration-200';

        const img = document.createElement('img');
        img.src = url;
        img.className = 'max-w-full max-h-screen object-contain select-none';
        img.id = 'targetImage';
        img.draggable = false;

        wrapper.appendChild(img);
        content.appendChild(wrapper);

        overlay.appendChild(controls);
        overlay.appendChild(content);
        document.body.appendChild(overlay);

        // --- Logic: Swipe to Close ---
        let touchStartY = 0;
        let touchEndY = 0;

        const closeViewer = () => {
            overlay.classList.add('opacity-0');
            setTimeout(() => {
                overlay.remove();
                if (isLocal && url.startsWith('blob:')) URL.revokeObjectURL(url);
            }, 300);
        };

        const controlsDiv = controls;

        overlay.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        overlay.addEventListener('touchmove', (e) => {
            // Optional: visual feedback (drag down effect)
            touchEndY = e.touches[0].clientY;
            let delta = touchEndY - touchStartY;
            if (delta > 0) {
                // Fade out controls as you drag
                controlsDiv.style.opacity = Math.max(0, 1 - delta / 200);
                // Translate image slightly
                wrapper.style.transform = `translateY(${delta / 2}px)`;
            }
        }, { passive: true });

        overlay.addEventListener('touchend', (e) => {
            touchEndY = e.changedTouches[0].clientY;
            const delta = touchEndY - touchStartY;

            // Threshold for swipe down (e.g. 150px)
            if (delta > 150) {
                closeViewer();
            } else {
                // Reset
                wrapper.style.transform = '';
                controlsDiv.style.opacity = '1';
            }
        });

        // Manual Close
        controls.querySelector('#closeImgViewer').onclick = closeViewer;


        // --- Logic: OCR & Transpose (Same as before but updated selectors) ---
        const statusSpan = controls.querySelector('#ocrStatus');
        const btnOCR = controls.querySelector('#btnOCR');
        const ocrControls = controls.querySelector('#ocrControls');
        let detectedChords = [];
        let currentShift = 0;

        btnOCR.onclick = async () => {
            if (typeof Tesseract === 'undefined') {
                alert("Erro: Tesseract offline.");
                return;
            }

            btnOCR.disabled = true;
            btnOCR.classList.add('opacity-50');
            statusSpan.classList.remove('hidden');
            statusSpan.textContent = "Carregando IA...";

            try {
                const worker = await Tesseract.createWorker('eng');
                statusSpan.textContent = "Lendo imagem...";
                const ret = await worker.recognize(img);
                statusSpan.textContent = "Identificando...";

                const words = ret.data.words;
                const regexChord = /^[A-G](#|b)?(m|maj|min|sus|dim|aug|add)?[0-9]*(\/[A-G](#|b)?)?$/;

                // Reset
                wrapper.querySelectorAll('.chord-overlay').forEach(el => el.remove());
                detectedChords = [];
                let foundCount = 0;

                words.forEach(w => {
                    const text = w.text.trim().replace(/[.,;:]+$/, '');

                    if (regexChord.test(text) && text.length < 10) {
                        foundCount++;
                        // Calculate positions based on original image dimensions
                        // Tesseract bbox is based on natural image size
                        // We use % relative to the image container (wrapper) which matches image size

                        // We assume image is fully loaded for naturalWidth/Height to be correct
                        // Ret.data gives us image dimensions too
                        const imgW = ret.data.imageColorHeaders[0].w || img.naturalWidth;
                        const imgH = ret.data.imageColorHeaders[0].h || img.naturalHeight;

                        const leftPct = (w.bbox.x0 / imgW) * 100;
                        const topPct = (w.bbox.y0 / imgH) * 100;
                        const widthPct = ((w.bbox.x1 - w.bbox.x0) / imgW) * 100;
                        const heightPct = ((w.bbox.y1 - w.bbox.y0) / imgH) * 100;

                        const overlayEl = document.createElement('div');
                        overlayEl.className = 'chord-overlay absolute flex items-center justify-center bg-[#131620] text-emerald-400 font-bold border border-emerald-500/50 rounded shadow-lg z-10 cursor-help transform transition-transform hover:scale-125';
                        overlayEl.style.left = leftPct + '%';
                        overlayEl.style.top = topPct + '%';
                        // Add slight padding to box
                        overlayEl.style.width = Math.max(widthPct, 2.5) + '%';
                        overlayEl.style.height = Math.max(heightPct, 3.0) + '%';
                        overlayEl.style.fontSize = 'clamp(10px, 2vw, 24px)';

                        overlayEl.textContent = text;
                        wrapper.appendChild(overlayEl); // Append to wrapper so it scales with image

                        detectedChords.push({ original: text, el: overlayEl });
                    }
                });

                statusSpan.textContent = `Encontrados: ${foundCount}`;
                setTimeout(() => statusSpan.classList.add('hidden'), 2000);

                ocrControls.classList.remove('hidden');
                btnOCR.classList.add('hidden');

                await worker.terminate();

            } catch (err) {
                console.error(err);
                statusSpan.textContent = "Erro!";
                alert(err.message);
                btnOCR.disabled = false;
                btnOCR.classList.remove('opacity-50');
            }
        };

        const updateOverlays = () => {
            controls.querySelector('#imgTranspVal').textContent = (currentShift > 0 ? '+' : '') + currentShift;
            detectedChords.forEach(item => {
                if (currentShift === 0) {
                    item.el.textContent = item.original;
                    item.el.className = item.el.className.replace('text-indigo-400 border-indigo-500/90', 'text-emerald-400 border-emerald-500/50');
                } else {
                    item.el.textContent = Transposer.transposeNote(item.original, currentShift);
                    item.el.className = item.el.className.replace('text-emerald-400 border-emerald-500/50', 'text-indigo-400 border-indigo-500/90');
                }
            });
        };

        controls.querySelector('#imgTranspUp').onclick = () => { currentShift++; updateOverlays(); };
        controls.querySelector('#imgTranspDown').onclick = () => { currentShift--; updateOverlays(); };
    }

    async openImageViewer(startIndex, isLocalContext) {
        // 1. Resolve the list of images
        let list = [];
        if (this.selectedCategory === 'publicas') {
            list = this.driveImagesCache.map(f => ({
                name: f.name.replace(/\.[^/.]+$/, ""),
                url: null, // Will fetch on demand
                id: f.id,
                isLocal: false
            }));
        } else if (isLocalContext) {
            const files = this.localFileService.getFiles(this.selectedCategory);
            list = files.map(f => ({
                name: f.name,
                url: f.url,
                id: f.id,
                isLocal: true,
                mimeType: f.mimeType
            }));
        } else {
            // Drive Cifras in non-public category
            const files = this.cifrasPorCategoria[this.selectedCategory] || [];
            list = files.map(f => ({
                name: f.name,
                url: null,
                id: f.id,
                isLocal: false
            }));
        }

        if (list.length === 0) return;

        let currentIndex = startIndex;

        // Overlay Setup
        const overlay = document.createElement('div');
        overlay.id = 'imageViewerOverlay';
        overlay.className = 'fixed inset-0 z-[100] bg-black flex flex-col touch-none animate-fade-in';

        // Fullscreen Toggle
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => { });
        }

        // Minimal Controls
        const controls = document.createElement('div');
        controls.className = 'absolute top-0 right-0 p-4 z-50 flex gap-4 transition-opacity duration-500 opacity-0 pointer-events-none';
        controls.innerHTML = `
            <button id="btnCloseViewer" class="pointer-events-auto w-10 h-10 rounded-full bg-black/40 text-white/70 hover:text-white backdrop-blur flex items-center justify-center">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Image Wrapper
        const imgContainer = document.createElement('div');
        imgContainer.className = 'flex-1 flex items-center justify-center relative overflow-hidden';

        const img = document.createElement('img');
        img.className = 'max-w-full max-h-screen object-contain select-none transition-transform duration-200';
        img.draggable = false;
        imgContainer.appendChild(img);

        overlay.appendChild(controls);
        overlay.appendChild(imgContainer);
        document.body.appendChild(overlay);

        // State for swipe/zoom
        let touchStart = { x: 0, y: 0 };
        let activeRequests = 0;

        // --- Functions ---
        const loadImage = async (idx) => {
            if (idx < 0 || idx >= list.length) return;

            // Show loading
            img.style.opacity = '0.5';

            const item = list[idx];
            let src = item.url;

            if (!src && !item.isLocal) {
                // Fetch from Drive
                try {
                    activeRequests++;
                    const content = await this.driveService.getFileContent(item.id); // blob from getFileContent? 
                    // Wait, getFileContent returns text currently? check logic. 
                    // Previous openDriveItem called getFileContent. Let's assume it handles blob logic if implemented correctly or returns base64.
                    // IMPORTANT: driveService.getFileContent in Step 92 returns TEXT. logic might be flawed if not updated.
                    // The previous implementation of openDriveItem in Step 173 fetched blob? No, 'alt=media' returns binary. fetch().text() corrupts it.
                    // I need to use .blob() in drive service or handle it here.
                    // Let's implement a direct fetch here to be safe or fix DriveService later.
                    // For 'alt=media' we need .blob().

                    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${item.id}?alt=media`, {
                        headers: { 'Authorization': 'Bearer ' + this.authService.getToken() }
                    });
                    const blob = await res.blob();
                    src = URL.createObjectURL(blob);
                    item.tempUrl = src; // cache it
                } catch (e) {
                    console.error("Erro loading image", e);
                } finally {
                    activeRequests--;
                }
            } else if (item.tempUrl) {
                src = item.tempUrl;
            }

            if (idx === currentIndex) {
                img.src = src;
                img.style.opacity = '1';
                // Update controls visibility mainly on tap
            }
        };

        const closeViewer = () => {
            // Cleanup temp urls
            list.forEach(i => { if (i.tempUrl) URL.revokeObjectURL(i.tempUrl); });
            if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
            overlay.classList.add('opacity-0');
            setTimeout(() => overlay.remove(), 300);
        };

        // --- Event Listeners ---
        controls.querySelector('#btnCloseViewer').onclick = closeViewer;

        // Show/Hide controls on tap
        let tapTimeout;
        imgContainer.addEventListener('click', () => {
            controls.classList.toggle('opacity-0');
            if (!controls.classList.contains('opacity-0')) {
                clearTimeout(tapTimeout);
                tapTimeout = setTimeout(() => controls.classList.add('opacity-0'), 3000);
            }
        });

        // Swipe Navigation
        overlay.addEventListener('touchstart', (e) => {
            touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }, { passive: true });

        overlay.addEventListener('touchend', (e) => {
            const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
            const deltaX = touchEnd.x - touchStart.x;
            const deltaY = touchEnd.y - touchStart.y;

            // Horizontal Swipe (Nav) - threshold 50px
            if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0) {
                    // Swipe Right -> Prev
                    if (currentIndex > 0) {
                        currentIndex--;
                        loadImage(currentIndex);
                    }
                } else {
                    // Swipe Left -> Next
                    if (currentIndex < list.length - 1) {
                        currentIndex++;
                        loadImage(currentIndex);
                    }
                }
            }
            // Vertical Swipe (Down) -> Close
            else if (deltaY > 100 && Math.abs(deltaY) > Math.abs(deltaX)) {
                closeViewer();
            }
        });

        // Initial Load
        loadImage(currentIndex);
    }



    updateAuthUI(isAuthenticated) {
        if (isAuthenticated) {
            this.dom.loginBtn.classList.add('hidden');
            this.dom.userSection.classList.remove('hidden');
            this.dom.loadingIndicator.classList.remove('hidden');


            // Show User Info
            const email = this.authService.getUserEmail();
            this.dom.userName.textContent = email || 'Usuário';
            this.dom.userAvatar.src = 'https://ui-avatars.com/api/?background=random&color=fff&name=' + (email || 'U');

            // Show Admin Toggle if Admin
            const isAdmin = CONFIG.ADMIN_EMAILS.includes(email);
            const adminBtn = document.getElementById('adminToggleBtn');
            if (isAdmin && adminBtn) {
                adminBtn.classList.remove('hidden');
            }

            // Load Cloud Data First
            this.syncService.loadFromCloud().then(() => {
                this.renderCategories(); // Update List with Cloud Data
                this.loadData();
                this.updateHeaderSwitch(); // Setup initial switch state
            });

        } else {
            this.dom.loginBtn.classList.remove('hidden');
            this.dom.userSection.classList.add('hidden');
            this.renderSongs();
        }
    }

    async loadData() {
        try {
            this.allCifras = await this.driveService.listFiles();
            this.dom.loadingIndicator.classList.add('hidden');
            this.renderSongs();
        } catch (e) {
            console.error(e);
            this.dom.loadingIndicator.innerHTML = '<span class="text-red-400">Erro ao carregar arquivos do Drive.</span>';
        }
    }

    renderCategories() {
        const currentUserEmail = this.authService.getUserEmail();
        const isAdmin = CONFIG.ADMIN_EMAILS.includes(currentUserEmail);

        let html = '';

        // 1. Fixed Categories
        UI_CONFIG.FIXED_CATEGORIES.forEach(fixedCat => {
            // Check for override in customCategories
            const override = this.customCategories.find(c => c.id === fixedCat.id);
            const isPublic = override ? override.isPublic : false; // Default false

            // Guest Filter: Only show if public
            if (!isAdmin && !isPublic) return;

            const active = this.selectedCategory === fixedCat.id ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'text-slate-400 hover:bg-slate-800/50 border-transparent';

            html += `
                <li class="group relative flex items-center pr-2">
                    <button data-category="${fixedCat.id}" class="w-full text-left px-4 py-3 rounded-xl border ${active} transition-all duration-200 flex items-center gap-3">
                        <i class="fas ${isPublic ? 'fa-globe text-emerald-500/70' : 'fa-lock text-slate-500/70'} text-sm"></i>
                        <span class="font-medium flex-1">${fixedCat.name}</span>
                    </button>
                </li>`;
        });

        // 2. Custom Categories (excluding any that match Fixed IDs to avoid dupes)
        this.customCategories.forEach((cat, idx) => {
            // Skip if this is actually a fixed category override
            if (UI_CONFIG.FIXED_CATEGORIES.some(fc => fc.id === cat.id)) return;

            // Guest Filter: Only show if public
            if (!isAdmin && !cat.isPublic) return;

            const active = this.selectedCategory === cat.id ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'text-slate-400 hover:bg-slate-800/50 border-transparent';

            html += `
                <li class="group relative flex items-center pr-2">
                    <button data-category="${cat.id}" class="flex-1 text-left px-4 py-3 rounded-xl border ${active} transition-all duration-200 flex items-center gap-3 min-w-0">
                        <i class="fas ${cat.isPublic ? 'fa-globe text-emerald-500/70' : 'fa-lock text-slate-500/70'} text-sm"></i>
                        <span class="font-medium truncate">${cat.name}</span>
                    </button>
                    <!-- Delete Button (Admin Only AND Edit Mode) -->
                    ${(isAdmin && this.isEditMode) ? `
                        <div class="flex items-center gap-1">
                             <button data-idx="${idx}" class="delete-cat-btn text-slate-500 hover:text-red-400 p-2 transition-all opacity-0 group-hover:opacity-100">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    ` : ''}
                </li>`;
        });

        // 3. Add Button (Admin Only AND Edit Mode)
        if (isAdmin && this.isEditMode) {
            html += `
                <li>
                    <button id="addCategoryBtn" class="w-full text-left px-4 py-3 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/50 transition-all duration-200 flex items-center gap-3">
                        <i class="fas fa-plus"></i>
                        <span>Nova Categoria</span>
                    </button>
                </li>
            `;
        }

        this.dom.categoryList.innerHTML = html;
        this.dom.categoryTitle.textContent = this.getSelectedCategoryName();
    }

    getSelectedCategoryName() {
        const fixed = UI_CONFIG.FIXED_CATEGORIES.find(c => c.id === this.selectedCategory);
        if (fixed) return fixed.name;
        const custom = this.customCategories.find(c => c.id === this.selectedCategory);
        return custom ? custom.name : this.selectedCategory;
    }

    promptAddCategory(liElement) {
        liElement.innerHTML = `
            <div class="flex items-center gap-2 px-2">
                <input type="text" id="newCatInput" class="w-full bg-slate-800 border-slate-700 rounded p-2 text-white outline-none focus:border-indigo-500" placeholder="Nome..." autoFocus>
                <button id="confirmAddCat" class="text-emerald-400 p-2"><i class="fas fa-check"></i></button>
            </div>
        `;
        const input = liElement.querySelector('#newCatInput');
        const btn = liElement.querySelector('#confirmAddCat');
        const save = () => {
            if (input.value.trim()) {
                const id = input.value.trim().toLowerCase().replace(/\s+/g, '-');
                const name = input.value.trim();
                this.customCategories.unshift({ name, id });
                StorageService.setCustomCategories(this.customCategories);
                this.selectCategory(id);
                this.syncService.saveToCloud();
            }
            this.renderCategories();
        };
        btn.onclick = save;
        input.onkeydown = (e) => { if (e.key === 'Enter') save(); };
        input.focus();
    }

    deleteCategory(idx) {
        if (confirm('Excluir categoria?')) {
            const deletedId = this.customCategories[idx].id;
            this.customCategories.splice(idx, 1);
            StorageService.setCustomCategories(this.customCategories);
            this.syncService.saveToCloud();
            if (this.selectedCategory === deletedId) {
                this.selectedCategory = UI_CONFIG.FIXED_CATEGORIES[0].id;
            }
            this.renderCategories();
            this.renderSongs();
        }
    }

    toggleCategoryPublic(idx) {
        if (this.customCategories[idx]) {
            this.customCategories[idx].isPublic = !this.customCategories[idx].isPublic;
            StorageService.setCustomCategories(this.customCategories);
            this.syncService.saveToCloud();
            this.renderCategories();
        }
    }

    selectCategory(id) {
        this.selectedCategory = id;
        this.renderCategories();
        this.renderSongs();
        this.updateHeaderSwitch(); // Update switch state for new tab
        if (window.innerWidth < 1024) this.toggleSidebar();
    }

    updateHeaderSwitch() {
        const btn = document.getElementById('headerPublicToggle');
        const circle = document.getElementById('headerPublicToggleCircle');
        if (!btn || !circle) return;

        // Find current category
        const cat = this.customCategories.find(c => c.id === this.selectedCategory);

        // Show only if we have a valid custom category and user is Admin
        const email = this.authService.getUserEmail();
        const isAdmin = CONFIG.ADMIN_EMAILS.includes(email);

        if (cat && isAdmin) {
            btn.classList.remove('hidden');
            if (cat.isPublic) {
                btn.classList.remove('bg-slate-700');
                btn.classList.add('bg-emerald-500');
                circle.classList.remove('translate-x-0');
                circle.classList.add('translate-x-6');
            } else {
                btn.classList.add('bg-slate-700');
                btn.classList.remove('bg-emerald-500');
                circle.classList.add('translate-x-0');
                circle.classList.remove('translate-x-6');
            }
        } else {
            btn.classList.add('hidden');
        }
    }

    async renderSongs() {
        const grid = this.dom.songGrid;
        grid.innerHTML = '';

        if (this.selectedCategory === 'publicas') {
            // Logic for Public Category (All Drive Images)
            if (!this.driveImagesCache) {
                grid.innerHTML = '<div class="col-span-full text-center text-slate-500 py-10"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><br>Carregando todas as imagens...</div>';
                try {
                    this.driveImagesCache = await this.driveService.listImages();
                    // Sort alphabetically
                    this.driveImagesCache.sort((a, b) => a.name.localeCompare(b.name));
                    this.renderSongs(); // Re-render with data
                } catch (e) {
                    grid.innerHTML = '<div class="col-span-full text-center text-red-400">Erro ao carregar imagens públicas.</div>';
                }
                return;
            }

            if (this.driveImagesCache.length === 0) {
                grid.innerHTML = '<div class="col-span-full text-center text-slate-500 py-10">Nenhuma imagem encontrada na pasta pública.</div>';
                return;
            }

            // Render Drive Images
            const renderCard = (file, idx) => `
            <div class="song-card group relative bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 hover:border-indigo-500/50 rounded-2xl p-4 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer overflow-hidden animate-fade-in" 
                data-idx="${idx}" 
                data-fileid="${file.id}" 
                data-name="${file.name.replace(/\.[^/.]+$/, "")}"
                data-islocal="false"
                data-public="true">
                <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-pink-500 to-rose-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300">
                        <i class="fas fa-globe"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-slate-200 truncate group-hover:text-white transition-colors">${file.name.replace(/\.[^/.]+$/, "")}</h3>
                        <p class="text-xs text-slate-500 truncate mt-1">Pasta Pública (Drive)</p>
                    </div>
                </div>
            </div>`;

            this.driveImagesCache.forEach((file, idx) => {
                grid.innerHTML += renderCard(file, idx);
            });
            return;
        }

        // Standard Logic (Local Storage Categories)
        const driveList = this.cifrasPorCategoria[this.selectedCategory] || [];
        const localList = this.localFileService.getFiles(this.selectedCategory);

        const renderCard = (file, isLocal, idx) => `
            <div class="song-wrapper relative group select-none touch-pan-y" data-idx="${idx}" data-islocal="${isLocal}">
                <!-- Background Actions (Mobile Swipe) -->
                <div class="absolute inset-0 flex items-center justify-between px-4 z-0 bg-slate-800/50 rounded-2xl lg:hidden">
                    <div class="flex gap-2">
                        <!-- Left Action Placeholder if needed -->
                    </div>
                    
                    <div class="flex gap-2">
                         <button class="swipe-action-btn w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors" data-action="save">
                            <i class="fas fa-pen"></i>
                         </button>
                         <button class="swipe-action-btn w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" data-action="delete">
                            <i class="fas fa-trash"></i>
                         </button>
                    </div>
                </div>

                <!-- Content Card (Draggable) -->
                <div class="song-card relative z-10 bg-[#151925] border border-slate-700/50 rounded-2xl p-4 transition-transform duration-200 cursor-pointer shadow-sm group-hover:border-indigo-500/30"
                    data-url="${isLocal ? file.url : ''}"
                    data-fileid="${file.id}"
                    data-name="${file.name}">
                    
                    <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${isLocal ? 'from-emerald-500 to-teal-500' : 'from-indigo-500 to-purple-500'} opacity-80"></div>
                    
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-lg ${isLocal ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'} flex items-center justify-center text-xl shrink-0">
                            <i class="fas ${isLocal || file.mimeType?.includes('image') ? 'fa-image' : 'fa-file-audio'}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="song-name font-bold text-slate-200 truncate group-hover:text-white transition-colors">${file.name.replace(/\.[^/.]+$/, "")}</h3>
                            <p class="text-xs text-slate-500 truncate mt-1">${isLocal ? 'Arquivo Local' : 'Google Drive'}</p>
                        </div>
                        
                        <!-- Desktop Actions (Hover) -->
                        <div class="hidden lg:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="swipe-action-btn w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all" data-action="save" title="Renomear">
                                <i class="fas fa-pen text-xs"></i>
                            </button>
                            <button class="swipe-action-btn w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all" data-action="delete" title="Excluir">
                                <i class="fas fa-trash text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;


        // Initialize html string
        let html = '';

        // Button open Drive Image Selector


        if (driveList.length === 0 && localList.length === 0) {
            html += `
            <div class="col-span-full flex flex-col items-center justify-center text-slate-500 py-10">
                <p class="text-sm opacity-60">Nenhuma cifra aqui ainda.</p>
            </div> `;
        } else {
            html += localList.map((f, i) => renderCard(f, true, i)).join('');
            html += driveList.map((f, i) => renderCard(f, false, i)).join('');
        }

        this.dom.songGrid.innerHTML = html;


        this.setupSwipeHandlers();

        // Removed the "Add from Drive" button logic here since it's on FAB now
        // const btn = document.getElementById('openDriveSelBtn');
        // if (btn) btn.addEventListener('click', () => this.openDriveImageSelector());
    }

    setupSwipeHandlers() {
        const wrappers = this.dom.songGrid.querySelectorAll('.song-wrapper');

        wrappers.forEach(wrapper => {
            const card = wrapper.querySelector('.song-card');
            let startX = 0;
            let currentX = 0;
            let isDragging = false;
            const threshold = -80; // Distance to open
            const maxSwipe = -120;

            const updateTransform = (x) => {
                card.style.transform = `translateX(${x}px)`;
            };

            wrapper.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                // If already open, start from open position?
                // For simplicity, let's assume auto-close other rows?
                // Or just handle current state.
                const style = window.getComputedStyle(card);
                const matrix = new WebKitCSSMatrix(style.transform);
                currentX = matrix.m41;
                isDragging = true;
                card.style.transition = 'none';
            }, { passive: true });

            wrapper.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                const x = e.touches[0].clientX;
                const delta = x - startX;

                // Only allow swiping left (negative delta)
                // If closed (currentX is 0), limit right swipe
                let newX = currentX + delta;
                if (newX > 0) newX = 0;
                if (newX < maxSwipe) newX = maxSwipe; // Limit max swipe

                updateTransform(newX);
            }, { passive: true });

            wrapper.addEventListener('touchend', (e) => {
                isDragging = false;
                card.style.transition = 'transform 0.2s ease-out';

                // Determine snap position
                const endX = e.changedTouches[0].clientX;
                const delta = endX - startX;
                const finalX = currentX + delta; // roughly where we are

                if (finalX < threshold) {
                    // Snap open
                    updateTransform(-100); // 100px width for buttons area
                } else {
                    // Snap closed
                    updateTransform(0);
                }
            });
        });
    }

    openRenameModal(idx, isLocal, currentName) {
        this.pendingRename = { idx, isLocal };
        this.dom.renameModal.classList.remove('hidden');
        this.dom.renameInput.value = currentName;
        setTimeout(() => this.dom.renameInput.focus(), 100);
    }

    saveRename(idx, isLocal, newName) {
        if (isLocal) {
            const files = this.localFileService.getFiles(this.selectedCategory);
            if (files[idx]) {
                files[idx].name = newName;
                this.localFileService.saveFiles(this.selectedCategory, files);
            }
        } else {
            if (this.cifrasPorCategoria[this.selectedCategory] && this.cifrasPorCategoria[this.selectedCategory][idx]) {
                this.cifrasPorCategoria[this.selectedCategory][idx].name = newName;
                StorageService.setCifrasPorCategoria(this.cifrasPorCategoria);
                this.syncService.saveToCloud();
            }
        }
        this.renderSongs();
    }

    async openDriveImageSelector() {
        this.dom.imageSelectorModal.classList.remove('hidden');
        const grid = this.dom.imageSelectorModal.querySelector('#driveImagesGrid');
        const searchInput = this.dom.imageSelectorModal.querySelector('#driveImgSearch');

        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }

        grid.innerHTML = '<div class="text-center text-slate-500 py-10 flex flex-col items-center gap-3"><i class="fas fa-spinner fa-spin text-2xl"></i><span>Carregando lista...</span></div>';

        try {
            // Cache images list to avoid re-fetching on search
            if (!this.driveImagesCache) {
                this.driveImagesCache = await this.driveService.listImages();
                // Sort alphabetically
                this.driveImagesCache.sort((a, b) => a.name.localeCompare(b.name));
            }
            this.renderDriveImagesList(this.driveImagesCache);

        } catch (e) {
            grid.innerHTML = `<div class="text-center text-red-400 py-10">Erro: ${e.message}</div>`;
        }
    }

    filterDriveImages(query) {
        if (!this.driveImagesCache) return;

        const q = query.toLowerCase().trim();
        const filtered = this.driveImagesCache.filter(img =>
            img.name.toLowerCase().includes(q)
        );
        this.renderDriveImagesList(filtered);
    }

    renderDriveImagesList(images) {
        const grid = this.dom.imageSelectorModal.querySelector('#driveImagesGrid');

        if (!images || images.length === 0) {
            grid.innerHTML = '<div class="text-center text-slate-500 py-10 opacity-60">Nenhuma imagem encontrada.</div>';
            return;
        }

        grid.innerHTML = images.map(img => {
            const nameClean = img.name.replace(/\.[^/.]+$/, ""); // Remove extension
            return `
            <div class="drive-img-item px-4 py-3 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors flex items-center gap-4 group border-b border-slate-800/50 last:border-0"
                data-fileid="${img.id}"
                data-name="${img.name}"
                data-mimetype="${img.mimeType}">
                
                <div class="w-10 h-10 rounded bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 group-hover:ring-2 ring-indigo-500/50 transition-all">
                    ${img.thumbnailLink ? `<img src="${img.thumbnailLink}" class="w-full h-full object-cover">` : '<i class="fas fa-image text-slate-600"></i>'}
                </div>
                
                <span class="text-slate-300 font-medium truncate flex-1 group-hover:text-white">${nameClean}</span>
                
                <button class="w-8 h-8 rounded-full bg-slate-800 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            `}).join('');

        Array.from(grid.querySelectorAll('.drive-img-item')).forEach(item => {
            item.addEventListener('click', () => {
                this.addCifraToCategory({
                    id: item.dataset.fileid,
                    name: item.dataset.name,
                    mimeType: item.dataset.mimetype
                }, this.selectedCategory);
                this.dom.imageSelectorModal.classList.add('hidden');
                this.renderSongs();
            });
        });
    }

    removeSongFromCategory(idx, isLocal) {
        if (isLocal) {
            const files = this.localFileService.getFiles(this.selectedCategory);
            const file = files[idx];
            if (file) this.localFileService.removeFile(this.selectedCategory, file.id);
        } else {
            if (!this.cifrasPorCategoria[this.selectedCategory]) return;
            this.cifrasPorCategoria[this.selectedCategory].splice(idx, 1);
            StorageService.setCifrasPorCategoria(this.cifrasPorCategoria);
            this.syncService.saveToCloud();
        }
        this.renderSongs();
    }

    addCifraToCategory(cifra, category) {
        if (!this.cifrasPorCategoria[category]) this.cifrasPorCategoria[category] = [];
        if (!this.cifrasPorCategoria[category].some(f => f.id === cifra.id)) {
            this.cifrasPorCategoria[category].push({
                id: cifra.id,
                name: cifra.name,
                mimeType: cifra.mimeType || 'text/plain'
            });
            StorageService.setCifrasPorCategoria(this.cifrasPorCategoria);
            this.syncService.saveToCloud();
        }
    }

    async openDriveItem(fileId, name) {
        const song = this.cifrasPorCategoria[this.selectedCategory]?.find(f => f.id === fileId);
        const savedMime = song?.mimeType;

        if (savedMime && savedMime === 'application/vnd.google-apps.folder') {
            // Handle folder?
            return;
        }

        if ((savedMime && savedMime.includes('image')) || name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            await this.openDriveImage(fileId, name);
        } else {
            await this.openCifra(fileId, name);
        }
    }

    async openDriveImage(fileId, name) {
        this.dom.modal.classList.remove('hidden');
        this.dom.modalTitle.textContent = name;
        this.dom.modalContent.innerHTML = '<div class="text-center py-20"><i class="fas fa-spinner fa-spin text-4xl text-indigo-500"></i><p class="mt-4 text-slate-400">Carregando imagem...</p></div>';
        this.dom.addToCategoryWrap.innerHTML = '';
        const controls = document.getElementById('btnTransposeUp')?.parentElement;
        if (controls) controls.style.display = 'none';

        try {
            const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
            const res = await fetch(url, {
                headers: { 'Authorization': 'Bearer ' + this.authService.getToken() }
            });
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);

            this.openImageModal(blobUrl, name);

        } catch (e) {
            this.dom.modalContent.innerHTML = `<div class="text-center text-red-400 py-10">Erro ao carregar imagem: ${e.message}</div>`;
        }
    }

    async openCifra(fileId, name) {
        this.dom.modal.classList.remove('hidden');
        this.dom.modalTitle.textContent = name;
        this.dom.modalContent.innerHTML = '<div class="text-center py-20"><i class="fas fa-spinner fa-spin text-4xl text-indigo-500"></i><p class="mt-4 text-slate-400">Carregando cifra...</p></div>';
        this.dom.addToCategoryWrap.innerHTML = '';
        this.currentTranspose = 0;
        this.updateTransposeLabel();

        const controls = document.getElementById('btnTransposeUp')?.parentElement;
        if (controls) controls.style.display = 'flex';

        this.currentCifraMeta = { id: fileId, name: name };

        try {
            const text = await this.driveService.getFileContent(fileId);
            this.cifraModalOriginal = text;
            this.renderCifraContent();

            this.dom.addToCategoryWrap.innerHTML = `
                <button id="btnAddToCategory" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 font-medium transition-all flex items-center gap-2">
                    <i class="fas fa-plus-circle"></i>
                    Adicionar a "${this.selectedCategory}"
                </button>
            `;

        } catch (e) {
            this.dom.modalContent.innerHTML = `<div class="text-center text-red-400 py-10">Erro ao carregar: ${e.message}</div>`;
        }
    }

    openImageModal(url, name, isLocal = false) {
        this.dom.modal.classList.remove('hidden');
        this.dom.modalTitle.textContent = name;
        this.dom.modalContent.innerHTML = '';
        this.dom.addToCategoryWrap.innerHTML = '';

        const controls = document.getElementById('btnTransposeUp')?.parentElement;
        if (controls) controls.style.display = 'none';

        const img = document.createElement('img');
        img.src = url;
        img.className = 'w-full h-auto object-contain max-h-[90vh] mx-auto';

        if (window.innerWidth < 768) {
            img.className = 'w-full h-full object-contain';
            this.dom.modalContent.className = 'flex items-center justify-center bg-black h-full p-0 overflow-hidden';
        } else {
            this.dom.modalContent.className = 'font-mono text-lg whitespace-pre-wrap leading-relaxed text-slate-300';
        }

        this.dom.modalContent.appendChild(img);
    }

    closeModal() {
        this.dom.modal.classList.add('hidden');
        if (document.fullscreenElement) document.exitFullscreen();
        this.dom.modalContent.className = 'font-mono text-lg whitespace-pre-wrap leading-relaxed text-slate-300';
        this.dom.modalContent.style.padding = '';
        const controls = document.getElementById('btnTransposeUp')?.parentElement;
        if (controls) controls.style.display = 'flex';
    }

    changeTranspose(delta) {
        this.currentTranspose += delta;
        this.updateTransposeLabel();
        this.renderCifraContent();
    }

    updateTransposeLabel() {
        if (this.currentTranspose === 0) {
            this.dom.transposeLabel.textContent = "Original";
            this.dom.transposeLabel.className = "text-sm text-slate-400 font-medium min-w-[60px] text-center";
        } else {
            const sign = this.currentTranspose > 0 ? '+' : '';
            this.dom.transposeLabel.textContent = `${sign}${this.currentTranspose}`;
            this.dom.transposeLabel.className = "text-sm text-indigo-400 font-bold min-w-[60px] text-center";
        }
    }

    renderCifraContent() {
        if (!this.cifraModalOriginal) return;
        this.dom.modalContent.innerHTML = Transposer.render(this.cifraModalOriginal, this.currentTranspose);
    }

    handleSearch(query) {
        const q = query.toLowerCase().trim();
        const list = this.dom.autocompleteList;
        if (!q) { list.classList.add('hidden'); return; }

        const matches = this.allCifras.filter(f => f.name.toLowerCase().includes(q)).slice(0, 10);
        if (matches.length === 0) { list.classList.add('hidden'); return; }

        list.innerHTML = matches.map(f => {
            const nameClean = f.name.replace(/\.[^/.]+$/, "");
            return `
                <div class="px-4 py-3 hover:bg-slate-700/50 cursor-pointer border-b border-slate-700/30 last:border-0 flex items-center gap-3 transition-colors" data-fileid="${f.id}" data-name="${nameClean}">
                    <i class="fas fa-music text-slate-500"></i>
                    <span class="text-slate-200">${nameClean}</span>
                </div>
            `;
        }).join('');
        list.classList.remove('hidden');

        const self = this;
        Array.from(list.children).forEach(child => {
            child.addEventListener('click', function () {
                self.openDriveItem(this.dataset.fileid, this.dataset.name);
                list.classList.add('hidden');
            });
        });
    }

    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
        if (this.isSidebarOpen) {
            this.dom.sidebar.classList.remove('-translate-x-full');
            this.dom.sidebarBackdrop.classList.remove('hidden');
            setTimeout(() => this.dom.sidebarBackdrop.classList.remove('opacity-0'), 10);
        } else {
            this.dom.sidebar.classList.add('-translate-x-full');
            this.dom.sidebarBackdrop.classList.add('opacity-0');
            setTimeout(() => this.dom.sidebarBackdrop.classList.add('hidden'), 300);
        }
    }
}
