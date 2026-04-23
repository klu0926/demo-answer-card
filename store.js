const STORE_KEY = 'demo_answer_card_data';

class Store {
    constructor() {
        this.data = this.loadData();
    }

    loadData() {
        const defaultData = {
            answerCards: [], // { id, name, optionsCount, parts: [{partId, start, end, count}], totalQuestions, answerKey: null }
            history: [] // { id, cardId, testName, date, answers: {questionId: selectedOption}, score: null }
        };
        try {
            const stored = localStorage.getItem(STORE_KEY);
            return stored ? JSON.parse(stored) : defaultData;
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
        const newCard = { id, ...cardConfig, answerKey: null, timeLimitMinutes: null };
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
        if (!card || !card.answerKey) return null; // Can't grade without key
        
        let correctCount = 0;
        for (let q = 1; q <= card.totalQuestions; q++) {
            const qStr = q.toString();
            if (answers[qStr] && card.answerKey[qStr] && answers[qStr] === card.answerKey[qStr]) {
                correctCount++;
            }
        }
        return correctCount;
    }

    recalculateHistoryForCard(cardId) {
        const historyList = this.getHistoryByCardId(cardId);
        historyList.forEach(hist => {
            hist.score = this.calculateScore(cardId, hist.answers);
        });
    }
}

window.store = new Store();
