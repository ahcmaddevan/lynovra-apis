// Lynovra Technology Solutions — REST API Frontend Script
document.addEventListener('DOMContentLoaded', async () => {

    // ─── DOM References ───────────────────────────────────────────────
    const $ = id => document.getElementById(id);
    const $q = sel => document.querySelector(sel);

    const dom = {
        loadingScreen: $('loadingScreen'),
        body: document.body,
        sidebar: $('sidebar'),
        mainWrapper: $('mainWrapper'),
        sidebarCollapseBtn: $('sidebarCollapseBtn'),
        menuBtn: $('menuBtn'),
        themeBtn: $('themeBtn'),
        themeIcon: $('themeIcon'),
        searchInput: $('searchInput'),
        clearSearch: $('clearSearch'),
        notificationBell: $('notificationBell'),
        notificationBadge: $('notificationBadge'),
        apiContent: $('apiContent'),
        toastWrap: $('toastWrap'),
        // Hero
        pageTitle: $('page'),
        appName: $('name'),
        sideNavName: $('sideNavName'),
        versionBadge: $('version'),
        appDescription: $('description'),
        totalEndpoints: $('totalEndpoints'),
        totalCategories: $('totalCategories'),
        readyEndpoints: $('readyEndpoints'),
        wm: $('wm'),
        apiLinks: $('apiLinks'),
        // Modal
        modalBackdrop: $('modalBackdrop'),
        modal: $('apiModal'),
        modalLabel: $('apiResponseModalLabel'),
        modalSubtitle: $('apiResponseModalDesc'),
        modalClose: $('modalClose'),
        apiEndpoint: $('apiEndpoint'),
        queryInputContainer: $('apiQueryInputContainer'),
        responseLoading: $('apiResponseLoading'),
        responseContainer: $('responseContainer'),
        responseContent: $('apiResponseContent'),
        copyEndpoint: $('copyEndpoint'),
        copyResponse: $('copyResponse'),
        submitBtn: $('submitQueryBtn'),
    };

    let settings = {};
    let currentApi = null;
    let allNotifications = [];

    // ─── Init ──────────────────────────────────────────────────────────
    const init = async () => {
        setupEvents();
        initTheme();
        initSidebar();
        await loadNotifications();

        try {
            const res = await fetch('/src/settings.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            settings = await res.json();
            populateHero();
            renderCategories();
            updateStats();
            observeCards();
        } catch (err) {
            console.error('Settings error:', err);
            showError('Gagal memuat konfigurasi API. Coba muat ulang halaman.');
            toast('Gagal memuat pengaturan', 'error');
        } finally {
            hideLoader();
        }
    };

    // ─── Events ────────────────────────────────────────────────────────
    const setupEvents = () => {
        dom.sidebarCollapseBtn?.addEventListener('click', toggleSidebarDesktop);
        dom.menuBtn?.addEventListener('click', toggleSidebarMobile);
        dom.themeBtn?.addEventListener('click', toggleTheme);
        dom.searchInput?.addEventListener('input', debounce(handleSearch, 280));
        dom.clearSearch?.addEventListener('click', clearSearchFn);
        dom.notificationBell?.addEventListener('click', handleNotifBell);
        dom.apiContent?.addEventListener('click', handleCardClick);
        dom.modalClose?.addEventListener('click', closeModal);
        dom.modalBackdrop?.addEventListener('click', closeModal);
        dom.copyEndpoint?.addEventListener('click', () => copyText(dom.apiEndpoint.textContent, dom.copyEndpoint));
        dom.copyResponse?.addEventListener('click', () => copyText(dom.responseContent.textContent, dom.copyResponse));
        dom.submitBtn?.addEventListener('click', handleSubmit);
        window.addEventListener('scroll', handleScroll);
        document.addEventListener('click', closeSidebarOutside);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    };

    // ─── Loader ────────────────────────────────────────────────────────
    const hideLoader = () => {
        if (!dom.loadingScreen) return;
        dom.loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            dom.loadingScreen.style.display = 'none';
            dom.body.classList.remove('no-scroll');
        }, 450);
    };

    // ─── Theme ─────────────────────────────────────────────────────────
    const initTheme = () => {
        const saved = localStorage.getItem('theme');
        const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (saved === 'dark' || (!saved && preferDark)) applyDark();
    };

    const applyDark = () => {
        dom.body.classList.add('dark');
        if (dom.themeIcon) dom.themeIcon.className = 'fas fa-sun';
    };

    const applyLight = () => {
        dom.body.classList.remove('dark');
        if (dom.themeIcon) dom.themeIcon.className = 'fas fa-moon';
    };

    const toggleTheme = () => {
        const isDark = dom.body.classList.toggle('dark');
        dom.themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        toast(`Mode ${isDark ? 'gelap' : 'terang'} diaktifkan`, 'info');
    };

    // ─── Sidebar ───────────────────────────────────────────────────────
    const initSidebar = () => {
        // default sidebar shown on desktop
    };

    const toggleSidebarDesktop = () => {
        dom.sidebar.classList.toggle('collapsed');
        dom.mainWrapper.classList.toggle('collapsed');
    };

    const toggleSidebarMobile = () => {
        dom.sidebar.classList.toggle('mobile-open');
    };

    const closeSidebarOutside = (e) => {
        if (window.innerWidth > 768) return;
        if (!dom.sidebar.contains(e.target) && !dom.menuBtn.contains(e.target)) {
            dom.sidebar.classList.remove('mobile-open');
        }
    };

    // ─── Scroll: Active Nav ────────────────────────────────────────────
    const handleScroll = () => {
        const sections = document.querySelectorAll('section[id]');
        const scrollY = window.scrollY + 90;

        sections.forEach(sec => {
            const top = sec.offsetTop;
            const height = sec.offsetHeight;
            const link = document.querySelector(`.nav-item[href="#${sec.id}"]`);
            if (!link) return;

            if (scrollY >= top && scrollY < top + height) {
                document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    };

    // ─── Notifications ─────────────────────────────────────────────────
    const loadNotifications = async () => {
        try {
            const res = await fetch('/notifications.json');
            if (!res.ok) return;
            allNotifications = await res.json();
            updateNotifBadge();
        } catch (_) { /* optional */ }
    };

    const updateNotifBadge = () => {
        const today = new Date(); today.setHours(0,0,0,0);
        const readIds = JSON.parse(sessionStorage.getItem('readNotifs') || '[]');
        const unread = allNotifications.filter(n => {
            const d = new Date(n.date); d.setHours(0,0,0,0);
            return !n.read && d <= today && !readIds.includes(n.id);
        });
        dom.notificationBadge?.classList.toggle('active', unread.length > 0);
    };

    const handleNotifBell = () => {
        const today = new Date(); today.setHours(0,0,0,0);
        const readIds = JSON.parse(sessionStorage.getItem('readNotifs') || '[]');
        const unread = allNotifications.filter(n => {
            const d = new Date(n.date); d.setHours(0,0,0,0);
            return !n.read && d <= today && !readIds.includes(n.id);
        });

        if (!unread.length) { toast('Tidak ada notifikasi baru', 'info'); return; }

        unread.forEach(n => {
            toast(n.message, 'info', n.date);
            readIds.push(n.id);
        });
        sessionStorage.setItem('readNotifs', JSON.stringify(readIds));
        updateNotifBadge();
    };

    // ─── Populate Hero ─────────────────────────────────────────────────
    const populateHero = () => {
        const name = settings.name || 'Lynovra REST API';
        const creator = settings.apiSettings?.creator || 'Lynovra Technology Solutions';
        const currentYear = new Date().getFullYear();

        if (dom.pageTitle) dom.pageTitle.textContent = name;
        if (dom.appName) dom.appName.textContent = name;
        if (dom.sideNavName) dom.sideNavName.textContent = name;
        if (dom.versionBadge) dom.versionBadge.textContent = settings.version || 'v1.0.0';
        if (dom.appDescription) dom.appDescription.innerHTML =
            (settings.description || '') +
            ` Dibuat dan dikelola oleh <a href="https://lynovra.my.id" target="_blank" rel="noopener noreferrer" class="lynovra-inline">Lynovra Technology Solutions</a>.`;
        if (dom.wm) dom.wm.textContent = `© ${currentYear} Lynovra Technology Solutions. Semua hak dilindungi.`;
    };

    // ─── Stats ─────────────────────────────────────────────────────────
    const updateStats = () => {
        const categories = settings.categories || [];
        let total = 0, ready = 0;
        categories.forEach(cat => {
            (cat.items || []).forEach(item => {
                total++;
                if (!item.status || item.status === 'ready') ready++;
            });
        });

        animateCount(dom.totalEndpoints, total);
        animateCount(dom.totalCategories, categories.length);
        animateCount(dom.readyEndpoints, ready);
    };

    const animateCount = (el, target) => {
        if (!el) return;
        let start = 0;
        const dur = 800;
        const step = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / dur, 1);
            el.textContent = Math.floor(progress * target);
            if (progress < 1) requestAnimationFrame(step);
            else el.textContent = target;
        };
        requestAnimationFrame(step);
    };

    // ─── Render Categories ─────────────────────────────────────────────
    const renderCategories = () => {
        if (!dom.apiContent) return;
        const categories = settings.categories || [];

        if (!categories.length) {
            showError('Tidak ada kategori API yang ditemukan.');
            return;
        }

        dom.apiContent.innerHTML = '';

        categories.forEach((cat, ci) => {
            const section = document.createElement('div');
            section.className = 'category-section';
            section.id = `cat-${cat.name.toLowerCase().replace(/\s+/g, '-')}`;
            section.style.animationDelay = `${ci * 0.08}s`;

            const header = document.createElement('h3');
            header.className = 'category-header';
            if (cat.icon) {
                const icon = document.createElement('i');
                icon.className = cat.icon;
                header.appendChild(icon);
            }
            header.appendChild(document.createTextNode(cat.name));
            section.appendChild(header);

            const grid = document.createElement('div');
            grid.className = 'api-cards-grid';

            const sorted = [...(cat.items || [])].sort((a, b) => a.name.localeCompare(b.name));

            sorted.forEach((item, ii) => {
                const status = item.status || 'ready';
                const statusMap = {
                    ready: { cls: 'ready', icon: 'fa-circle', text: 'Ready' },
                    error: { cls: 'error', icon: 'fa-exclamation-triangle', text: 'Error' },
                    update: { cls: 'update', icon: 'fa-arrow-up', text: 'Update' }
                };
                const s = statusMap[status] || statusMap.ready;

                const card = document.createElement('article');
                card.className = `api-card${status !== 'ready' ? ' unavailable' : ''}`;
                card.style.animationDelay = `${ii * 0.04 + ci * 0.08}s`;
                card.dataset.name = item.name;
                card.dataset.desc = item.desc || '';
                card.dataset.category = cat.name;
                card.dataset.apiPath = item.path;
                card.dataset.apiDesc = item.desc || '';
                if (item.params) card.dataset.apiParams = JSON.stringify(item.params);
                if (item.innerDesc) card.dataset.apiInnerDesc = item.innerDesc;

                if (status === 'ready') card.setAttribute('role', 'button');

                card.innerHTML = `
                    <div class="api-card-top">
                        <span class="api-method">GET</span>
                        <span class="api-status-badge ${s.cls}">
                            <i class="fas ${s.icon}"></i> ${s.text}
                        </span>
                    </div>
                    <div>
                        <div class="api-card-name">${item.name}</div>
                        <div class="api-card-desc">${item.desc || 'Tidak ada deskripsi.'}</div>
                    </div>
                    ${status === 'ready' ? `
                    <div class="api-card-action">
                        <i class="fas fa-terminal"></i> Coba Sekarang <i class="fas fa-arrow-right" style="font-size:10px"></i>
                    </div>` : ''}
                `;

                grid.appendChild(card);
            });

            section.appendChild(grid);
            dom.apiContent.appendChild(section);
        });
    };

    // ─── Search ────────────────────────────────────────────────────────
    const handleSearch = () => {
        const term = dom.searchInput.value.toLowerCase().trim();
        dom.clearSearch.classList.toggle('visible', term.length > 0);

        const cards = dom.apiContent.querySelectorAll('.api-card');
        const visibleCats = new Set();

        cards.forEach(card => {
            const name = (card.dataset.name || '').toLowerCase();
            const desc = (card.dataset.desc || '').toLowerCase();
            const cat = (card.dataset.category || '').toLowerCase();
            const match = name.includes(term) || desc.includes(term) || cat.includes(term);
            card.style.display = match ? '' : 'none';
            if (match) visibleCats.add(card.closest('.category-section'));
        });

        dom.apiContent.querySelectorAll('.category-section').forEach(sec => {
            sec.style.display = visibleCats.has(sec) ? '' : 'none';
        });

        const existing = $('noResults');
        if (existing) existing.remove();

        if (visibleCats.size === 0 && term.length > 0) {
            const msg = document.createElement('div');
            msg.id = 'noResults';
            msg.className = 'no-results';
            msg.innerHTML = `
                <i class="fas fa-search"></i>
                <h4>Tidak ditemukan</h4>
                <p>Tidak ada API yang cocok dengan "<strong>${term}</strong>"</p>
                <button class="clear-search-btn" onclick="document.getElementById('searchInput').value='';document.getElementById('clearSearch').classList.remove('visible');document.getElementById('noResults').remove();document.querySelectorAll('.api-card,.category-section').forEach(e=>e.style.display='')">
                    <i class="fas fa-times"></i> Hapus Pencarian
                </button>
            `;
            dom.apiContent.appendChild(msg);
        }
    };

    const clearSearchFn = () => {
        dom.searchInput.value = '';
        dom.clearSearch.classList.remove('visible');
        dom.searchInput.focus();
        handleSearch();
    };

    // ─── Card Click → Open Modal ───────────────────────────────────────
    const handleCardClick = (e) => {
        const card = e.target.closest('.api-card:not(.unavailable)');
        if (!card) return;

        currentApi = {
            path: card.dataset.apiPath,
            name: card.dataset.name,
            desc: card.dataset.apiDesc,
            params: card.dataset.apiParams ? JSON.parse(card.dataset.apiParams) : null,
            innerDesc: card.dataset.apiInnerDesc
        };

        openModal(currentApi);
    };

    // ─── Modal ─────────────────────────────────────────────────────────
    const openModal = (api) => {
        dom.modalLabel.textContent = api.name;
        dom.modalSubtitle.textContent = api.desc || '';
        dom.apiEndpoint.textContent = `${location.origin}${api.path.split('?')[0]}`;
        dom.responseLoading.classList.add('d-none');
        dom.responseContent.classList.add('d-none');
        dom.responseContainer.classList.add('d-none');
        dom.queryInputContainer.innerHTML = '';
        dom.submitBtn.style.display = 'none';
        dom.submitBtn.disabled = true;
        dom.responseContent.innerHTML = '';

        const urlParams = new URLSearchParams(api.path.split('?')[1]);
        const keys = [...urlParams.keys()];

        if (keys.length > 0) {
            buildParams(keys, api);
            dom.submitBtn.style.display = 'flex';
        } else {
            makeRequest(`${location.origin}${api.path}`, api.name);
        }

        dom.modalBackdrop.classList.add('active');
        dom.modal.classList.add('active');
        dom.body.classList.add('no-scroll');
    };

    const closeModal = () => {
        dom.modal.classList.remove('active');
        dom.modalBackdrop.classList.remove('active');
        dom.body.classList.remove('no-scroll');
    };

    const buildParams = (keys, api) => {
        const container = document.createElement('div');

        const title = document.createElement('p');
        title.className = 'param-section-title';
        title.innerHTML = '<i class="fas fa-sliders-h" style="color:var(--accent)"></i> Parameter';
        container.appendChild(title);

        keys.forEach(key => {
            const group = document.createElement('div');
            group.className = 'param-group';

            const label = document.createElement('label');
            label.className = 'param-label';
            label.htmlFor = `p-${key}`;
            label.innerHTML = `${key} <span class="required-star">*</span>`;
            group.appendChild(label);

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'param-input';
            input.id = `p-${key}`;
            input.placeholder = `Masukkan ${key}...`;
            input.dataset.key = key;
            input.autocomplete = 'off';
            input.addEventListener('input', validateInputs);
            group.appendChild(input);

            container.appendChild(group);
        });

        if (api.innerDesc) {
            const info = document.createElement('div');
            info.className = 'inner-desc-box';
            info.innerHTML = `<i class="fas fa-info-circle"></i> ${api.innerDesc.replace(/\n/g, '<br>')}`;
            container.appendChild(info);
        }

        dom.queryInputContainer.appendChild(container);
    };

    const validateInputs = () => {
        const inputs = dom.queryInputContainer.querySelectorAll('.param-input');
        const allFilled = [...inputs].every(i => i.value.trim() !== '');
        dom.submitBtn.disabled = !allFilled;
        inputs.forEach(i => { if (i.value.trim()) i.classList.remove('invalid'); });
    };

    const handleSubmit = async () => {
        if (!currentApi) return;
        const inputs = dom.queryInputContainer.querySelectorAll('.param-input');
        let valid = true;

        const params = new URLSearchParams();
        inputs.forEach(input => {
            if (!input.value.trim()) {
                valid = false;
                input.classList.add('invalid');
                input.animate([{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}], {duration:300});
            } else {
                params.append(input.dataset.key, input.value.trim());
            }
        });

        if (!valid) { toast('Isi semua parameter yang diperlukan', 'error'); return; }

        const url = `${location.origin}${currentApi.path.split('?')[0]}?${params}`;
        dom.apiEndpoint.textContent = url;

        dom.submitBtn.disabled = true;
        dom.submitBtn.innerHTML = '<div class="loading-spinner" style="width:18px;height:18px;border-width:2px"></div> Memproses...';

        await makeRequest(url, currentApi.name);

        dom.submitBtn.disabled = false;
        dom.submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Request';
    };

    // ─── API Request ───────────────────────────────────────────────────
    const makeRequest = async (url, name) => {
        dom.responseLoading.classList.remove('d-none');
        dom.responseContainer.classList.add('d-none');
        dom.responseContent.classList.add('d-none');
        dom.responseContent.innerHTML = '';

        try {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 20000);
            const res = await fetch(url, { signal: ctrl.signal });
            clearTimeout(tid);

            const contentType = res.headers.get('Content-Type') || '';

            if (contentType.includes('image/')) {
                const blob = await res.blob();
                const imgUrl = URL.createObjectURL(blob);

                const img = document.createElement('img');
                img.src = imgUrl;
                img.alt = name;
                img.className = 'response-image';

                const dl = document.createElement('a');
                dl.href = imgUrl;
                dl.download = `${name.replace(/\s+/g, '-').toLowerCase()}.${blob.type.split('/')[1] || 'png'}`;
                dl.className = 'download-btn';
                dl.innerHTML = '<i class="fas fa-download"></i> Unduh Gambar';

                dom.responseContent.innerHTML = '';
                dom.responseContent.appendChild(img);
                dom.responseContent.appendChild(dl);
            } else if (contentType.includes('application/json')) {
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({ message: res.statusText }));
                    throw new Error(`HTTP ${res.status}: ${errData.message || res.statusText}`);
                }
                const data = await res.json();
                dom.responseContent.innerHTML = syntaxHighlight(JSON.stringify(data, null, 2));
            } else {
                const text = await res.text();
                dom.responseContent.textContent = text || 'Respons kosong.';
            }

            dom.responseContent.classList.remove('d-none');
            dom.responseContainer.classList.remove('d-none');
            toast(`Berhasil mengambil data: ${name}`, 'success');

        } catch (err) {
            const isAbort = err.name === 'AbortError';
            const msg = isAbort ? 'Request timeout (20s)' : err.message;

            dom.responseContent.innerHTML = `
                <div class="error-box">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h5>Terjadi Kesalahan</h5>
                    <p>${msg}</p>
                    <button class="retry-btn" id="retryBtn"><i class="fas fa-redo"></i> Coba Lagi</button>
                </div>
            `;
            dom.responseContent.classList.remove('d-none');
            dom.responseContainer.classList.remove('d-none');

            $('retryBtn')?.addEventListener('click', () => {
                dom.responseContent.innerHTML = '';
                dom.responseContent.classList.add('d-none');
                dom.responseContainer.classList.add('d-none');
                makeRequest(url, name);
            });

            toast('Gagal mengambil data. Lihat detail di modal.', 'error');
        } finally {
            dom.responseLoading.classList.add('d-none');
        }
    };

    // ─── Syntax Highlight ──────────────────────────────────────────────
    const syntaxHighlight = (json) => {
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/(\"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*\"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
            let cls = 'json-num';
            if (/^"/.test(match)) cls = /:$/.test(match) ? 'json-key' : 'json-str';
            else if (/true|false/.test(match)) cls = 'json-bool';
            else if (/null/.test(match)) cls = 'json-null';
            return `<span class="${cls}">${match}</span>`;
        });
    };

    // ─── Copy ──────────────────────────────────────────────────────────
    const copyText = async (text, btn) => {
        try {
            await navigator.clipboard.writeText(text);
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.classList.add('copied');
            toast('Disalin ke clipboard!', 'success');
            setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1500);
        } catch (_) {
            toast('Gagal menyalin teks', 'error');
        }
    };

    // ─── Toast ─────────────────────────────────────────────────────────
    const toast = (message, type = 'info') => {
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
        const el = document.createElement('div');
        el.className = `toast-item ${type}`;
        el.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> <span>${message}</span>`;
        dom.toastWrap.appendChild(el);
        setTimeout(() => {
            el.classList.add('toast-out');
            setTimeout(() => el.remove(), 300);
        }, 3000);
    };

    // ─── Intersection Observer ─────────────────────────────────────────
    const observeCards = () => {
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.style.opacity = '1';
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.05 });

        document.querySelectorAll('.api-card').forEach(card => {
            card.style.opacity = '0';
            obs.observe(card);
        });
    };

    // ─── Error State ───────────────────────────────────────────────────
    const showError = (msg) => {
        if (!dom.apiContent) return;
        dom.apiContent.innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-triangle" style="color:var(--red)"></i>
                <h4>Terjadi Kesalahan</h4>
                <p>${msg}</p>
                <button class="clear-search-btn" onclick="location.reload()">
                    <i class="fas fa-sync-alt"></i> Muat Ulang
                </button>
            </div>
        `;
    };

    // ─── Utilities ─────────────────────────────────────────────────────
    const debounce = (fn, delay) => {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
    };

    // ─── Run ───────────────────────────────────────────────────────────
    init();
});
