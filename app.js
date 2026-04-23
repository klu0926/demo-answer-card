// global store

const APP_NAME = '答案卡';
const LOCAL_TITLE_SUFFIX = ' (LOCAL)';

const appContainer = document.getElementById('app-container');
const navTitle = document.getElementById('nav-title');
const navActions = document.getElementById('navbar-actions');

const isLocalEnvironment = () => {
    const host = window.location.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local');
};

document.title = APP_NAME + (isLocalEnvironment() ? LOCAL_TITLE_SUFFIX : '');

// Simple Router
function navigateTo(page, params = {}) {
    appContainer.innerHTML = '';
    navActions.innerHTML = ''; // Reset navbar actions
    
    switch(page) {
        case 'home':
            renderHome();
            break;
        case 'create':
            renderCreate();
            break;
        case 'preview':
            renderPreview();
            break;
        case 'test':
            renderTest(params);
            break;
        default:
            renderHome();
    }
}

// ========== 1. Landing Page (Home) ==========
function renderHome() {
    navTitle.textContent = APP_NAME;
    
    const html = `
        <div class="landing-grid">
            <div class="md-card landing-card" id="btn-goto-create">
                <span class="material-symbols-outlined">add_circle</span>
                <h2>製作答案卡</h2>
                <p>自訂題數、選項數量與各個大題 (Part) 範圍，快速打造你的專屬答題卡。</p>
            </div>
            
            <div class="md-card landing-card" id="btn-goto-preview">
                <span class="material-symbols-outlined">style</span>
                <h2>預覽 / 管理答案卡</h2>
                <p>檢視已建立的答案卡、設定標準答案、開始模擬考與查看歷史成績。</p>
            </div>
        </div>
    `;
    appContainer.innerHTML = html;
    
    document.getElementById('btn-goto-create').addEventListener('click', () => navigateTo('create'));
    document.getElementById('btn-goto-preview').addEventListener('click', () => navigateTo('preview'));
}

// ========== 2. Create Page (Wizard) ==========
let createWizardState = {
    step: 1,
    optionsCount: 4,
    partsCount: 1,
    parts: [{ id: 1, count: 10, start: 1, end: 10 }],
    name: ''
};

function renderCreate() {
    navTitle.textContent = '製作答案卡';
    navActions.innerHTML = `
        <button class="md-btn md-btn-text" id="nav-btn-reset"><span class="material-symbols-outlined">refresh</span>重新設定</button>
        <button class="md-btn md-btn-text" id="nav-btn-home"><span class="material-symbols-outlined">home</span>首頁</button>
    `;
    document.getElementById('nav-btn-home').addEventListener('click', () => navigateTo('home'));
    document.getElementById('nav-btn-reset').addEventListener('click', () => {
        createWizardState = { step: 1, optionsCount: 4, partsCount: 1, parts: [{ id: 1, count: 10, start: 1, end: 10 }], name: '' };
        renderCreate();
    });

    const is1 = createWizardState.step === 1;
    const is2 = createWizardState.step === 2;
    const is3 = createWizardState.step === 3;

    appContainer.innerHTML = `
        <div class="md-card">
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
        if(targetStep <= createWizardState.step) {
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
            <h2>Step 2: 題數與 Part 設定</h2>
            <br/>
            <div class="form-group">
                <label>總共幾個 Part：</label>
                <input type="number" class="md-input" id="inp-parts-count" min="1" value="${createWizardState.partsCount}">
            </div>
            <div id="parts-container" class="parts-grid"></div>
            <div style="margin-top:24px; font-size:1.2rem; font-weight:bold;">
                總題數: <span id="lbl-total-q">0</span> 題
            </div>
        `;
        
        const countInp = document.getElementById('inp-parts-count');
        const partsContainer = document.getElementById('parts-container');
        const totalLbl = document.getElementById('lbl-total-q');

        const updatePartsUI = () => {
            let currentStart = 1;
            let partsHtml = '';
            let total = 0;
            
            // Adjust parts array length
            const diff = createWizardState.partsCount - createWizardState.parts.length;
            if (diff > 0) {
                for(let i=0; i<diff; i++) createWizardState.parts.push({ id: createWizardState.parts.length + 1, count: 10, start: 0, end: 0 });
            } else if (diff < 0) {
                createWizardState.parts.length = createWizardState.partsCount;
            }

            createWizardState.parts.forEach((p, idx) => {
                p.start = currentStart;
                p.end = p.start + p.count - 1;
                total += p.count;
                partsHtml += `
                    <div class="part-card">
                        <strong>Part ${p.id}</strong>
                        <div class="form-group" style="margin-bottom:4px;">
                            <input type="number" class="md-input part-count-inp" data-idx="${idx}" min="1" value="${p.count}" style="text-align:center;">
                        </div>
                        <small>題號：${p.start} - ${p.end}</small>
                    </div>
                `;
                currentStart = p.end + 1;
            });
            
            partsContainer.innerHTML = partsHtml;
            totalLbl.textContent = total;

            document.querySelectorAll('.part-count-inp').forEach(inp => {
                inp.addEventListener('change', (e) => {
                    const idx = parseInt(e.target.dataset.idx);
                    let val = parseInt(e.target.value) || 1;
                    if(val < 1) val = 1;
                    createWizardState.parts[idx].count = val;
                    updatePartsUI(); // recalculate ranges instantly
                });
            });
        };

        countInp.addEventListener('change', (e) => {
            let val = parseInt(e.target.value) || 1;
            if (val < 1) val = 1;
            createWizardState.partsCount = val;
            updatePartsUI();
        });

        updatePartsUI();

    } else if (createWizardState.step === 3) {
        const totalQ = createWizardState.parts.reduce((sum, p) => sum + p.count, 0);
        body.innerHTML = `
            <h2>Step 3: 確認與儲存</h2>
            <br/>
            <div class="md-card" style="background:#f5f5f5; margin-bottom:16px;">
                <p><strong>選項數量：</strong> ${createWizardState.optionsCount}</p>
                <p><strong>總大題數：</strong> ${createWizardState.partsCount}</p>
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
    const totalQuestions = createWizardState.parts.reduce((sum, p) => sum + p.count, 0);
    const name = createWizardState.name.trim() || '未命名答案卡';
    
    store.addCard({
        name,
        optionsCount: createWizardState.optionsCount,
        parts: JSON.parse(JSON.stringify(createWizardState.parts)),
        totalQuestions
    });

    // Reset state and go to preview
    createWizardState = { step: 1, optionsCount: 4, partsCount: 1, parts: [{ id: 1, count: 10, start: 1, end: 10 }], name: '' };
    navigateTo('preview');
}

// ========== 3. Preview/Library Page ==========
function renderPreview() {
    navTitle.textContent = '我的答案卡';
    navActions.innerHTML = `<button class="md-btn md-btn-text" id="nav-btn-home"><span class="material-symbols-outlined">home</span>首頁</button>`;
    document.getElementById('nav-btn-home').addEventListener('click', () => navigateTo('home'));

    const cards = store.getCards();

    if (cards.length === 0) {
        appContainer.innerHTML = `
            <div class="md-card" style="text-align:center; padding:48px 16px;">
                <span class="material-symbols-outlined" style="font-size:48px; color:var(--text-disabled); margin-bottom:16px;">inbox</span>
                <h2>還沒有任何答案卡</h2>
                <p style="color:var(--text-secondary); margin-bottom:24px;">你還沒有建立過任何答案卡，現在就開始製作一個吧！</p>
                <button class="md-btn md-btn-contained" onclick="navigateTo('create')">開始製作</button>
            </div>
        `;
        return;
    }

    const escapeHtml = (str) => String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    let html = `<div class="preview-grid">`;
    cards.forEach(c => {
        const hasKey = c.answerKey !== null;
        const history = store.getHistoryByCardId(c.id);
        const escapedCardName = escapeHtml(c.name);

        html += `
            <div class="md-card preview-item">
                <div class="preview-item-header">
                    <div class="card-name-row">
                        <h3 class="card-name-label" data-id="${c.id}" title="雙擊可修改名稱">${escapedCardName}</h3>
                        <input type="text" class="md-input card-name-input hidden" data-id="${c.id}" data-original="${escapedCardName}" value="${escapedCardName}" aria-label="答案卡名稱">
                    </div>
                    <div style="color:var(--text-secondary); font-size:0.875rem;">
                        <span>共 ${c.totalQuestions} 題</span> • <span>${c.parts.length} 個 Part</span>
                    </div>
                </div>
                <div style="margin-bottom:16px;">
                    <div class="preview-status ${hasKey ? 'status-haskey' : 'status-nokey'}">
                        <span class="material-symbols-outlined" style="font-size:18px;">${hasKey ? 'task_alt' : 'error'}</span>
                        ${hasKey ? '已設定標準答案' : '尚未設定標準答案'}
                    </div>
                </div>
                <div class="preview-actions">
                    <button class="md-btn md-btn-contained btn-start-test-action" data-id="${c.id}">開始測驗</button>
                    <button class="md-btn md-btn-outlined btn-set-key-action" data-id="${c.id}">設定解答</button>
                    ${history.length > 0 ? `<button class="md-btn md-btn-outlined btn-view-history-action" data-id="${c.id}">歷史 (${history.length})</button>` : `<button class="md-btn md-btn-outlined" disabled>歷史 (0)</button>`}
                    <button class="md-btn md-btn-text md-btn-error btn-delete-card-action" data-id="${c.id}">刪除</button>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    appContainer.innerHTML = html;

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

        const closeEditor = () => {
            input.classList.add('hidden');
            label.classList.remove('hidden');
        };

        const saveName = () => {
            const newName = input.value.trim();
            const originalName = input.dataset.original || '';
            if (!newName) {
                input.value = originalName;
                closeEditor();
                return;
            }
            if (newName !== originalName) {
                store.renameCard(cardId, newName);
                input.dataset.original = newName;
            }
            label.textContent = newName;
            input.value = newName;
            closeEditor();
        };

        input.addEventListener('blur', saveName);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                input.value = input.dataset.original || label.textContent;
                closeEditor();
            }
        });
    });

    document.querySelectorAll('.btn-start-test-action').forEach(btn => {
        btn.addEventListener('click', () => navigateTo('test', {cardId: btn.dataset.id, mode: 'test'}));
    });
    document.querySelectorAll('.btn-set-key-action').forEach(btn => {
        btn.addEventListener('click', () => navigateTo('test', {cardId: btn.dataset.id, mode: 'set_key'}));
    });
    document.querySelectorAll('.btn-view-history-action').forEach(btn => {
        btn.addEventListener('click', () => window.viewHistory(btn.dataset.id));
    });
    document.querySelectorAll('.btn-delete-card-action').forEach(btn => {
        btn.addEventListener('click', () => window.deleteCard(btn.dataset.id));
    });

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
            return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
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
                    navigateTo('test', {cardId: cardId, mode: 'review', historyId: targetHistoryId});
                });
            });

            modalContainer.querySelectorAll('.history-item-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetHistoryId = btn.dataset.historyId;
                    const testName = btn.dataset.testName || '這筆測驗';
                    if (!confirm(`確定要刪除「${testName}」嗎？此動作無法復原。`)) return;
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
                renderPreview();
                return;
            }

            let listHtml = '';
            sortedHist.forEach((record) => {
                const scoreText = record.score !== null ? `${record.score} / ${card.totalQuestions}` : '未設定標準答案';
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
                                <span class="material-symbols-outlined">${sortDirection === 'asc' ? 'arrow_downward' : 'arrow_upward'}</span>
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

    window.deleteCard = (id) => {
        if(confirm('確定要刪除這張答案卡與所有的測驗歷史紀錄嗎？這個動作無法復原。')) {
            store.deleteCard(id);
            renderPreview();
        }
    };
}

// ========== 4. Test Page (Multi-Mode) ==========
let testState = {
    timerInterval: null,
    secondsElapsed: 0,
    answers: {},
    isStarted: false,
    isPaused: false
};

const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

function renderTest(params) {
    const cardId = params.cardId || params;
    const mode = params.mode || 'test'; // 'test', 'set_key', 'review'
    const historyId = params.historyId;
    
    const card = store.getCardById(cardId);
    if (!card) return navigateTo('preview');
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
        if(!historyRecord) return navigateTo('preview');
    }

    const hasAnswerKey = !!(card.answerKey && Object.keys(card.answerKey).length > 0);

    // Reset state
    testState = { timerInterval: null, secondsElapsed: 0, answers: {}, isStarted: false, isPaused: false };
    if(mode === 'set_key' && card.answerKey) testState.answers = {...card.answerKey};

    // Nav setup
    navTitle.textContent = mode === 'test' ? '模擬考試: ' + card.name : 
                           mode === 'set_key' ? '設定標準答案: ' + card.name : 
                           '測驗歷史檢討: ' + card.name;
    navActions.innerHTML = `<button class="md-btn md-btn-text" id="nav-btn-abandon"><span class="material-symbols-outlined">${mode==='test'?'close':'arrow_back'}</span>${mode==='test'?'放棄測驗':'返回'}</button>`;
    
    document.getElementById('nav-btn-abandon').addEventListener('click', () => {
        if(mode === 'test' && !confirm('確定要放棄考試嗎？進度將不會儲存。')) return;
        if(testState.timerInterval) clearInterval(testState.timerInterval);
        navigateTo('preview');
    });

    // Content Generation
    let partsHtml = '';
    card.parts.forEach(part => {
        partsHtml += `
            <div class="part-section">
                <div class="part-header">Part ${part.id} (Q${part.start} - Q${part.end})</div>
                <div class="questions-grid">
        `;
        
        for(let q = part.start; q <= part.end; q++) {
            let bubblesHtml = '';
            const isReview = mode === 'review';
            const userAns = isReview ? historyRecord.answers[q] : null;
            const correctAns = isReview ? (card.answerKey ? card.answerKey[q] : null) : null;
            
            for(let opt = 0; opt < card.optionsCount; opt++) {
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
                <div class="question-row">
                    <div class="q-num">${q}.</div>
                    <div class="bubble-group">${bubblesHtml}</div>
                </div>
            `;
        }
        partsHtml += `</div></div>`;
    });

    // Header HTML based on mode
    let headerHtml = '';
    if (mode === 'test') {
        headerHtml = `
            <div class="test-entry-header">
                <div class="test-entry-name">
                    <input type="text" id="test-instance-name" class="md-input" style="margin:0;" placeholder="模擬考試">
                </div>
            </div>
            <div class="test-status-sticky">
                <div id="test-timer-display" class="test-timer test-timer-box">00:00</div>
                <div id="test-progress-text" class="test-progress">完成度: 0 / ${card.totalQuestions}</div>
                <button class="md-btn md-btn-outlined" id="btn-live-feedback" ${hasAnswerKey ? '' : 'disabled'}>即時對答: 關</button>
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
                        <span id="test-progress-text" class="test-progress set-key-progress">${Object.keys(testState.answers).length} / ${card.totalQuestions}</span>
                    </button>
                </div>
            </div>
        `;
    } else if (mode === 'review') {
        const reviewOptionsHtml = reviewHistoryOptions.map((h, idx) => {
            const d = new Date(h.date);
            const dateLabel = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            return `<option value="${h.id}" ${h.id === historyRecord.id ? 'selected' : ''}>${idx + 1}. ${h.testName} (${dateLabel})</option>`;
        }).join('');

        headerHtml = `
            <div class="review-header">
                <div style="text-align:center;">
                    <div style="margin-bottom:12px;">
                        <select id="review-history-select" class="md-input" style="min-width:280px; max-width:100%;">
                            ${reviewOptionsHtml}
                        </select>
                    </div>
                    <h2 style="margin-bottom:8px;">測驗名稱: ${historyRecord.testName}</h2>
                    <p style="font-size:1.5rem; color:var(--md-primary); font-weight:bold;">
                        成績: ${historyRecord.score !== null ? historyRecord.score + ' / ' + card.totalQuestions : '未設定標準答案無法算分'}
                    </p>
                    <p style="color:var(--text-secondary); margin-top:8px;">
                        花費時間: ${formatDuration(historyRecord.durationSeconds)}
                    </p>
                </div>
            </div>
        `;
    }

    appContainer.innerHTML = headerHtml + `
        <div class="md-card test-container ${mode==='test'?'test-locked':''}" id="test-card-container">
            ${partsHtml}
        </div>
        ${mode === 'test' ? `
            <div class="test-bottom-actions">
                <button class="md-btn md-btn-contained hidden" id="btn-finish-test">
                    <span class="material-symbols-outlined">done_all</span> 交卷
                </button>
            </div>
        ` : ''}
    `;

    // Interactivity logic
    const container = document.getElementById('test-card-container');
    const allBubbles = document.querySelectorAll('.bubble');
    const updateProgress = () => {
        const prog = document.getElementById('test-progress-text');
        if (!prog) return;
        if(mode==='test') prog.textContent = `完成度: ${Object.keys(testState.answers).length} / ${card.totalQuestions}`;
        if(mode==='set_key') prog.textContent = `${Object.keys(testState.answers).length} / ${card.totalQuestions}`;
    };
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
        updateProgress();
    };
    
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
        bubble.addEventListener('click', function(e) {
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
            if(rippleBase) rippleBase.remove();
            this.appendChild(circle);
            
            // Selection Logic
            const q = this.dataset.q;
            const val = this.dataset.val;
            
            this.parentElement.querySelectorAll('.bubble').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            testState.answers[q] = val;
            
            // Update progress text
            updateProgress();
            if (mode === 'test') applyLiveFeedbackForQuestion(q);
        });
    });

    if (mode === 'test') {
        const btnToggle = document.getElementById('btn-toggle-test');
        const btnLiveFeedback = document.getElementById('btn-live-feedback');
        const btnFinish = document.getElementById('btn-finish-test');
        const timerDisplay = document.getElementById('test-timer-display');
        const hasTimeLimit = typeof card.timeLimitMinutes === 'number' && card.timeLimitMinutes > 0;
        const timeLimitSeconds = hasTimeLimit ? card.timeLimitMinutes * 60 : null;
        let hasSubmitted = false;

        const submitTest = (isAutoSubmit = false) => {
            if (hasSubmitted) return;
            hasSubmitted = true;
            clearInterval(testState.timerInterval);
            const nameInp = document.getElementById('test-instance-name').value.trim();
            const d = new Date();
            const defaultName = '模擬測驗';

            store.addTestHistory({
                cardId: card.id,
                testName: nameInp || defaultName,
                date: d.getTime(),
                answers: testState.answers,
                durationSeconds: testState.secondsElapsed
            });
            if (isAutoSubmit) alert('時間到，已自動交卷。');
            navigateTo('preview');
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

        updateTimerDisplay();

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

        btnFinish.addEventListener('click', () => {
            const ansCount = Object.keys(testState.answers).length;
            const msg = ansCount < card.totalQuestions ? `你只回答了 ${ansCount} / ${card.totalQuestions} 題，確定要交卷嗎？` : '確定要交卷完成測驗嗎？';
            if(confirm(msg)) {
                submitTest(false);
            }
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

            document.getElementById('btn-confirm-paste-modal').addEventListener('click', () => {
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
                    alert(`已匯入 ${appliedCount} 筆答案，略過 ${invalidCount} 筆格式或內容不正確的資料。`);
                } else {
                    alert(`已匯入 ${appliedCount} 筆答案。`);
                }
            });
        };

        btnPaste.addEventListener('click', openPasteModal);
        btnClear.addEventListener('click', () => {
            if (!confirm('確定要清空目前所有已設定的答案嗎？')) return;
            testState.answers = {};
            applyAnswersToBubbles();
        });

        btnSave.addEventListener('click', () => {
             const timeLimitInput = document.getElementById('inp-time-limit-minutes');
             const rawValue = timeLimitInput ? timeLimitInput.value.trim() : '';
             let timeLimitMinutes = null;
             if (rawValue !== '') {
                const parsed = parseInt(rawValue, 10);
                if (!Number.isInteger(parsed) || parsed < 1) {
                    alert('考試時間請輸入正整數分鐘，或留空。');
                    if (timeLimitInput) timeLimitInput.focus();
                    return;
                }
                timeLimitMinutes = parsed;
             }
             store.updateAnswerKey(card.id, testState.answers, timeLimitMinutes);
             alert('標準答案設定成功！過往的測驗歷史已重新計算分數。');
             navigateTo('preview');
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



