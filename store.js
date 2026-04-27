const STORE_KEY = 'demo_answer_card_data';

class Store {
    constructor() {
        this.data = this.loadData();
    }

    loadData() {
        const defaultData = {
            answerCards: [], 
            history: [],
            pausedTests: {} 
        };
        try {
            const stored = localStorage.getItem(STORE_KEY);
            const parsed = stored ? JSON.parse(stored) : defaultData;
            // Migration for older data
            if (parsed.answerCards) {
                parsed.answerCards.forEach(c => {
                    if (c.parts && !c.sections) {
                        c.sections = [{ id: 1, name: "預設區塊", parts: c.parts }];
                        delete c.parts;
                    }
                    if (!c.tagIds) c.tagIds = [];
                    if (!c.createdAt) c.createdAt = parseInt(c.id) || Date.now();
                });
            }
            if (!parsed.pausedTests) parsed.pausedTests = {};
            if (!parsed.tags) parsed.tags = [];
            return parsed;
        } catch (e) {
            console.error("Local storage error:", e);
            return defaultData;
        }
    }

    saveData() {
        localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
    }

    // ========== Answer Cards ==========
    getCards() {
        return this.data.answerCards;
    }

    addCard(cardConfig) {
        const id = Date.now().toString();
        const newCard = { id, ...cardConfig, answerKey: null, timeLimitMinutes: null, tagIds: [], createdAt: Date.now() };
        this.data.answerCards.push(newCard);
        this.saveData();
        return id;
    }

    getCardById(id) {
        return this.data.answerCards.find(c => c.id === id);
    }

    deleteCard(id) {
        this.data.answerCards = this.data.answerCards.filter(c => c.id !== id);
        this.data.history = this.data.history.filter(h => h.cardId !== id);
        this.saveData();
    }

    renameCard(id, newName) {
        const card = this.getCardById(id);
        if (card) {
            card.name = newName;
            this.saveData();
        }
    }

    updateAnswerKey(cardId, answerKeyMap, timeLimitMinutes = undefined) {
        const card = this.getCardById(cardId);
        if (card) {
            card.answerKey = answerKeyMap;
            if (timeLimitMinutes !== undefined) {
                card.timeLimitMinutes = timeLimitMinutes;
            }
            this.recalculateHistoryForCard(cardId);
            this.saveData();
        }
    }

    setCardTags(cardId, tagIds) {
        const card = this.getCardById(cardId);
        if (card) {
            card.tagIds = tagIds;
            this.saveData();
        }
    }

    // ========== Tags ==========
    getTags() {
        return this.data.tags;
    }

    addTag(name, color = null) {
        const id = Date.now().toString();
        const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316'];
        const randomColor = color || colors[Math.floor(Math.random() * colors.length)];
        this.data.tags.push({ id, name, color: randomColor });
        this.saveData();
        return id;
    }

    updateTagColor(id, color) {
        const tag = this.data.tags.find(t => t.id === id);
        if (tag) {
            tag.color = color;
            this.saveData();
        }
    }


    renameTag(id, newName) {
        const tag = this.data.tags.find(t => t.id === id);
        if (tag) {
            tag.name = newName;
            this.saveData();
        }
    }

    deleteTag(id) {
        this.data.tags = this.data.tags.filter(t => t.id !== id);
        this.data.answerCards.forEach(c => {
            if (c.tagIds) {
                c.tagIds = c.tagIds.filter(tid => tid !== id);
            }
        });
        this.saveData();
    }

    // ========== History & Grading ==========
    getHistoryByCardId(cardId) {
        return this.data.history.filter(h => h.cardId === cardId);
    }

    addTestHistory(historyRecord) {
        const id = Date.now().toString();
        
        // Calculate initial score if answer key exists
        let score = this.calculateScore(historyRecord.cardId, historyRecord.answers);
        
        const newHistory = { id, ...historyRecord, score };
        this.data.history.push(newHistory);
        this.saveData();
        return id;
    }

    deleteHistoryById(historyId) {
        this.data.history = this.data.history.filter(h => h.id !== historyId);
        this.saveData();
    }

    calculateScore(cardId, answers) {
        const card = this.getCardById(cardId);
        if (!card || !card.answerKey) return null;
        
        let correctCount = 0;
        let sectionsScore = {};
        let partsScore = {};

        card.sections.forEach(sec => {
            sectionsScore[sec.id] = { name: sec.name, correct: 0, total: 0 };
            sec.parts.forEach(p => {
                partsScore[p.id] = { correct: 0, total: p.count };
                sectionsScore[sec.id].total += p.count;
                for (let q = p.start; q <= p.end; q++) {
                    const qStr = q.toString();
                    if (answers[qStr] && card.answerKey[qStr] && answers[qStr] === card.answerKey[qStr]) {
                        correctCount++;
                        sectionsScore[sec.id].correct++;
                        partsScore[p.id].correct++;
                    }
                }
            });
        });

        return {
            totalCorrect: correctCount,
            totalQuestions: card.totalQuestions,
            sectionsScore,
            partsScore
        };
    }

    recalculateHistoryForCard(cardId) {
        const historyList = this.getHistoryByCardId(cardId);
        historyList.forEach(hist => {
            hist.score = this.calculateScore(cardId, hist.answers);
        });
    }

    // ========== Auto-Save & Resume ==========
    savePausedTest(cardId, testStateData) {
        this.data.pausedTests[cardId] = testStateData;
        this.saveData();
    }

    getPausedTest(cardId) {
        return this.data.pausedTests[cardId] || null;
    }

    clearPausedTest(cardId) {
        if (this.data.pausedTests[cardId]) {
            delete this.data.pausedTests[cardId];
            this.saveData();
        }
    }
}

window.store = new Store();
