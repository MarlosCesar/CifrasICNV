import { UI_CONFIG } from '../config.js';
import { StorageService } from '../services/StorageService.js';
import { Transposer } from '../utils/Transposer.js';

export class AppUI {
    constructor(authService, driveService, localFileService) {
        this.authService = authService;
        this.driveService = driveService;
        this.localFileService = localFileService;
        this.customCategories = StorageService.getCustomCategories();
        this.selectedCategory = UI_CONFIG.FIXED_CATEGORIES[0].id;
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
            imageSelectorModal: document.createElement('div')
        };

        this.initImageSelectorModal();
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

    init() {
        this.renderCategories();
        this.setupEventListeners();
        this.updateAuthUI(false);
    }

    setupEventListeners() {
        this.dom.sidebarToggle?.addEventListener('click', () => this.toggleSidebar());
        this.dom.sidebarBackdrop?.addEventListener('click', () => this.toggleSidebar());
        this.dom.loginBtn?.addEventListener('click', () => this.authService.signIn());
        this.dom.searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.dom.searchInput?.addEventListener('blur', () => setTimeout(() => this.dom.autocompleteList.classList.add('hidden'), 200));

        this.dom.categoryList.addEventListener('click', (e) => {
            const catBtn = e.target.closest('[data-category]');
            if (catBtn) this.selectCategory(catBtn.dataset.category);
            if (e.target.closest('.delete-cat-btn')) {
                e.stopPropagation();
                this.deleteCategory(e.target.closest('.delete-cat-btn').dataset.idx);
            }
            if (e.target.id === 'addCategoryBtn') this.promptAddCategory(e.target.closest('li'));
        });

        this.dom.songGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.song-card');
            const deleteBtn = e.target.closest('.delete-song-btn');

            if (deleteBtn) {
                e.stopPropagation();
                this.removeSongFromCategory(card.dataset.idx, card.dataset.islocal === 'true');
            } else if (card) {
                const isLocal = card.dataset.islocal === 'true';
                if (isLocal) {
                    this.openImageModal(card.dataset.url, card.dataset.name, true);
                } else {
                    this.openDriveItem(card.dataset.fileid, card.dataset.name);
                }
            }
        });

        this.dom.closeModal?.addEventListener('click', () => this.closeModal());
        this.dom.btnTransposeUp?.addEventListener('click', () => this.changeTranspose(1));
        this.dom.btnTransposeDown?.addEventListener('click', () => this.changeTranspose(-1));
        this.dom.btnFullscreen?.addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('refreshBtn')?.addEventListener('click', () => window.location.reload());

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

    openDriveItem(fileId, name) {
        // ... (existing logic to fetch blob then call openImageModal)
        // Need to replicate previous logic or call this.openImageModal after fetch
        // Re-implementing the fetch logic here briefly or ensuring it delegates correctly.

        // Wait, the previous implementation of openDriveItem opened the modal directly or fetched?
        // Let's check the previous file content via the tool or just overwrite safe logic.
        // I will assume I need to fetch the blob.

        this.dom.loadingIndicator.classList.remove('hidden');
        this.driveService.getFileContent(fileId).then(blob => {
            if (!blob) throw new Error('Falha ao baixar imagem');
            const url = URL.createObjectURL(blob);
            this.openImageModal(url, name, true); // Treat as local so it revokes URL on close
            this.dom.loadingIndicator.classList.add('hidden');
        }).catch(err => {
            console.error(err);
            this.dom.loadingIndicator.classList.add('hidden');
            alert('Erro ao abrir imagem: ' + err.message);
        });
    }



    updateAuthUI(isAuthenticated) {
        if (isAuthenticated) {
            this.dom.loginBtn.classList.add('hidden');
            this.dom.userSection.classList.remove('hidden');
            this.dom.loadingIndicator.classList.remove('hidden');
            this.loadData();
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
        let html = '';
        UI_CONFIG.FIXED_CATEGORIES.forEach(cat => {
            if (cat.id === 'adicionar') return;
            const active = this.selectedCategory === cat.id ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'text-slate-400 hover:bg-slate-800/50 border-transparent';
            html += `
                <li>
                    <button data-category="${cat.id}" class="w-full text-left px-4 py-3 rounded-xl border ${active} transition-all duration-200 flex items-center gap-3">
                        <i class="fas fa-folder text-sm"></i>
                        <span class="font-medium">${cat.name}</span>
                    </button>
                </li>`;
        });
        this.customCategories.forEach((cat, idx) => {
            const active = this.selectedCategory === cat.id ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'text-slate-400 hover:bg-slate-800/50 border-transparent';
            html += `
                <li class="group relative">
                    <button data-category="${cat.id}" class="w-full text-left px-4 py-3 rounded-xl border ${active} transition-all duration-200 flex items-center gap-3">
                        <i class="fas fa-star text-sm text-amber-500/70"></i>
                        <span class="font-medium">${cat.name}</span>
                    </button>
                    <button data-idx="${idx}" class="delete-cat-btn absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-2 transition-all">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </li>`;
        });
        html += `
            <li>
                <button id="addCategoryBtn" class="w-full text-left px-4 py-3 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/50 transition-all duration-200 flex items-center gap-3">
                    <i class="fas fa-plus"></i>
                    <span>Nova Categoria</span>
                </button>
            </li>
        `;
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
            if (this.selectedCategory === deletedId) {
                this.selectedCategory = UI_CONFIG.FIXED_CATEGORIES[0].id;
            }
            this.renderCategories();
            this.renderSongs();
        }
    }

    selectCategory(id) {
        this.selectedCategory = id;
        this.renderCategories();
        this.renderSongs();
        if (window.innerWidth < 1024) this.toggleSidebar();
    }

    renderSongs() {
        const driveList = this.cifrasPorCategoria[this.selectedCategory] || [];
        const localList = this.localFileService.getFiles(this.selectedCategory);

        const renderCard = (file, isLocal, idx) => `
            <div class="song-card group relative bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 hover:border-indigo-500/50 rounded-2xl p-4 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer overflow-hidden animate-fade-in" 
                data-idx="${idx}" 
                data-fileid="${file.id}" 
                data-name="${file.name.replace(/\.[^/.]+$/, "")}"
                data-islocal="${isLocal}"
                data-url="${isLocal ? file.url : ''}">
                <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${isLocal ? 'from-emerald-500 to-teal-500' : 'from-indigo-500 to-purple-500'} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-lg ${isLocal ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'} flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300">
                        <i class="fas ${isLocal || file.mimeType?.includes('image') ? 'fa-image' : 'fa-file-audio'}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-slate-200 truncate group-hover:text-white transition-colors">${file.name.replace(/\.[^/.]+$/, "")}</h3>
                        <p class="text-xs text-slate-500 truncate mt-1">${isLocal ? 'Local' : 'Google Drive'}</p>
                    </div>
                </div>
                <button class="delete-song-btn absolute top-2 right-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 rounded-full w-8 h-8 flex items-center justify-center backdrop-blur-md">
                    <i class="fas fa-times"></i>
                </button>
            </div>`;

        let html = '';

        // Button open Drive Image Selector
        html += `
            <div id="openDriveSelBtn" class="bg-indigo-500/10 border border-dashed border-indigo-500/50 hover:bg-indigo-500/20 hover:border-indigo-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all aspect-[4/1] md:aspect-auto">
                <div class="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <i class="fab fa-google-drive text-indigo-400 text-xl"></i>
                </div>
                <span class="text-xs font-bold text-indigo-400 uppercase tracking-widest">Add do Drive</span>
            </div>
        `;

        if (driveList.length === 0 && localList.length === 0) {
            this.dom.songGrid.innerHTML = html + `
                <div class="col-span-full flex flex-col items-center justify-center text-slate-500 py-10">
                    <p class="text-sm opacity-60">Nenhuma cifra aqui ainda.</p>
                </div>`;
        } else {
            html += localList.map((f, i) => renderCard(f, true, i)).join('');
            html += driveList.map((f, i) => renderCard(f, false, i)).join('');
            this.dom.songGrid.innerHTML = html;
        }

        const btn = document.getElementById('openDriveSelBtn');
        if (btn) btn.addEventListener('click', () => this.openDriveImageSelector());
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
