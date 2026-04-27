// global store

const APP_NAME = '答案卡';
const LOCAL_TITLE_SUFFIX = ' (LOCAL)';

const appContainer = document.getElementById('app-container');
const navTitle = document.getElementById('nav-title');
const navActions = document.getElementById('navbar-actions');

const escapeHtmlText = (str) => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function showAppDialog({
    title = '請確認',
    message = '',
    confirmText = '確定',
    cancelText = '取消',
    variant = 'default',
    showCancel = true
} = {}) {
    return new Promise((resolve) => {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop app-dialog-backdrop';
        backdrop.tabIndex = -1;
        const messageHtml = escapeHtmlText(message).replace(/\n/g, '<br>');
        backdrop.innerHTML = `
            <div class="modal-dialog app-dialog ${showCancel ? 'app-dialog-question' : 'app-dialog-alert'} ${variant === 'danger' ? 'app-dialog-danger' : ''}" role="dialog" aria-modal="true" aria-label="${escapeHtmlText(title)}">
                <div class="modal-header">
                    <h3>${escapeHtmlText(title)}</h3>
                </div>
                <p class="app-dialog-message">${messageHtml}</p>
                <div class="modal-actions">
                    ${showCancel ? `<button class="md-btn md-btn-outlined app-dialog-cancel">${escapeHtmlText(cancelText)}</button>` : ''}
                    <button class="md-btn md-btn-contained app-dialog-confirm">${escapeHtmlText(confirmText)}</button>
                </div>
            </div>
        `;

        const close = (value) => {
            backdrop.remove();
            resolve(value);
        };

        document.body.appendChild(backdrop);
        const confirmBtn = backdrop.querySelector('.app-dialog-confirm');
        const cancelBtn = backdrop.querySelector('.app-dialog-cancel');
        backdrop.focus();
        confirmBtn.focus();
        confirmBtn.addEventListener('click', () => close(true));
        if (cancelBtn) cancelBtn.addEventListener('click', () => close(false));
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop && showCancel) close(false);
        });
        backdrop.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && showCancel) close(false);
            if (e.key === 'Enter') close(true);
        });
    });
}

const showAppAlert = (message, title = '提示') => showAppDialog({
    title,
    message,
    confirmText: '知道了',
    showCancel: false
});

const showAppConfirm = (message, title = '請確認', variant = 'default') => showAppDialog({
    title,
    message,
    confirmText: '確定',
    cancelText: '取消',
    variant,
    showCancel: true
});

const showAppChoice = (message, title = '請選擇', options = []) => {
    return new Promise((resolve) => {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop app-dialog-backdrop';
        backdrop.tabIndex = -1;
        const messageHtml = escapeHtmlText(message).replace(/\n/g, '<br>');
        let buttonsHtml = options.map(opt => `<button class="md-btn ${opt.variant === 'primary' ? 'md-btn-contained' : 'md-btn-outlined'} app-choice-btn" data-value="${opt.value}" style="width:100%; justify-content:center;">${escapeHtmlText(opt.label)}</button>`).join('');
        
        backdrop.innerHTML = `
            <div class="modal-dialog app-dialog app-dialog-question" role="dialog" aria-modal="true" aria-label="${escapeHtmlText(title)}">
                <div class="modal-header">
                    <h3>${escapeHtmlText(title)}</h3>
                </div>
                <p class="app-dialog-message" style="margin-bottom:16px; text-align:center;">${messageHtml}</p>
                <div class="modal-actions" style="display:flex; flex-direction:column; gap:8px; width:100%;">
                    ${buttonsHtml}
                    <button class="md-btn md-btn-text app-dialog-cancel" style="width:100%; justify-content:center; margin-top:4px;">取消</button>
                </div>
            </div>
        `;
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => backdrop.style.opacity = '1');
        backdrop.focus();

        const closeDialog = (val) => {
            backdrop.style.opacity = '0';
            setTimeout(() => { document.body.removeChild(backdrop); resolve(val); }, 200);
        };
        
        backdrop.querySelectorAll('.app-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => closeDialog(btn.dataset.value));
        });
        backdrop.querySelector('.app-dialog-cancel').addEventListener('click', () => closeDialog(null));
    });
};

const isLocalEnvironment = () => {
    const host = window.location.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local');
};

document.title = APP_NAME + (isLocalEnvironment() ? LOCAL_TITLE_SUFFIX : '');

// Dark Mode Logic
const themeToggleBtn = document.getElementById('theme-toggle');
const isDarkMode = localStorage.getItem('demo_answer_card_theme') === 'dark';
const syncThemeToggle = (isDark) => {
    themeToggleBtn.classList.toggle('is-dark', isDark);
    themeToggleBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    themeToggleBtn.title = isDark ? '切換淺色模式' : '切換深色模式';
};
if (isDarkMode) {
    document.body.classList.add('dark-theme');
}
syncThemeToggle(isDarkMode);
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('demo_answer_card_theme', isDark ? 'dark' : 'light');
    syncThemeToggle(isDark);
});

// Simple Router
function navigateTo(page, params = {}) {
    appContainer.innerHTML = '';
    navActions.innerHTML = ''; // Reset navbar actions

    switch (page) {
        case 'home':
            renderHome();
            break;
        case 'create':
            renderCreate();
            break;

        case 'test':
            renderTest(params);
            break;
        default:
            renderHome();
    }
}

let homeFilterTag = 'all';
let homeSortBy = 'time_desc';

const normalizeTagColor = (color) => /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : '#94a3b8';

const renderTagFilterOption = (tag) => {
    const tagColor = normalizeTagColor(tag.color);
    const selected = homeFilterTag === tag.id ? 'selected' : '';
    return `<option value="${escapeHtmlText(tag.id)}" ${selected} style="color:${tagColor}; background-color:color-mix(in srgb, ${tagColor} 12%, var(--md-surface));">&#9632; ${escapeHtmlText(tag.name)}</option>`;
};

const syncTagFilterDisplayColor = () => {
    const select = document.getElementById('sel-tag-filter');
    if (!select) return;
    const selectedTag = store.getTags().find(t => t.id === homeFilterTag);
    if (!selectedTag) {
        select.style.removeProperty('--tag-filter-color');
        select.classList.remove('has-tag-color');
        return;
    }
    select.style.setProperty('--tag-filter-color', normalizeTagColor(selectedTag.color));
    select.classList.add('has-tag-color');
};

// ========== 1. Landing Page (Home / Library) ==========
function renderHome() {
    document.body.classList.add('home-page');
    navTitle.textContent = APP_NAME;
    navActions.innerHTML = ''; // Removed 'home' button since this is home

    // Header Actions Area
    let headerActionsHtml = `
        <section class="home-toolbar" aria-label="答案卡工具列">
            <div class="home-toolbar-copy">
                <h2>我的答案卡</h2>
                <p>建立、作答、設定答案與回顧每次測驗紀錄。</p>
            </div>
            <div class="home-toolbar-actions">
            <button class="md-btn md-btn-contained" id="btn-goto-create" title="製作答案卡">
                <i class="fa-solid fa-plus"></i> <span class="btn-text">製作</span>
            </button>
            <button class="md-btn md-btn-outlined" id="btn-manage-tags" title="管理標籤">
                <i class="fa-solid fa-tags"></i> <span class="btn-text">標籤</span>
            </button>
            <button class="md-btn md-btn-outlined" id="btn-export-data" title="匯出資料" style="min-width: 44px; padding: 0 16px;">
                <i class="fa-solid fa-arrow-up-from-bracket"></i>
            </button>
            <button class="md-btn md-btn-outlined" id="btn-import-data" title="匯入資料" style="min-width: 44px; padding: 0 16px;">
                <i class="fa-solid fa-download"></i>
            </button>
            </div>
        </section>
        
        <div class="home-filters" style="display:flex; gap:16px; margin-bottom:16px; align-items:center; flex-wrap:wrap;">
            <div class="filter-group" style="display:flex; align-items:center; gap:8px;">
                <label for="sel-tag-filter" style="font-size:1.1rem; color:var(--text-secondary); cursor:pointer;" title="標籤過濾 (Tag Filter)">
                    <i class="fa-solid fa-tags"></i>
                </label>
                <select id="sel-tag-filter" class="md-input" style="padding:6px 10px; width:auto; border-radius:6px; font-size: 0.9rem;">
                    <option value="all" ${homeFilterTag === 'all' ? 'selected' : ''} style="color:var(--text-primary); background-color:var(--md-surface);">All Cards</option>
                    <option value="none" ${homeFilterTag === 'none' ? 'selected' : ''} style="color:var(--text-primary); background-color:var(--md-surface);">No Tags</option>
                    ${store.getTags().map(renderTagFilterOption).join('')}
                </select>
            </div>
            <div class="filter-group" style="display:flex; align-items:center; gap:8px;">
                <label for="sel-sort-by" style="font-size:1.1rem; color:var(--text-secondary); cursor:pointer;" title="排序方式 (Sort By)">
                    <i class="fa-solid fa-arrow-down-short-wide"></i>
                </label>
                <select id="sel-sort-by" class="md-input" style="padding:6px 10px; width:auto; border-radius:6px; font-size: 0.9rem;">
                    <option value="time_desc" ${homeSortBy === 'time_desc' ? 'selected' : ''}>Newest</option>
                    <option value="time_asc" ${homeSortBy === 'time_asc' ? 'selected' : ''}>Oldest</option>
                    <option value="name_asc" ${homeSortBy === 'name_asc' ? 'selected' : ''}>A-Z</option>
                    <option value="name_desc" ${homeSortBy === 'name_desc' ? 'selected' : ''}>Z-A</option>
                </select>
            </div>
        </div>
    `;

    let cards = store.getCards();
    
    // Apply filter
    if (homeFilterTag === 'none') {
        cards = cards.filter(c => !c.tagIds || c.tagIds.length === 0);
    } else if (homeFilterTag !== 'all') {
        cards = cards.filter(c => c.tagIds && c.tagIds.includes(homeFilterTag));
    }

    // Apply sort
    cards.sort((a, b) => {
        if (homeSortBy === 'time_desc') return b.createdAt - a.createdAt;
        if (homeSortBy === 'time_asc') return a.createdAt - b.createdAt;
        if (homeSortBy === 'name_asc') return a.name.localeCompare(b.name);
        if (homeSortBy === 'name_desc') return b.name.localeCompare(a.name);
        return 0;
    });

    if (cards.length === 0) {
        appContainer.innerHTML = headerActionsHtml + `
            <div class="md-card empty-state">
                <img class="empty-rabbit" src="images/rabbit/question.png" alt="尚無答案卡">
                <div class="empty-state-copy">
                    <h2>還沒有任何答案卡</h2>
                    <p>先建立題目數、選項與 Section 結構，之後就能快速作答、計時與查看成績。</p>
                    <button class="md-btn md-btn-contained" id="btn-goto-create-empty"><i class="fa-solid fa-plus"></i> 開始製作</button>
                </div>
            </div>
        `;
        if (document.getElementById('btn-goto-create-empty')) {
            document.getElementById('btn-goto-create-empty').addEventListener('click', () => navigateTo('create'));
        }
    } else {
        const escapeHtml = (str) => String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        let html = headerActionsHtml + `<div class="preview-grid">`;
        cards.forEach(c => {
            const hasKey = c.answerKey !== null;
            const history = store.getHistoryByCardId(c.id);
            const escapedCardName = escapeHtml(c.name);
            const pausedTest = store.getPausedTest(c.id);
            const allTags = store.getTags();
            const cardTags = (c.tagIds || []).map(tid => allTags.find(t => t.id === tid)).filter(Boolean);
            const tagsHtml = cardTags.length > 0 
                ? cardTags.map(t => `<span class="tag-chip" style="background:${normalizeTagColor(t.color)}; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; margin-right:4px;">${escapeHtml(t.name)}</span>`).join('') 
                : `<span style="font-size:12px; color:var(--text-secondary);">無標籤</span>`;

            html += `
                <div class="md-card preview-item">
                    <div class="preview-item-header">
                        <div class="card-name-row">
                            <h3 class="card-name-label" data-id="${c.id}" title="雙擊可修改名稱">${escapedCardName}</h3>
                            <input type="text" class="md-input card-name-input hidden" data-id="${c.id}" data-original="${escapedCardName}" value="${escapedCardName}" aria-label="答案卡名稱">
                        </div>
                        <div class="card-meta">
                            <span><i class="fa-regular fa-circle-question"></i> 共 ${c.totalQuestions} 題</span>
                            <span><i class="fa-solid fa-layer-group"></i> ${c.sections.reduce((acc, s) => acc + s.parts.length, 0)} 個 Part</span>
                            <span><i class="fa-regular fa-clock"></i> 歷史 ${history.length}</span>
                        </div>
                        <div class="card-tags-row" style="margin-top:8px; display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
                            ${tagsHtml}
                            <button class="btn-edit-card-tags tag-action-btn" data-id="${c.id}" title="Add tags"><i class="fa-solid fa-plus"></i><i class="fa-solid fa-tag"></i></button>${cardTags.length > 0 ? `<button class="btn-open-remove-card-tags tag-action-btn" data-id="${c.id}" title="Remove tags"><i class="fa-solid fa-minus"></i><i class="fa-solid fa-tag"></i></button>` : ''}
                        </div>
                    </div>
                    <div class="preview-actions" style="margin-top:0; display:flex; gap:6px;">
                        <button class="md-btn md-btn-contained btn-start-test-action" data-id="${c.id}" style="flex:3; padding:0 4px; font-size:0.75rem;"><i class="fa-solid fa-play"></i> ${pausedTest ? '開始/繼續測驗' : '開始測驗'}</button>
                        <button class="md-btn md-btn-outlined btn-set-key-action" data-id="${c.id}" style="flex:2; padding:0 4px; font-size:0.75rem;"><i class="fa-solid ${hasKey ? 'fa-circle-check' : 'fa-circle-xmark'}" style="color:${hasKey ? 'var(--md-success)' : 'var(--md-error)'};"></i> 解答</button>
                        ${history.length > 0 ? `<button class="md-btn md-btn-outlined btn-view-history-action" data-id="${c.id}" style="flex:2; padding:0 4px; font-size:0.75rem;"><i class="fa-solid fa-chart-line"></i> 歷史(${history.length})</button>` : `<button class="md-btn md-btn-outlined" disabled style="flex:2; padding:0 4px; font-size:0.75rem; cursor:default;"><i class="fa-solid fa-chart-line"></i> 歷史(0)</button>`}
                        <button class="md-btn md-btn-text md-btn-error btn-delete-card-action" data-id="${c.id}" style="flex:2; padding:0 4px; font-size:0.75rem; min-width:auto;"><i class="fa-solid fa-trash-can"></i> 刪除</button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        appContainer.innerHTML = html;

        // Bind Card Actions
        document.querySelectorAll('.card-name-label').forEach(label => {
            label.addEventListener('dblclick', () => {
                const cardId = label.dataset.id;
                const input = document.querySelector(`.card-name-input[data-id="${cardId}"]`);
                if (!input) return;
                input.value = label.textContent;
                label.classList.add('hidden');
                input.classList.remove('hidden');
                input.focus();
                input.select();
            });
        });

        document.querySelectorAll('.card-name-input').forEach(input => {
            const cardId = input.dataset.id;
            const label = document.querySelector(`.card-name-label[data-id="${cardId}"]`);
            if (!label) return;
            const closeEditor = () => { input.classList.add('hidden'); label.classList.remove('hidden'); };
            const saveName = () => {
                const newName = input.value.trim();
                const originalName = input.dataset.original || '';
                if (!newName) { input.value = originalName; closeEditor(); return; }
                if (newName !== originalName) { store.renameCard(cardId, newName); input.dataset.original = newName; }
                label.textContent = newName; input.value = newName; closeEditor();
            };
            input.addEventListener('blur', saveName);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
                else if (e.key === 'Escape') { e.preventDefault(); input.value = input.dataset.original || label.textContent; closeEditor(); }
            });
        });

        document.querySelectorAll('.btn-start-test-action').forEach(btn => {
            btn.addEventListener('click', async () => {
                const cardId = btn.dataset.id;
                if (store.getPausedTest(cardId)) {
                    const choice = await showAppChoice('您有一個尚未完成的測驗進度。', '開始測驗', [
                        { label: '繼續上次的測驗', value: 'resume', variant: 'primary' },
                        { label: '放棄並開啟新測驗', value: 'restart', variant: 'danger' }
                    ]);
                    if (choice === 'resume') {
                        navigateTo('test', { cardId: cardId, mode: 'test', isResume: true });
                    } else if (choice === 'restart') {
                        store.clearPausedTest(cardId);
                        navigateTo('test', { cardId: cardId, mode: 'test' });
                    }
                } else {
                    navigateTo('test', { cardId: cardId, mode: 'test' });
                }
            });
        });
        document.querySelectorAll('.btn-set-key-action').forEach(btn => {
            btn.addEventListener('click', () => navigateTo('test', { cardId: btn.dataset.id, mode: 'set_key' }));
        });
        document.querySelectorAll('.btn-view-history-action').forEach(btn => {
            btn.addEventListener('click', () => window.viewHistory(btn.dataset.id));
        });
        document.querySelectorAll('.btn-delete-card-action').forEach(btn => {
            btn.addEventListener('click', () => window.deleteCard(btn.dataset.id));
        });
    }

    // Bind Top Level Actions
    document.getElementById('btn-goto-create').addEventListener('click', () => navigateTo('create'));
    if (document.getElementById('btn-manage-tags')) {
        document.getElementById('btn-manage-tags').addEventListener('click', () => window.manageTags());
    }
    
    // Bind Filter & Sort
    const selTagFilter = document.getElementById('sel-tag-filter');
    if (selTagFilter) {
        syncTagFilterDisplayColor();
        selTagFilter.addEventListener('change', (e) => {
            homeFilterTag = e.target.value;
            syncTagFilterDisplayColor();
            renderHome();
        });
    }
    const selSortBy = document.getElementById('sel-sort-by');
    if (selSortBy) {
        selSortBy.addEventListener('change', (e) => {
            homeSortBy = e.target.value;
            renderHome();
        });
    }

    // Bind Edit Card Tags
    document.querySelectorAll('.btn-edit-card-tags').forEach(btn => {
        btn.addEventListener('click', () => window.manageCardTags(btn.dataset.id));
    });
    document.querySelectorAll('.btn-open-remove-card-tags').forEach(btn => {
        btn.addEventListener('click', () => window.removeCardTags(btn.dataset.id));
    });
    // Export Logic
    document.getElementById('btn-export-data').addEventListener('click', () => {
        const dataStr = JSON.stringify(store.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `answer_card_backup_${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Import Logic
    document.getElementById('btn-import-data').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async event => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    if (importedData && importedData.answerCards && importedData.history) {
                        // Merge Logic: Keep existing if newer
                        let cardsAdded = 0, historyAdded = 0;
                        const existingCardIds = new Set(store.data.answerCards.map(c => c.id));
                        const existingHistIds = new Set(store.data.history.map(h => h.id));

                        importedData.answerCards.forEach(ic => {
                            if (!existingCardIds.has(ic.id)) {
                                store.data.answerCards.push(ic);
                                cardsAdded++;
                            }
                        });

                        importedData.history.forEach(ih => {
                            if (!existingHistIds.has(ih.id)) {
                                store.data.history.push(ih);
                                historyAdded++;
                            } else {
                                // Update history if imported is newer (history has date)
                                const existingHist = store.data.history.find(h => h.id === ih.id);
                                if (ih.date > existingHist.date) {
                                    Object.assign(existingHist, ih);
                                    historyAdded++;
                                }
                            }
                        });

                        store.saveData();
                        await showAppAlert(`資料匯入成功！\n新增/更新了 ${cardsAdded} 張答案卡, ${historyAdded} 筆歷史紀錄。`);
                        navigateTo('home');
                    } else {
                        await showAppAlert('無效的備份檔案格式！');
                    }
                } catch (err) {
                    await showAppAlert('讀取檔案失敗：' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });
}

// ========== Tag Management Functions ==========
window.manageTags = () => {
    const modalContainer = document.getElementById('modal-container');
    const renderModal = () => {
        const tags = store.getTags();
        let listHtml = tags.map(t => `
            <div class="tag-manage-row" style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid var(--border-color);">
                <div style="display:flex; align-items:center; gap:8px;">
                    <input type="color" class="tag-color-input" data-id="${t.id}" value="${t.color || '#e2e8f0'}" style="width:24px; height:24px; padding:0; border:none; cursor:pointer; background:transparent;" title="設定標籤顏色">
                    <input type="text" class="md-input tag-name-input" data-id="${t.id}" value="${escapeHtmlText(t.name)}" style="padding:4px 8px; height:auto;">
                </div>
                <button class="md-btn md-btn-text md-btn-error btn-delete-tag" data-id="${t.id}" title="刪除標籤"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `).join('');

        if (tags.length === 0) listHtml = `<p style="color:var(--text-secondary); padding:8px;">目前沒有任何標籤</p>`;

        modalContainer.innerHTML = `
            <div class="modal-dialog" role="dialog" aria-modal="true">
                <div class="modal-header">
                    <h3>管理標籤</h3>
                    <div class="modal-header-actions">
                        <button class="md-btn md-btn-text modal-close-btn" id="btn-close-tags-modal">關閉</button>
                    </div>
                </div>
                <div class="tag-create-area" style="display:flex; gap:8px; padding:16px 0; border-bottom:1px solid var(--border-color);">
                    <input type="text" class="md-input" id="inp-new-tag" placeholder="輸入新標籤名稱">
                    <button class="md-btn md-btn-contained" id="btn-add-tag" title="新增標籤" style="min-width: 44px; padding: 0 16px;"><i class="fa-solid fa-plus"></i></button>
                </div>
                <div class="tag-list" style="max-height:300px; overflow-y:auto; padding-top:8px;">
                    ${listHtml}
                </div>
            </div>
        `;
        modalContainer.classList.remove('hidden');

        document.getElementById('btn-close-tags-modal').addEventListener('click', () => {
            modalContainer.classList.add('hidden');
            renderHome(); // refresh home to reflect changes
        });

        document.getElementById('btn-add-tag').addEventListener('click', () => {
            const val = document.getElementById('inp-new-tag').value.trim();
            if (val) {
                store.addTag(val);
                renderModal();
            }
        });

        document.querySelectorAll('.tag-name-input').forEach(inp => {
            inp.addEventListener('blur', (e) => {
                const newName = e.target.value.trim();
                const id = e.target.dataset.id;
                if (newName) store.renameTag(id, newName);
                else e.target.value = store.getTags().find(t => t.id === id).name; // restore if empty
            });
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') e.target.blur();
            });
        });

        document.querySelectorAll('.tag-color-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const newColor = e.target.value;
                const id = e.target.dataset.id;
                store.updateTagColor(id, newColor);
                renderHome(); // Immediately reflect color changes on cards if modal is closed
            });
        });

        document.querySelectorAll('.btn-delete-tag').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tag = store.getTags().find(t => t.id === e.currentTarget.dataset.id);
                const confirm = await showAppConfirm(`確定要刪除標籤「${tag.name}」嗎？這會從所有套用此標籤的答案卡中移除，但不會刪除答案卡。`);
                if (confirm) {
                    store.deleteTag(tag.id);
                    // if current filter is this tag, reset it
                    if (homeFilterTag === tag.id) homeFilterTag = 'all';
                    renderModal();
                }
            });
        });
    };
    renderModal();
};

window.removeCardTags = (cardId) => {
    const card = store.getCardById(cardId);
    if (!card) return;
    const modalContainer = document.getElementById('modal-container');
    const allTags = store.getTags();
    const cardTags = (card.tagIds || []).map(tid => allTags.find(t => t.id === tid)).filter(Boolean);

    const closeModal = () => {
        modalContainer.classList.add('hidden');
        modalContainer.innerHTML = '';
    };

    if (cardTags.length === 0) {
        showAppAlert('This card has no tags.');
        return;
    }

    modalContainer.innerHTML = `
        <div class="modal-dialog card-tag-remove-dialog" role="dialog" aria-modal="true">
            <div class="modal-header">
                <h3>Remove Tags</h3>
                <button class="md-btn md-btn-text modal-close-btn" id="btn-close-remove-card-tags" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="card-tag-remove-list">
                ${cardTags.map(t => `
                    <div class="card-tag-remove-row">
                        <span class="tag-chip" style="background:${normalizeTagColor(t.color)}; color:#fff;">${escapeHtmlText(t.name)}</span>
                        <button class="md-btn md-btn-outlined btn-remove-tag-from-card" data-tag-id="${escapeHtmlText(t.id)}">
                            <i class="fa-solid fa-minus"></i> Remove
                        </button>
                    </div>
                `).join('')}
            </div>
            <div class="modal-actions">
                <button class="md-btn md-btn-contained" id="btn-done-remove-card-tags">Done</button>
            </div>
        </div>
    `;
    modalContainer.classList.remove('hidden');

    document.getElementById('btn-close-remove-card-tags').addEventListener('click', closeModal);
    document.getElementById('btn-done-remove-card-tags').addEventListener('click', closeModal);
    document.querySelectorAll('.btn-remove-tag-from-card').forEach(btn => {
        btn.addEventListener('click', () => {
            const nextTagIds = (card.tagIds || []).filter(tagId => tagId !== btn.dataset.tagId);
            store.setCardTags(card.id, nextTagIds);
            if (homeFilterTag === btn.dataset.tagId) homeFilterTag = 'all';
            closeModal();
            renderHome();
        });
    });
};
window.manageCardTags = (cardId) => {
    const card = store.getCardById(cardId);
    if (!card) return;
    const modalContainer = document.getElementById('modal-container');
    const tags = store.getTags();
    const currentTagIds = card.tagIds || [];

    if (tags.length === 0) {
        showAppAlert('目前沒有任何標籤，請先至「管理標籤」建立！');
        return;
    }

    let listHtml = tags.map(t => {
        const checked = currentTagIds.includes(t.id) ? 'checked' : '';
        return `
            <label style="display:flex; align-items:center; gap:8px; padding:8px; cursor:pointer;">
                <input type="checkbox" class="card-tag-checkbox" value="${t.id}" ${checked}>
                <span>${escapeHtmlText(t.name)}</span>
            </label>
        `;
    }).join('');

    modalContainer.innerHTML = `
        <div class="modal-dialog" role="dialog" aria-modal="true">
            <div class="modal-header">
                <h3>編輯答案卡標籤: ${escapeHtmlText(card.name)}</h3>
            </div>
            <div class="tag-list" style="max-height:300px; overflow-y:auto; padding:16px 0;">
                ${listHtml}
            </div>
            <div class="modal-actions">
                <button class="md-btn md-btn-outlined" id="btn-cancel-card-tags">取消</button>
                <button class="md-btn md-btn-contained" id="btn-save-card-tags">儲存</button>
            </div>
        </div>
    `;
    modalContainer.classList.remove('hidden');

    const closeModal = () => {
        modalContainer.classList.add('hidden');
    };

    document.getElementById('btn-cancel-card-tags').addEventListener('click', closeModal);
    document.getElementById('btn-save-card-tags').addEventListener('click', () => {
        const selectedIds = Array.from(document.querySelectorAll('.card-tag-checkbox:checked')).map(cb => cb.value);
        store.setCardTags(cardId, selectedIds);
        closeModal();
        renderHome();
    });
};

// ========== 2. Create Page (Wizard) ==========
let createWizardState = {
    step: 1,
    optionsCount: 4,
    sections: [
        { id: 1, name: '預設區塊', parts: [{ id: 1, count: 10, start: 1, end: 10 }] }
    ],
    name: ''
};

function renderCreate() {
    document.body.classList.remove('home-page');
    navTitle.textContent = '製作答案卡';
    navActions.innerHTML = `
        <button class="md-btn md-btn-text" id="nav-btn-reset"><i class="fa-solid fa-rotate-right"></i>重新設定</button>
        <button class="md-btn md-btn-text" id="nav-btn-home"><i class="fa-solid fa-house"></i>首頁</button>
    `;
    document.getElementById('nav-btn-home').addEventListener('click', () => navigateTo('home'));
    document.getElementById('nav-btn-reset').addEventListener('click', () => {
        createWizardState = { step: 1, optionsCount: 4, sections: [{ id: 1, name: '預設區塊', parts: [{ id: 1, count: 10, start: 1, end: 10 }] }], name: '' };
        renderCreate();
    });

    const is1 = createWizardState.step === 1;
    const is2 = createWizardState.step === 2;
    const is3 = createWizardState.step === 3;

    appContainer.innerHTML = `
        <div class="md-card wizard-shell">
            <div class="wizard-progress">
                <div class="wizard-step ${is1 ? 'active' : (createWizardState.step > 1 ? 'completed' : '')}" onclick="window.goToStep(1)">1</div>
                <div class="wizard-step ${is2 ? 'active' : (createWizardState.step > 2 ? 'completed' : '')}" onclick="window.goToStep(2)">2</div>
                <div class="wizard-step ${is3 ? 'active' : ''}" onclick="window.goToStep(3)">3</div>
            </div>
            
            <div class="wizard-body" id="wizard-body">
                <!-- Dynamic Content -->
            </div>

            <div class="wizard-actions">
                <button class="md-btn md-btn-outlined" id="btn-wiz-prev" ${is1 ? 'disabled' : ''}>上一步</button>
                <button class="md-btn md-btn-contained" id="btn-wiz-next">${is3 ? '完成' : '下一步'}</button>
            </div>
        </div>
    `;

    window.goToStep = (targetStep) => {
        if (targetStep <= createWizardState.step) {
            createWizardState.step = targetStep;
            renderCreate();
        }
    };

    renderWizardBody();

    document.getElementById('btn-wiz-prev').addEventListener('click', () => {
        createWizardState.step--;
        renderCreate();
    });

    document.getElementById('btn-wiz-next').addEventListener('click', () => {
        if (createWizardState.step === 3) {
            saveAnswerCard();
        } else {
            createWizardState.step++;
            renderCreate();
        }
    });
}

function renderWizardBody() {
    const body = document.getElementById('wizard-body');
    if (createWizardState.step === 1) {
        body.innerHTML = `
            <h2>Step 1: 基礎設定</h2>
            <br/>
            <div class="form-group">
                <label>選擇題選項數量 (2~6)：</label>
                <input type="number" class="md-input" id="inp-options" min="2" max="6" value="${createWizardState.optionsCount}">
                <small style="color:var(--text-secondary); margin-top:4px; display:block;">預設為 4 (即 A, B, C, D)</small>
            </div>
        `;
        document.getElementById('inp-options').addEventListener('change', (e) => {
            let val = parseInt(e.target.value);
            if (val < 2) val = 2;
            if (val > 6) val = 6;
            createWizardState.optionsCount = val;
            e.target.value = val;
        });
    } else if (createWizardState.step === 2) {
        body.innerHTML = `
            <h2>Step 2: 題數與區塊 (Section) 設定</h2>
            <br/>
            <button class="md-btn md-btn-outlined" id="btn-add-section" style="margin-bottom: 16px;">+ 新增區塊</button>
            <div id="sections-container"></div>
            <div class="section-total-bar" style="font-size:1.2rem; font-weight:bold;">
                總題數: <span id="lbl-total-q" style="color: var(--md-primary);">0</span> 題
            </div>
        `;

        const sectionsContainer = document.getElementById('sections-container');
        const totalLbl = document.getElementById('lbl-total-q');

        const updateSectionsUI = () => {
            let currentStart = 1;
            let total = 0;
            let html = '';
            let globalPartId = 1;

            createWizardState.sections.forEach((sec, sIdx) => {
                let secTotal = 0;
                let partsHtml = '';

                sec.parts.forEach((p, pIdx) => {
                    p.id = globalPartId++;
                    p.start = currentStart;
                    p.end = p.start + p.count - 1;
                    secTotal += p.count;
                    total += p.count;
                    partsHtml += `
                        <div class="part-card" style="position: relative;">
                            <strong>Part ${p.id}</strong>
                            <div class="form-group" style="margin-bottom:4px;">
                                <input type="number" class="md-input part-count-inp" data-sidx="${sIdx}" data-pidx="${pIdx}" min="1" value="${p.count}" style="text-align:center; padding: 4px;">
                            </div>
                            <small>Q${p.start} - Q${p.end}</small>
                            ${sec.parts.length > 1 ? `<i class="fa-solid fa-xmark btn-remove-part" data-sidx="${sIdx}" data-pidx="${pIdx}" style="position:absolute; top:4px; right:4px; font-size:16px; cursor:pointer; color:var(--md-error);"></i>` : ''}
                        </div>
                    `;
                    currentStart = p.end + 1;
                });

                html += `
                    <div class="section-edit-card">
                        <div class="section-edit-header">
                            <input type="text" class="md-input sec-name-inp" data-sidx="${sIdx}" value="${sec.name}" placeholder="區塊名稱 (例如: Listening)" style="max-width: 250px;">
                            ${createWizardState.sections.length > 1 ? `<button class="md-btn md-btn-text md-btn-error btn-remove-sec" data-sidx="${sIdx}">刪除區塊</button>` : ''}
                        </div>
                        <div class="parts-grid">
                            ${partsHtml}
                            <button class="md-btn md-btn-text btn-add-part" data-sidx="${sIdx}" style="height: auto; min-height: 80px; border: 1px dashed var(--md-primary); color: var(--md-primary);">
                                <i class="fa-solid fa-plus"></i> 新增 Part
                            </button>
                        </div>
                    </div>
                `;
            });

            sectionsContainer.innerHTML = html;
            totalLbl.textContent = total;

            document.querySelectorAll('.sec-name-inp').forEach(inp => {
                inp.addEventListener('input', (e) => {
                    createWizardState.sections[e.target.dataset.sidx].name = e.target.value;
                });
            });

            document.querySelectorAll('.part-count-inp').forEach(inp => {
                inp.addEventListener('change', (e) => {
                    const sIdx = parseInt(e.target.dataset.sidx);
                    const pIdx = parseInt(e.target.dataset.pidx);
                    let val = parseInt(e.target.value) || 1;
                    if (val < 1) val = 1;
                    createWizardState.sections[sIdx].parts[pIdx].count = val;
                    updateSectionsUI();
                });
            });

            document.querySelectorAll('.btn-add-part').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const sIdx = parseInt(e.currentTarget.dataset.sidx);
                    createWizardState.sections[sIdx].parts.push({ id: 0, count: 10, start: 0, end: 0 });
                    updateSectionsUI();
                });
            });

            document.querySelectorAll('.btn-remove-part').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const sIdx = parseInt(e.currentTarget.dataset.sidx);
                    const pIdx = parseInt(e.currentTarget.dataset.pidx);
                    createWizardState.sections[sIdx].parts.splice(pIdx, 1);
                    updateSectionsUI();
                });
            });

            document.querySelectorAll('.btn-remove-sec').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const sIdx = parseInt(e.currentTarget.dataset.sidx);
                    createWizardState.sections.splice(sIdx, 1);
                    updateSectionsUI();
                });
            });
        };

        document.getElementById('btn-add-section').addEventListener('click', () => {
            createWizardState.sections.push({ id: Date.now(), name: `區塊 ${createWizardState.sections.length + 1}`, parts: [{ id: 0, count: 10, start: 0, end: 0 }] });
            updateSectionsUI();
        });

        updateSectionsUI();

    } else if (createWizardState.step === 3) {
        const totalQ = createWizardState.sections.reduce((sum, s) => sum + s.parts.reduce((pSum, p) => pSum + p.count, 0), 0);
        body.innerHTML = `
            <h2>Step 3: 確認與儲存</h2>
            <br/>
            <div class="summary-panel">
                <p><strong>選項數量：</strong> ${createWizardState.optionsCount}</p>
                <p><strong>區塊數量：</strong> ${createWizardState.sections.length}</p>
                <p><strong>總題數：</strong> ${totalQ}</p>
            </div>
            <div class="form-group">
                <label>請輸入這張答案卡的名稱：</label>
                <input type="text" class="md-input" id="inp-card-name" placeholder="例如：TOEIC 全真模擬卡" value="${createWizardState.name}">
            </div>
        `;
        document.getElementById('inp-card-name').addEventListener('input', (e) => {
            createWizardState.name = e.target.value;
        });
    }
}

function saveAnswerCard() {
    const totalQuestions = createWizardState.sections.reduce((sum, s) => sum + s.parts.reduce((pSum, p) => pSum + p.count, 0), 0);
    const name = createWizardState.name.trim() || '未命名答案卡';

    store.addCard({
        name,
        optionsCount: createWizardState.optionsCount,
        sections: JSON.parse(JSON.stringify(createWizardState.sections)),
        totalQuestions
    });

    // Reset state and go to home
    createWizardState = { step: 1, optionsCount: 4, sections: [{ id: 1, name: '預設區塊', parts: [{ id: 1, count: 10, start: 1, end: 10 }] }], name: '' };
    navigateTo('home');
}

// renderPreview is removed as it's merged into renderHome

window.viewHistory = (cardId) => {
    const modalContainer = document.getElementById('modal-container');
    const card = store.getCardById(cardId);
    if (!card) return;
    let sortDirection = 'asc';
    const formatDuration = (totalSeconds) => {
        if (typeof totalSeconds !== 'number' || totalSeconds < 0) return '未記錄';
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) return `${h}小時 ${String(m).padStart(2, '0')}分 ${String(s).padStart(2, '0')}秒`;
        return `${m}分 ${String(s).padStart(2, '0')}秒`;
    };
    const formatScore = (record) => {
        if (record.score === null) return '未設定答案';
        if (typeof record.score === 'object') {
            return `${record.score.totalCorrect} / ${record.score.totalQuestions}`;
        }
        return `${record.score} / ${card.totalQuestions}`;
    };
    const getStableHistoryNumberMap = () => {
        const ordered = store.getHistoryByCardId(cardId).sort((a, b) => {
            if (a.date !== b.date) return a.date - b.date;
            return a.id.localeCompare(b.id);
        });
        const numberMap = {};
        ordered.forEach((record, idx) => {
            numberMap[record.id] = idx + 1;
        });
        return numberMap;
    };
    const formatDate = (timestamp) => {
        const d = new Date(timestamp);
        return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const closeHistoryModal = () => {
        modalContainer.classList.add('hidden');
        modalContainer.innerHTML = '';
    };

    const bindModalActions = () => {
        const closeBtn = document.getElementById('btn-close-history-modal');
        if (closeBtn) closeBtn.addEventListener('click', closeHistoryModal);

        modalContainer.querySelectorAll('.history-item-open').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetHistoryId = btn.dataset.historyId;
                closeHistoryModal();
                navigateTo('test', { cardId: cardId, mode: 'review', historyId: targetHistoryId });
            });
        });

        modalContainer.querySelectorAll('.history-item-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const targetHistoryId = btn.dataset.historyId;
                const testName = btn.dataset.testName || '這筆測驗';
                const shouldDelete = await showAppConfirm(`確定要刪除「${testName}」嗎？此動作無法復原。`, '刪除歷史', 'danger');
                if (!shouldDelete) return;
                store.deleteHistoryById(targetHistoryId);
                renderHistoryModal();
            });
        });

        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) closeHistoryModal();
        }, { once: true });
    };

    const renderHistoryModal = () => {
        const hist = store.getHistoryByCardId(cardId);
        const stableNumberMap = getStableHistoryNumberMap();
        const sortedHist = [...hist].sort((a, b) => sortDirection === 'asc' ? a.date - b.date : b.date - a.date);
        if (!sortedHist.length) {
            closeHistoryModal();
            renderHome();
            return;
        }

        let listHtml = '';
        sortedHist.forEach((record) => {
            const scoreText = formatScore(record);
            const stableNo = stableNumberMap[record.id] || '-';
            const durationText = formatDuration(record.durationSeconds);
            listHtml += `
                    <div class="history-item-row">
                        <button class="history-item-btn history-item-open" data-history-id="${record.id}">
                            <div class="history-item-main">
                                <strong>${stableNo}. ${record.testName}</strong>
                                <span class="history-item-duration">花費時間：${durationText}</span>
                                <small>${formatDate(record.date)}</small>
                            </div>
                            <div class="history-item-score">${scoreText}</div>
                        </button>
                        <button class="md-btn md-btn-text md-btn-error history-item-delete" data-history-id="${record.id}" data-test-name="${record.testName}" title="刪除此筆歷史">刪除</button>
                    </div>
                `;
        });

        modalContainer.innerHTML = `
                <div class="modal-dialog" role="dialog" aria-modal="true" aria-label="歷史測驗清單">
                    <div class="modal-header">
                        <h3>歷史測驗清單</h3>
                        <div class="modal-header-actions">
                            <button class="md-btn md-btn-text sort-toggle-btn" id="btn-toggle-history-sort" title="切換排序">
                                <i class="fa-solid ${sortDirection === 'asc' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                            </button>
                            <button class="md-btn md-btn-text modal-close-btn" id="btn-close-history-modal">關閉</button>
                        </div>
                    </div>
                    <div class="history-list">${listHtml}</div>
                </div>
            `;
        modalContainer.classList.remove('hidden');
        bindModalActions();
        const sortBtn = document.getElementById('btn-toggle-history-sort');
        if (sortBtn) {
            sortBtn.addEventListener('click', () => {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                renderHistoryModal();
            });
        }
    };

    renderHistoryModal();
};

window.deleteCard = async (id) => {
    const shouldDelete = await showAppConfirm('確定要刪除這張答案卡與所有的測驗歷史紀錄嗎？這個動作無法復原。', '刪除答案卡', 'danger');
    if (!shouldDelete) return;
    store.deleteCard(id);
    renderHome();
};

// ========== 4. Test Page (Multi-Mode) ==========
let testState = {
    timerInterval: null,
    secondsElapsed: 0,
    answers: {},
    flagged: {},
    isStarted: false,
    isPaused: false
};

const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

function renderTest(params) {
    document.body.classList.remove('home-page');
    const cardId = params.cardId || params;
    const mode = params.mode || 'test'; // 'test', 'set_key', 'review'
    const historyId = params.historyId;

    const card = store.getCardById(cardId);
    if (!card) return navigateTo('home');
    const formatDuration = (totalSeconds) => {
        if (typeof totalSeconds !== 'number' || totalSeconds < 0) return '未記錄';
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) return `${h}小時 ${String(m).padStart(2, '0')}分 ${String(s).padStart(2, '0')}秒`;
        return `${m}分 ${String(s).padStart(2, '0')}秒`;
    };

    let historyRecord = null;
    let reviewHistoryOptions = [];
    if (mode === 'review' && historyId) {
        reviewHistoryOptions = store.getHistoryByCardId(cardId).sort((a, b) => a.date - b.date);
        historyRecord = reviewHistoryOptions.find(h => h.id === historyId);
        if (!historyRecord) return navigateTo('home');
    }

    const hasAnswerKey = !!(card.answerKey && Object.keys(card.answerKey).length > 0);

    // Reset state
    testState = { timerInterval: null, secondsElapsed: 0, answers: {}, flagged: {}, isStarted: false, isPaused: false };

    if (mode === 'test' && params.isResume) {
        const pausedData = store.getPausedTest(cardId);
        if (pausedData) {
            testState.answers = pausedData.answers || {};
            testState.flagged = pausedData.flagged || {};
            testState.secondsElapsed = pausedData.secondsElapsed || 0;
            // The user will need to click "Start" again to unpause
        }
    } else if (mode === 'set_key' && card.answerKey) {
        testState.answers = { ...card.answerKey };
    }

    // Nav setup
    navTitle.textContent = mode === 'test' ? '模擬考試: ' + card.name :
        mode === 'set_key' ? '設定答案: ' + card.name :
            '測驗歷史檢討: ' + card.name;
    navActions.innerHTML = `<button class="md-btn md-btn-text" id="nav-btn-abandon"><i class="fa-solid ${mode === 'test' ? 'fa-xmark' : 'fa-arrow-left'}"></i>${mode === 'test' ? '放棄測驗' : '返回'}</button>`;

    document.getElementById('nav-btn-abandon').addEventListener('click', async () => {
        if (mode === 'test') {
            const shouldAbandon = await showAppConfirm('確定要放棄考試嗎？進度將不會儲存。', '放棄測驗', 'danger');
            if (!shouldAbandon) return;
        }
        if (mode === 'test') store.clearPausedTest(cardId); // Cancel test should clear resume state
        if (testState.timerInterval) clearInterval(testState.timerInterval);
        navigateTo('home');
    });

    // Content Generation
    let partsHtml = '';
    card.sections.forEach(sec => {
        partsHtml += `<div class="section-container" style="margin-bottom: 24px; padding: 14px 12px; background: linear-gradient(180deg, rgba(30,79,168,0.06), rgba(30,79,168,0.02)); border: 1px solid rgba(30,79,168,0.12); border-radius: 3px;">`;
        partsHtml += `<h3 style="text-align: center; color: var(--md-primary); margin-bottom: 12px; letter-spacing: 0.01em;">${sec.name}</h3>`;
        sec.parts.forEach(part => {
            partsHtml += `
                <div class="part-section">
                    <div class="part-separator">Part ${part.id} (Q${part.start} - Q${part.end})</div>
                    <div class="questions-grid">
            `;

            for (let q = part.start; q <= part.end; q++) {
                let bubblesHtml = '';
                const isReview = mode === 'review';
                const userAns = isReview ? historyRecord.answers[q] : null;
                const correctAns = isReview ? (card.answerKey ? card.answerKey[q] : null) : null;

                for (let opt = 0; opt < card.optionsCount; opt++) {
                    const letter = optionLetters[opt] || '?';
                    let classes = 'bubble';

                    if (mode === 'test') {
                        classes += ' locked';
                    } else if (mode === 'set_key') {
                        if (testState.answers[q] === letter) classes += ' selected';
                    } else if (mode === 'review') {
                        classes += ' locked';
                        if (userAns === letter && correctAns === letter) {
                            classes += ' review-correct';
                        } else if (userAns === letter && correctAns !== letter) {
                            classes += ' review-wrong';
                        } else if (userAns !== letter && correctAns === letter) {
                            classes += ' review-key';
                        } else if (!userAns && correctAns === letter) {
                            classes += ' review-key';
                        } else if (!correctAns && userAns === letter) {
                            // selected but no key available
                            classes += ' selected';
                        }
                    }

                    bubblesHtml += `<div class="${classes}" data-q="${q}" data-val="${letter}">${letter}</div>`;
                }

                partsHtml += `
                    <div class="question-row ${testState.flagged[q] ? 'flagged' : ''}">
                        <div class="q-num">${q}.</div>
                        <div class="bubble-group">${bubblesHtml}</div>
                    </div>
                `;
            }
            partsHtml += `</div></div>`;
        });
        partsHtml += `</div>`;
    });

    // Header HTML based on mode
    let headerHtml = '';
    if (mode === 'test') {
        headerHtml = `
            <div class="test-entry-header">
                <div class="test-entry-name">
                    <button type="button" class="test-name-display" id="test-name-display" title="點擊修改測驗名稱">模擬測驗</button>
                    <input type="text" id="test-instance-name" class="md-input hidden" value="" placeholder="模擬測驗" aria-label="測驗名稱">
                </div>
                <div class="test-entry-tools">
                    <button class="md-btn md-btn-outlined" id="btn-live-feedback" ${hasAnswerKey ? '' : 'disabled'}>即時對答: 關</button>
                    <button class="md-btn md-btn-outlined" id="btn-toggle-chain">題號鏈: 開</button>
                </div>
            </div>
            <div class="test-status-sticky">
                <div id="test-timer-display" class="test-timer test-timer-box">00:00</div>
                <div id="test-progress-text" class="test-progress">完成度: 0 / ${card.totalQuestions}</div>
                <button class="md-btn md-btn-contained btn-start-danger" id="btn-toggle-test">開始測驗</button>
            </div>
        `;
    } else if (mode === 'set_key') {
        const timeLimitValue = (typeof card.timeLimitMinutes === 'number' && card.timeLimitMinutes > 0) ? card.timeLimitMinutes : '';
        headerHtml = `
            <div class="test-sticky-header set-key-header">
                <p class="set-key-hint">請直接點擊圓圈設定正確答案。<br/>設定完成後點擊下方按鈕儲存。</p>
                <div class="set-key-time-row">
                    <label class="set-key-time-label">考試時間（分鐘，可留空）</label>
                    <input type="number" id="inp-time-limit-minutes" class="md-input" min="1" step="1" value="${timeLimitValue}" placeholder="例如：60">
                </div>
                <div class="set-key-tools">
                    <button class="md-btn md-btn-outlined" id="btn-paste-answers">貼上答案</button>
                    <button class="md-btn md-btn-outlined md-btn-error" id="btn-clear-answers">清空答案</button>
                </div>
                <div class="set-key-save-wrap">
                    <button class="md-btn md-btn-contained set-key-save-btn" id="btn-save-key">
                        <span class="set-key-save-title">儲存答案</span>
                        <span id="test-progress-text" class="test-progress set-key-progress">答案：${Object.keys(testState.answers).length} / ${card.totalQuestions}</span>
                    </button>
                </div>
            </div>
        `;
    } else if (mode === 'review') {
        const reviewOptionsHtml = reviewHistoryOptions.map((h, idx) => {
            const d = new Date(h.date);
            const dateLabel = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            return `<option value="${h.id}" ${h.id === historyRecord.id ? 'selected' : ''}>${idx + 1}. ${h.testName} (${dateLabel})</option>`;
        }).join('');

        let scoreDetailsHtml = '';
        const detailedScore = typeof historyRecord.score === 'object' && historyRecord.score !== null
            ? historyRecord.score
            : store.calculateScore(card.id, historyRecord.answers);

        if (detailedScore !== null && typeof detailedScore === 'object') {
            const { totalCorrect, totalQuestions, sectionsScore, partsScore } = detailedScore;
            const scorePercent = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
            scoreDetailsHtml += `
                <div class="score-summary">
                    <div>
                        <div class="score-summary-label">總分</div>
                        <div class="score-summary-value">${totalCorrect} / ${totalQuestions}</div>
                    </div>
                    <div class="score-summary-value">${scorePercent}%</div>
                </div>
            `;
            scoreDetailsHtml += `<div class="score-breakdown">`;

            card.sections.forEach(sec => {
                const secScore = sectionsScore[sec.id];
                if (!secScore) return;
                scoreDetailsHtml += `
                <div class="score-section-card">
                    <div class="score-section-head">
                        <span class="score-section-name">${sec.name}</span>
                        <span class="score-section-value">${secScore.correct} / ${secScore.total}</span>
                    </div>
                    <div class="score-parts">
                `;
                sec.parts.forEach(p => {
                    const pScore = partsScore[p.id];
                    if (!pScore) return;
                    scoreDetailsHtml += `
                        <div class="score-part-pill">
                            Part ${p.id}: <strong>${pScore.correct} / ${pScore.total}</strong>
                        </div>
                    `;
                });
                scoreDetailsHtml += `</div></div>`;
            });
            scoreDetailsHtml += `</div>`;
        } else {
            const sVal = typeof historyRecord.score === 'number' ? historyRecord.score : (historyRecord.score?.totalCorrect ?? '未設定答案');
            scoreDetailsHtml += `
                <div class="score-summary">
                    <div>
                        <div class="score-summary-label">成績</div>
                        <div class="score-summary-value">${sVal} / ${card.totalQuestions}</div>
                    </div>
                </div>
            `;
        }

        headerHtml = `
            <div class="review-header" style="flex-direction: column;">
                <img class="review-rabbit-accent" src="images/rabbit/happy.png" alt="" aria-hidden="true">
                <div style="width: 100%; text-align:center; max-width: 760px;">
                    <div style="margin-bottom:16px;">
                        <select id="review-history-select" class="md-input" style="min-width:280px; max-width:100%;">
                            ${reviewOptionsHtml}
                        </select>
                    </div>
                    <h2 style="margin-bottom:8px;">測驗名稱: ${historyRecord.testName}</h2>
                    ${scoreDetailsHtml}
                    <p style="color:var(--text-secondary); margin-top:16px;">
                        花費時間: ${formatDuration(historyRecord.durationSeconds)}
                    </p>
                </div>
            </div>
        `;
    }

    // Mini-map logic & Vertical Flowing Chain
    let miniMapHtml = '';
    let verticalChainHtml = '';

    if (mode === 'test') {
        let gridHtml = '';
        let chainHtml = '';
        for (let i = 1; i <= card.totalQuestions; i++) {
            gridHtml += `<div class="minimap-node" data-target="${i}">${i}</div>`;
            chainHtml += `<div class="vertical-chain-node" data-target="${i}" title="第 ${i} 題"></div>`;
        }
        miniMapHtml = `
            <div id="minimap-drawer" class="minimap-drawer hidden">
                <div class="minimap-header">
                    <h3>導航地圖</h3>
                    <button class="md-btn md-btn-text" id="btn-close-minimap" style="min-width: 0; padding: 4px;"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="minimap-grid">${gridHtml}</div>
            </div>
        `;

        verticalChainHtml = `
            <aside class="vertical-chain-container" id="vertical-chain-container" aria-label="題號鏈導覽">
                <div class="vertical-chain-track" id="vertical-chain-track"></div>
                <div class="vertical-chain-inner">
                    ${chainHtml}
                </div>
            </aside>
        `;
    }

    const testBodyHtml = mode === 'test'
        ? `
        <div class="test-body-layout" id="test-body-layout">
            ${verticalChainHtml}
            <div class="test-questions-wrap" id="test-questions-wrap">
                ${partsHtml}
            </div>
        </div>
        `
        : partsHtml;

    const floatingControlsHtml = mode === 'test' ? `
        <div class="floating-action-stack">
            <button class="md-btn md-btn-contained scroll-jump-btn hidden" id="btn-scroll-up" title="回到上方">
                <i class="fa-solid fa-arrow-up"></i>
            </button>
            <button class="md-btn md-btn-contained scroll-jump-btn hidden" id="btn-scroll-down-latest" title="前往最新作答題目">
                <i class="fa-solid fa-arrow-down"></i>
            </button>
            <button id="btn-toggle-minimap" class="md-btn md-btn-contained mini-fab-btn minimap-fab-btn" title="開啟導航地圖">
                <i class="fa-solid fa-table-cells"></i>
            </button>
        </div>
    ` : '';

    appContainer.innerHTML = headerHtml + `
        <div class="md-card test-container ${mode === 'test' ? 'test-locked' : ''}" id="test-card-container">
            ${testBodyHtml}
        </div>
        ${mode === 'test' ? `
            <div class="test-bottom-actions">
                <button class="md-btn md-btn-contained hidden" id="btn-finish-test">
                    <i class="fa-solid fa-check-double"></i> 交卷
                </button>
            </div>
        ` : ''}
        ${miniMapHtml}
        ${floatingControlsHtml}
    `;

    // Interactivity logic
    const container = document.getElementById('test-card-container');
    const allBubbles = document.querySelectorAll('.bubble');
    const updateProgress = () => {
        const prog = document.getElementById('test-progress-text');
        if (!prog) return;
        if (mode === 'test') prog.textContent = `完成度: ${Object.keys(testState.answers).length} / ${card.totalQuestions}`;
        if (mode === 'set_key') prog.textContent = `答案：${Object.keys(testState.answers).length} / ${card.totalQuestions}`;

        // Update minimap & vertical chain
        if (mode === 'test') {
            document.querySelectorAll('.minimap-node').forEach(node => {
                const q = node.dataset.target;
                node.classList.remove('answered', 'flagged-node');
                if (testState.answers[q]) node.classList.add('answered');
                if (testState.flagged[q]) node.classList.add('flagged-node');
            });
            document.querySelectorAll('.vertical-chain-node').forEach(node => {
                const q = node.dataset.target;
                const nextQ = (parseInt(q) + 1).toString();
                node.classList.remove('answered', 'flagged-node', 'connected-answered');
                if (testState.answers[q]) node.classList.add('answered');
                if (testState.flagged[q]) node.classList.add('flagged-node');

                if (testState.answers[q] && testState.answers[nextQ]) {
                    node.classList.add('connected-answered');
                }
            });
        }
    };
    // Initialization logic for Resume
    const applyAnswersToBubbles = () => {
        if (mode === 'review') return;
        document.querySelectorAll('.question-row').forEach(row => {
            const bubbles = row.querySelectorAll('.bubble');
            if (!bubbles.length) return;
            const q = bubbles[0].dataset.q;
            bubbles.forEach(b => b.classList.remove('selected'));
            const selectedVal = testState.answers[q];
            if (!selectedVal) return;
            const selectedBubble = row.querySelector(`.bubble[data-val="${selectedVal}"]`);
            if (selectedBubble) selectedBubble.classList.add('selected');
        });
    };

    const initVisualState = () => {
        updateProgress();
        if ((mode === 'test' && params.isResume) || mode === 'set_key') {
            applyAnswersToBubbles();
        }
    };

    initVisualState();
    let refreshScrollJumpButtonsFn = null;

    let isLiveFeedbackEnabled = false;
    const feedbackClasses = ['review-correct', 'review-wrong', 'review-key'];

    const clearLiveFeedback = () => {
        document.querySelectorAll('.bubble').forEach(b => b.classList.remove(...feedbackClasses));
    };

    const applyLiveFeedbackForQuestion = (q) => {
        if (mode !== 'test' || !isLiveFeedbackEnabled || !hasAnswerKey) return;
        const row = document.querySelector(`.bubble[data-q="${q}"]`)?.closest('.question-row');
        if (!row) return;

        const selectedVal = testState.answers[q];
        const correctVal = card.answerKey ? card.answerKey[q] : null;
        const rowBubbles = row.querySelectorAll('.bubble');
        rowBubbles.forEach(b => b.classList.remove(...feedbackClasses));

        if (!selectedVal || !correctVal) return;

        const selectedBubble = row.querySelector(`.bubble[data-val="${selectedVal}"]`);
        const correctBubble = row.querySelector(`.bubble[data-val="${correctVal}"]`);

        if (selectedVal === correctVal) {
            if (selectedBubble) selectedBubble.classList.add('review-correct');
            return;
        }

        if (selectedBubble) selectedBubble.classList.add('review-wrong');
        if (correctBubble) correctBubble.classList.add('review-key');
    };

    // Bubble Click (Ripple + Select)
    allBubbles.forEach(bubble => {
        bubble.addEventListener('click', function (e) {
            if (mode === 'test' && !testState.isStarted) return;
            if (mode === 'review') return; // Read Only

            // Ripple Effect
            const circle = document.createElement('span');
            const diameter = Math.max(this.clientWidth, this.clientHeight);
            const radius = diameter / 2;
            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${e.clientX - this.getBoundingClientRect().left - radius}px`;
            circle.style.top = `${e.clientY - this.getBoundingClientRect().top - radius}px`;
            circle.classList.add('ripple');

            const rippleBase = this.querySelector('.ripple');
            if (rippleBase) rippleBase.remove();
            this.appendChild(circle);

            // Selection Logic
            const q = this.dataset.q;
            const val = this.dataset.val;

            this.parentElement.querySelectorAll('.bubble').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            testState.answers[q] = val;

            // Auto-Save
            if (mode === 'test') {
                store.savePausedTest(cardId, {
                    answers: testState.answers,
                    flagged: testState.flagged,
                    secondsElapsed: testState.secondsElapsed
                });
            }

            // Update progress text
            updateProgress();
            if (mode === 'test') applyLiveFeedbackForQuestion(q);
            if (mode === 'test' && refreshScrollJumpButtonsFn) refreshScrollJumpButtonsFn();
        });
    });

    // Flagging System (Right click)
    document.querySelectorAll('.question-row').forEach(row => {
        row.addEventListener('contextmenu', function (e) {
            e.preventDefault(); // Prevent default right-click menu
            if (mode !== 'test' || !testState.isStarted) return;
            const q = this.querySelector('.bubble').dataset.q;
            if (testState.flagged[q]) {
                delete testState.flagged[q];
                this.classList.remove('flagged');
            } else {
                testState.flagged[q] = true;
                this.classList.add('flagged');
            }
            // Auto-Save
            if (mode === 'test') {
                store.savePausedTest(cardId, {
                    answers: testState.answers,
                    flagged: testState.flagged,
                    secondsElapsed: testState.secondsElapsed
                });
                updateProgress(); // To update minimap flagged color
                if (refreshScrollJumpButtonsFn) refreshScrollJumpButtonsFn();
            }
        });
    });

    if (mode === 'test') {
        // Mini-map Bindings
        const miniMapToggle = document.getElementById('btn-toggle-minimap');
        const miniMapDrawer = document.getElementById('minimap-drawer');
        const miniMapClose = document.getElementById('btn-close-minimap');

        if (miniMapToggle && miniMapDrawer) {
            miniMapToggle.addEventListener('click', () => {
                miniMapDrawer.classList.toggle('hidden');
            });
            miniMapClose.addEventListener('click', () => {
                miniMapDrawer.classList.add('hidden');
            });
            document.querySelectorAll('.minimap-node').forEach(node => {
                node.addEventListener('click', () => {
                    const targetQ = node.dataset.target;
                    const el = document.querySelector(`.bubble[data-q="${targetQ}"]`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        miniMapDrawer.classList.add('hidden');
                    }
                });
            });
        }

        // Vertical chain bindings
        const verticalContainer = document.getElementById('vertical-chain-container');
        const verticalTrack = document.getElementById('vertical-chain-track');
        const questionsWrap = document.getElementById('test-questions-wrap');
        const testBodyLayout = document.getElementById('test-body-layout');
        const btnToggleChain = document.getElementById('btn-toggle-chain');
        const CHAIN_PREF_KEY = 'answer-card-show-vertical-chain';

        const syncVerticalChainPositions = () => {
            if (!verticalContainer || !questionsWrap || !verticalTrack) return;
            const nodes = Array.from(document.querySelectorAll('.vertical-chain-node'));
            if (!nodes.length) return;

            const wrapTop = questionsWrap.getBoundingClientRect().top + window.scrollY;
            let firstTop = null;
            let lastTop = null;

            nodes.forEach((node) => {
                const targetQ = node.dataset.target;
                const row = document.querySelector(`.bubble[data-q="${targetQ}"]`)?.closest('.question-row');
                if (!row) return;
                const rowRect = row.getBoundingClientRect();
                const rowCenter = (rowRect.top + window.scrollY + rowRect.height / 2) - wrapTop;
                node.style.top = `${Math.round(rowCenter)}px`;
                if (firstTop === null || rowCenter < firstTop) firstTop = rowCenter;
                if (lastTop === null || rowCenter > lastTop) lastTop = rowCenter;
            });

            const contentHeight = Math.max(questionsWrap.scrollHeight, 1);
            verticalContainer.style.height = `${contentHeight}px`;

            if (firstTop !== null && lastTop !== null) {
                verticalTrack.style.top = `${Math.round(firstTop)}px`;
                verticalTrack.style.height = `${Math.max(0, Math.round(lastTop - firstTop))}px`;
            } else {
                verticalTrack.style.height = '0';
            }
        };

        const applyChainVisibility = (isVisible) => {
            if (!testBodyLayout || !btnToggleChain) return;
            testBodyLayout.classList.toggle('chain-hidden', !isVisible);
            btnToggleChain.textContent = `題號鏈: ${isVisible ? '開' : '關'}`;
            if (isVisible) {
                requestAnimationFrame(syncVerticalChainPositions);
            }
        };

        if (btnToggleChain) {
            const saved = localStorage.getItem(CHAIN_PREF_KEY);
            const initialVisible = saved === null ? true : saved === '1';
            applyChainVisibility(initialVisible);

            btnToggleChain.addEventListener('click', () => {
                const isCurrentlyVisible = !testBodyLayout.classList.contains('chain-hidden');
                const nextVisible = !isCurrentlyVisible;
                localStorage.setItem(CHAIN_PREF_KEY, nextVisible ? '1' : '0');
                applyChainVisibility(nextVisible);
            });
        }

        if (verticalContainer) {
            document.querySelectorAll('.vertical-chain-node').forEach(node => {
                node.addEventListener('click', () => {
                    const targetQ = node.dataset.target;
                    const el = document.querySelector(`.bubble[data-q="${targetQ}"]`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
            });

            // Mouse Hover Logic for active highlight
            document.querySelectorAll('.question-row').forEach(row => {
                row.addEventListener('mouseenter', () => {
                    const bubble = row.querySelector('.bubble');
                    if (bubble) {
                        const q = bubble.dataset.q;
                        document.querySelectorAll('.vertical-chain-node').forEach(n => n.classList.remove('active-node'));
                        const activeNode = document.querySelector(`.vertical-chain-node[data-target="${q}"]`);
                        if (activeNode) {
                            activeNode.classList.add('active-node');
                        }
                    }
                });
                row.addEventListener('mouseleave', () => {
                    const bubble = row.querySelector('.bubble');
                    if (bubble) {
                        const q = bubble.dataset.q;
                        const activeNode = document.querySelector(`.vertical-chain-node[data-target="${q}"]`);
                        if (activeNode) activeNode.classList.remove('active-node');
                    }
                });
            });
        }
        syncVerticalChainPositions();
        window.addEventListener('resize', syncVerticalChainPositions);

        const btnToggle = document.getElementById('btn-toggle-test');
        const btnLiveFeedback = document.getElementById('btn-live-feedback');
        const btnScrollUp = document.getElementById('btn-scroll-up');
        const btnScrollDownLatest = document.getElementById('btn-scroll-down-latest');
        const btnFinish = document.getElementById('btn-finish-test');
        const testNameDisplay = document.getElementById('test-name-display');
        const testNameInput = document.getElementById('test-instance-name');
        const timerDisplay = document.getElementById('test-timer-display');
        const hasTimeLimit = typeof card.timeLimitMinutes === 'number' && card.timeLimitMinutes > 0;
        const timeLimitSeconds = hasTimeLimit ? card.timeLimitMinutes * 60 : null;
        let hasSubmitted = false;

        const submitTest = async (isAutoSubmit = false) => {
            if (hasSubmitted) return;
            hasSubmitted = true;
            clearInterval(testState.timerInterval);

            // Clear auto-save
            store.clearPausedTest(cardId);

            const nameInp = testNameInput ? testNameInput.value.trim() : '';
            const d = new Date();
            const defaultName = '模擬測驗';

            store.addTestHistory({
                cardId: card.id,
                testName: nameInp || defaultName,
                date: d.getTime(),
                answers: testState.answers,
                durationSeconds: testState.secondsElapsed
            });
            if (isAutoSubmit) await showAppAlert('時間到，已自動交卷。');
            navigateTo('home');
        };

        const updateTimerDisplay = () => {
            if (hasTimeLimit) {
                const remain = Math.max(0, timeLimitSeconds - testState.secondsElapsed);
                const m = Math.floor(remain / 60).toString().padStart(2, '0');
                const s = (remain % 60).toString().padStart(2, '0');
                timerDisplay.textContent = `${m}:${s}`;
                if (remain === 0) submitTest(true);
                return;
            }
            const m = Math.floor(testState.secondsElapsed / 60).toString().padStart(2, '0');
            const s = (testState.secondsElapsed % 60).toString().padStart(2, '0');
            timerDisplay.textContent = `${m}:${s}`;
        };

        const refreshLiveFeedbackButton = () => {
            if (!btnLiveFeedback) return;
            btnLiveFeedback.textContent = `即時對答: ${isLiveFeedbackEnabled ? '開' : '關'}`;
            btnLiveFeedback.classList.toggle('btn-live-feedback-on', isLiveFeedbackEnabled);
        };

        if (testNameDisplay && testNameInput) {
            const defaultTestName = testNameDisplay.textContent;
            const closeNameEditor = (shouldSave = true) => {
                const nextName = shouldSave ? testNameInput.value.trim() : (testNameDisplay.textContent === defaultTestName ? '' : testNameDisplay.textContent);
                testNameInput.value = nextName;
                testNameDisplay.textContent = nextName || defaultTestName;
                testNameInput.classList.add('hidden');
                testNameDisplay.classList.remove('hidden');
            };

            testNameDisplay.addEventListener('click', () => {
                testNameInput.value = testNameDisplay.textContent === defaultTestName ? '' : testNameDisplay.textContent;
                testNameDisplay.classList.add('hidden');
                testNameInput.classList.remove('hidden');
                testNameInput.focus();
                testNameInput.select();
            });
            testNameInput.addEventListener('blur', () => closeNameEditor(true));
            testNameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    testNameInput.blur();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeNameEditor(false);
                }
            });
        }

        const getLatestAnsweredQuestion = () => {
            const answered = Object.keys(testState.answers).map(Number).filter(n => !Number.isNaN(n));
            return answered.length ? Math.max(...answered) : null;
        };

        const refreshScrollJumpButtons = () => {
            if (!btnScrollUp || !btnScrollDownLatest) return;
            btnScrollUp.classList.toggle('hidden', window.scrollY <= 260);

            let showDown = false;
            const latestQ = getLatestAnsweredQuestion();
            if (latestQ !== null && window.scrollY < 180) {
                const latestRow = document.querySelector(`.bubble[data-q="${latestQ}"]`)?.closest('.question-row');
                if (latestRow) {
                    showDown = latestRow.getBoundingClientRect().top > 280;
                }
            }
            btnScrollDownLatest.classList.toggle('hidden', !showDown);
        };
        refreshScrollJumpButtonsFn = refreshScrollJumpButtons;

        if (btnLiveFeedback) {
            refreshLiveFeedbackButton();
            btnLiveFeedback.addEventListener('click', () => {
                if (!hasAnswerKey) return;
                isLiveFeedbackEnabled = !isLiveFeedbackEnabled;
                refreshLiveFeedbackButton();
                if (!isLiveFeedbackEnabled) {
                    clearLiveFeedback();
                    return;
                }
                Object.keys(testState.answers).forEach(q => applyLiveFeedbackForQuestion(q));
            });
        };

        if (btnScrollUp) {
            btnScrollUp.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        if (btnScrollDownLatest) {
            btnScrollDownLatest.addEventListener('click', () => {
                const latestQ = getLatestAnsweredQuestion();
                if (latestQ === null) return;
                const latestBubble = document.querySelector(`.bubble[data-q="${latestQ}"]`);
                if (latestBubble) latestBubble.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }

        updateTimerDisplay();
        refreshScrollJumpButtons();
        window.addEventListener('scroll', refreshScrollJumpButtons);
        window.addEventListener('resize', refreshScrollJumpButtons);

        const startTimer = () => {
            testState.timerInterval = setInterval(() => {
                testState.secondsElapsed++;
                updateTimerDisplay();
            }, 1000);
        };

        const setPausedUI = (paused) => {
            if (paused) {
                btnToggle.textContent = '繼續考試';
                btnToggle.classList.remove('btn-control-paused');
                btnToggle.classList.add('btn-start-danger');
                container.classList.add('test-locked');
                allBubbles.forEach(b => b.classList.add('locked'));
            } else {
                btnToggle.textContent = '暫停考試';
                btnToggle.classList.remove('btn-start-danger');
                btnToggle.classList.add('btn-control-paused');
                container.classList.remove('test-locked');
                allBubbles.forEach(b => b.classList.remove('locked'));
            }
        };

        btnToggle.addEventListener('click', () => {
            if (!testState.isStarted) {
                testState.isStarted = true;
                testState.isPaused = false;
                btnFinish.classList.remove('hidden');
                setPausedUI(false);
                startTimer();
                return;
            }

            if (!testState.isPaused) {
                testState.isPaused = true;
                clearInterval(testState.timerInterval);
                setPausedUI(true);
                return;
            }

            testState.isPaused = false;
            setPausedUI(false);
            startTimer();
        });

        btnFinish.addEventListener('click', async () => {
            const ansCount = Object.keys(testState.answers).length;
            const msg = ansCount < card.totalQuestions ? `你只回答了 ${ansCount} / ${card.totalQuestions} 題，確定要交卷嗎？` : '確定要交卷完成測驗嗎？';
            const shouldSubmit = await showAppConfirm(msg, '交卷確認');
            if (!shouldSubmit) return;
            await submitTest(false);
        });
    }

    if (mode === 'set_key') {
        const modalContainer = document.getElementById('modal-container');
        const btnPaste = document.getElementById('btn-paste-answers');
        const btnClear = document.getElementById('btn-clear-answers');
        const btnSave = document.getElementById('btn-save-key');
        const validLetters = optionLetters.slice(0, card.optionsCount).map(letter => letter.toUpperCase());

        const closeModal = () => {
            modalContainer.classList.add('hidden');
            modalContainer.innerHTML = '';
        };

        const openPasteModal = () => {
            modalContainer.innerHTML = `
                <div class="modal-dialog" role="dialog" aria-modal="true" aria-label="貼上答案">
                    <div class="modal-header">
                        <h3>貼上答案 (CSV)</h3>
                        <button class="md-btn md-btn-text modal-close-btn" id="btn-close-paste-modal">關閉</button>
                    </div>
                    <p style="color:var(--text-secondary); margin-bottom:8px;">格式範例：<code>1, D</code>（每行一題）</p>
                    <textarea id="paste-answer-textarea" class="md-input modal-textarea" placeholder="1, D&#10;2, a&#10;3, C"></textarea>
                    <div class="modal-actions">
                        <button class="md-btn md-btn-outlined" id="btn-cancel-paste-modal">取消</button>
                        <button class="md-btn md-btn-contained" id="btn-confirm-paste-modal">確定</button>
                    </div>
                </div>
            `;
            modalContainer.classList.remove('hidden');

            const textarea = document.getElementById('paste-answer-textarea');
            textarea.focus();

            document.getElementById('btn-close-paste-modal').addEventListener('click', closeModal);
            document.getElementById('btn-cancel-paste-modal').addEventListener('click', closeModal);
            modalContainer.addEventListener('click', (e) => {
                if (e.target === modalContainer) closeModal();
            }, { once: true });

            document.getElementById('btn-confirm-paste-modal').addEventListener('click', async () => {
                const raw = textarea.value || '';
                const lines = raw.split(/\r?\n/);
                let appliedCount = 0;
                let invalidCount = 0;

                lines.forEach(line => {
                    const trimmed = line.trim();
                    if (!trimmed) return;

                    const parts = trimmed.split(',');
                    if (parts.length < 2) {
                        invalidCount++;
                        return;
                    }

                    const qNum = parseInt(parts[0].trim(), 10);
                    const ansLetter = parts[1].trim().toUpperCase();
                    if (!Number.isInteger(qNum) || qNum < 1 || qNum > card.totalQuestions) {
                        invalidCount++;
                        return;
                    }
                    if (!validLetters.includes(ansLetter)) {
                        invalidCount++;
                        return;
                    }

                    testState.answers[qNum.toString()] = ansLetter;
                    appliedCount++;
                });

                applyAnswersToBubbles();
                closeModal();
                if (invalidCount > 0) {
                    await showAppAlert(`已匯入 ${appliedCount} 筆答案，略過 ${invalidCount} 筆格式或內容不正確的資料。`);
                } else {
                    await showAppAlert(`已匯入 ${appliedCount} 筆答案。`);
                }
            });
        };

        btnPaste.addEventListener('click', openPasteModal);
        btnClear.addEventListener('click', async () => {
            const shouldClear = await showAppConfirm('確定要清空目前所有已設定的答案嗎？', '清空答案', 'danger');
            if (!shouldClear) return;
            testState.answers = {};
            applyAnswersToBubbles();
        });

        btnSave.addEventListener('click', async () => {
            const timeLimitInput = document.getElementById('inp-time-limit-minutes');
            const rawValue = timeLimitInput ? timeLimitInput.value.trim() : '';
            let timeLimitMinutes = null;
            if (rawValue !== '') {
                const parsed = parseInt(rawValue, 10);
                if (!Number.isInteger(parsed) || parsed < 1) {
                    await showAppAlert('考試時間請輸入正整數分鐘，或留空。');
                    if (timeLimitInput) timeLimitInput.focus();
                    return;
                }
                timeLimitMinutes = parsed;
            }
            store.updateAnswerKey(card.id, testState.answers, timeLimitMinutes);
            await showAppAlert('答案設定成功！過往的測驗歷史已重新計算分數。');
            navigateTo('home');
        });
    }

    if (mode === 'review') {
        const reviewSelect = document.getElementById('review-history-select');
        if (reviewSelect) {
            reviewSelect.addEventListener('change', (e) => {
                const targetHistoryId = e.target.value;
                if (!targetHistoryId || targetHistoryId === historyRecord.id) return;
                navigateTo('test', { cardId: card.id, mode: 'review', historyId: targetHistoryId });
            });
        }
    }
}

// Initialize
window.navigateTo = navigateTo; // Expose to global for inline onclick
navigateTo('home');




