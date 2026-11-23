// SAT Practice Test 5 - Interactive Application Logic

// State management
const state = {
    currentQuestionIndex: 0,
    answers: {}, // { questionId: selectedOptionIndex }
    flagged: {}, // { questionId: boolean }
    startTime: null,
    moduleStartTimes: {},
    currentModule: 'rw1',
    moduleTimes: {
        rw1: 32 * 60,
        rw2: 32 * 60,
        math1: 35 * 60,
        math2: 35 * 60
    },
    timeRemaining: {},
    timerInterval: null,
    testCompleted: false,
    testStartTime: null
};

// DOM Elements
const screens = {
    welcome: document.getElementById('welcome-screen'),
    test: document.getElementById('test-screen'),
    results: document.getElementById('results-screen')
};

const elements = {
    startBtn: document.getElementById('start-test'),
    exitBtn: document.getElementById('exit-test'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    finishBtn: document.getElementById('finish-btn'),
    markReviewBtn: document.getElementById('mark-review'),
    clearAnswerBtn: document.getElementById('clear-answer'),
    questionContainer: document.getElementById('question-container'),
    questionNav: document.getElementById('question-nav'),
    timerDisplay: document.getElementById('timer-display'),
    timerEl: document.getElementById('timer'),
    moduleIndicator: document.getElementById('module-indicator'),
    questionCounter: document.getElementById('question-counter'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    modalOverlay: document.getElementById('modal-overlay'),
    exitModal: document.getElementById('exit-modal'),
    finishModal: document.getElementById('finish-modal'),
    exitCancel: document.getElementById('exit-cancel'),
    exitConfirm: document.getElementById('exit-confirm'),
    finishCancel: document.getElementById('finish-cancel'),
    finishConfirm: document.getElementById('finish-confirm'),
    unansweredWarning: document.getElementById('unanswered-warning'),
    retakeBtn: document.getElementById('retake-test'),
    downloadBtn: document.getElementById('download-report'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabPanels: document.querySelectorAll('.tab-panel')
};

// Initialize the app
function init() {
    bindEvents();
    renderQuestionNav();
    showScreen('welcome');
}

function bindEvents() {
    // Welcome screen
    elements.startBtn.addEventListener('click', startTest);
    
    // Test navigation
    elements.prevBtn.addEventListener('click', goToPreviousQuestion);
    elements.nextBtn.addEventListener('click', goToNextQuestion);
    elements.finishBtn.addEventListener('click', showFinishModal);
    elements.markReviewBtn.addEventListener('click', toggleFlag);
    elements.clearAnswerBtn.addEventListener('click', clearCurrentAnswer);
    elements.exitBtn.addEventListener('click', showExitModal);
    
    // Modals
    elements.exitCancel.addEventListener('click', hideExitModal);
    elements.exitConfirm.addEventListener('click', exitTest);
    elements.finishCancel.addEventListener('click', hideFinishModal);
    elements.finishConfirm.addEventListener('click', finishTest);
    elements.modalOverlay.addEventListener('click', hideAllModals);
    
    // Results
    elements.retakeBtn.addEventListener('click', retakeTest);
    elements.downloadBtn.addEventListener('click', downloadReport);
    
    // Tabs
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeydown);
}

function handleKeydown(e) {
    if (!screens.test.classList.contains('active')) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            if (!elements.prevBtn.disabled) goToPreviousQuestion();
            break;
        case 'ArrowRight':
            if (state.currentQuestionIndex === TEST_QUESTIONS.length - 1) {
                showFinishModal();
            } else {
                goToNextQuestion();
            }
            break;
        case 'Escape':
            hideAllModals();
            break;
        case '1':
        case '2':
        case '3':
        case '4':
            selectOption(parseInt(e.key) - 1);
            break;
    }
}

function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function startTest() {
    state.testStartTime = new Date();
    state.startTime = Date.now();
    state.currentModule = 'rw1';
    state.moduleStartTimes.rw1 = Date.now();
    state.timeRemaining = { ...state.moduleTimes };
    
    // Initialize module start times
    Object.keys(state.moduleTimes).forEach(module => {
        state.moduleStartTimes[module] = null;
    });
    state.moduleStartTimes.rw1 = Date.now();
    
    showScreen('test');
    renderQuestionNav();
    renderQuestion();
    startTimer();
    updateProgress();
    updateNavigationButtons();
}

function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    
    state.timerInterval = setInterval(() => {
        const module = state.currentModule;
        state.timeRemaining[module]--;
        
        updateTimerDisplay();
        
        // Check for module transition
        if (state.timeRemaining[module] <= 0) {
            handleModuleTimeUp();
        }
        
        // Warning states
        const timerEl = elements.timerEl;
        timerEl.classList.remove('warning', 'danger');
        if (state.timeRemaining[module] <= 60) {
            timerEl.classList.add('danger');
        } else if (state.timeRemaining[module] <= 300) {
            timerEl.classList.add('warning');
        }
    }, 1000);
}

function updateTimerDisplay() {
    const module = state.currentModule;
    const seconds = state.timeRemaining[module];
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    elements.timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

function handleModuleTimeUp() {
    // Auto-advance to next module
    const modules = ['rw1', 'rw2', 'math1', 'math2'];
    const currentIndex = modules.indexOf(state.currentModule);
    
    if (currentIndex < modules.length - 1) {
        const nextModule = modules[currentIndex + 1];
        switchModule(nextModule);
    } else {
        // Test complete - time's up
        finishTest();
    }
}

function switchModule(newModule) {
    const modules = ['rw1', 'rw2', 'math1', 'math2'];
    const newIndex = modules.indexOf(newModule);
    const oldIndex = modules.indexOf(state.currentModule);
    
    // Update state
    state.currentModule = newModule;
    state.moduleStartTimes[newModule] = Date.now();
    
    // Move to first question of new module
    const moduleInfo = MODULE_STRUCTURE[newModule];
    state.currentQuestionIndex = moduleInfo.start - 1;
    
    // Update UI
    elements.moduleIndicator.textContent = moduleInfo.name;
    renderQuestion();
    renderQuestionNav();
    updateNavigationButtons();
    updateProgress();
    updateTimerDisplay();
    
    // Scroll to top
    elements.questionContainer.scrollTop = 0;
}

function getCurrentModule() {
    const q = TEST_QUESTIONS[state.currentQuestionIndex];
    if (q.section === 'R&W') {
        return q.moduleNum === 1 ? 'rw1' : 'rw2';
    } else {
        return q.moduleNum === 1 ? 'math1' : 'math2';
    }
}

function checkModuleTransition() {
    const newModule = getCurrentModule();
    if (newModule !== state.currentModule) {
        switchModule(newModule);
    }
}

function renderQuestionNav() {
    const nav = elements.questionNav;
    nav.innerHTML = '';
    
    TEST_QUESTIONS.forEach((q, index) => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.textContent = index + 1;
        btn.dataset.index = index;
        btn.addEventListener('click', () => goToQuestion(index));
        
        // Add status classes
        if (index === state.currentQuestionIndex) {
            btn.classList.add('current');
        }
        if (state.answers[index + 1] !== undefined) {
            btn.classList.add('answered');
        }
        if (state.flagged[index + 1]) {
            btn.classList.add('flagged');
        }
        
        nav.appendChild(btn);
    });
}

function renderQuestion() {
    const q = TEST_QUESTIONS[state.currentQuestionIndex];
    const container = elements.questionContainer;
    
    let html = `
        <div class="question-header">
            <span class="question-type">${q.type} • ${q.difficulty}</span>
            <h3 class="question-text">${q.question}</h3>
        </div>
    `;
    
    if (q.passage) {
        html += `<div class="passage">${q.passage}</div>`;
    }
    
    // Multiple choice for all questions
    html += '<div class="options">';
    q.options.forEach((option, i) => {
        const isSelected = state.answers[q.id] === i;
        html += `
            <div class="option ${isSelected ? 'selected' : ''}" data-option="${i}" onclick="selectOption(${i})">
                <div class="option-letter">${String.fromCharCode(65 + i)}</div>
                <div class="option-text">${option}</div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
    
    // Update header info
    elements.questionCounter.textContent = `Soru ${state.currentQuestionIndex + 1} / ${TEST_QUESTIONS.length}`;
    elements.moduleIndicator.textContent = q.module;
    
    // Update mark review button
    const markBtn = elements.markReviewBtn;
    if (state.flagged[q.id]) {
        markBtn.classList.add('active');
        markBtn.querySelector('span').textContent = 'İşaretli';
    } else {
        markBtn.classList.remove('active');
        markBtn.querySelector('span').textContent = 'İşaretle';
    }
}

function selectOption(optionIndex) {
    const q = TEST_QUESTIONS[state.currentQuestionIndex];
    state.answers[q.id] = optionIndex;
    
    // Update UI
    document.querySelectorAll('.option').forEach((el, i) => {
        el.classList.toggle('selected', i === optionIndex);
    });
    
    // Update nav button
    updateNavButtonState(state.currentQuestionIndex);
    updateProgress();
    updateNavigationButtons();
}

function clearCurrentAnswer() {
    const q = TEST_QUESTIONS[state.currentQuestionIndex];
    delete state.answers[q.id];
    
    // Update UI
    document.querySelectorAll('.option').forEach(el => {
        el.classList.remove('selected');
    });
    
    updateNavButtonState(state.currentQuestionIndex);
    updateProgress();
    updateNavigationButtons();
}

function toggleFlag() {
    const q = TEST_QUESTIONS[state.currentQuestionIndex];
    state.flagged[q.id] = !state.flagged[q.id];
    
    const markBtn = elements.markReviewBtn;
    if (state.flagged[q.id]) {
        markBtn.classList.add('active');
        markBtn.querySelector('span').textContent = 'İşaretli';
    } else {
        markBtn.classList.remove('active');
        markBtn.querySelector('span').textContent = 'İşaretle';
    }
    
    updateNavButtonState(state.currentQuestionIndex);
}

function updateNavButtonState(index) {
    const btn = elements.questionNav.querySelector(`[data-index="${index}"]`);
    if (!btn) return;
    
    const q = TEST_QUESTIONS[index];
    btn.classList.toggle('answered', state.answers[q.id] !== undefined);
    btn.classList.toggle('flagged', state.flagged[q.id]);
    btn.classList.toggle('current', index === state.currentQuestionIndex);
}

function goToQuestion(index) {
    if (index < 0 || index >= TEST_QUESTIONS.length) return;
    
    state.currentQuestionIndex = index;
    checkModuleTransition();
    renderQuestion();
    renderQuestionNav();
    updateNavigationButtons();
    elements.questionContainer.scrollTop = 0;
}

function goToPreviousQuestion() {
    if (state.currentQuestionIndex > 0) {
        goToQuestion(state.currentQuestionIndex - 1);
    }
}

function goToNextQuestion() {
    if (state.currentQuestionIndex < TEST_QUESTIONS.length - 1) {
        goToQuestion(state.currentQuestionIndex + 1);
    }
}

function updateNavigationButtons() {
    elements.prevBtn.disabled = state.currentQuestionIndex === 0;
    
    if (state.currentQuestionIndex === TEST_QUESTIONS.length - 1) {
        elements.nextBtn.style.display = 'none';
        elements.finishBtn.style.display = 'inline-flex';
    } else {
        elements.nextBtn.style.display = 'inline-flex';
        elements.finishBtn.style.display = 'none';
    }
}

function updateProgress() {
    const total = TEST_QUESTIONS.length;
    const answered = Object.keys(state.answers).length;
    const percent = Math.round((answered / total) * 100);
    
    elements.progressFill.style.width = `${percent}%`;
    elements.progressText.textContent = `%${percent} tamamlandı (${answered}/${total})`;
}

function showExitModal() {
    elements.modalOverlay.classList.add('active');
    elements.exitModal.classList.add('active');
}

function hideExitModal() {
    elements.modalOverlay.classList.remove('active');
    elements.exitModal.classList.remove('active');
}

function showFinishModal() {
    // Count unanswered
    const unanswered = TEST_QUESTIONS.filter(q => state.answers[q.id] === undefined).length;
    
    if (unanswered > 0) {
        elements.unansweredWarning.textContent = `⚠ ${unanswered} soru cevapsız kaldı. Yine de bitirmek istiyor musunuz?`;
        elements.unansweredWarning.classList.add('active');
    } else {
        elements.unansweredWarning.classList.remove('active');
    }
    
    elements.modalOverlay.classList.add('active');
    elements.finishModal.classList.add('active');
}

function hideFinishModal() {
    elements.modalOverlay.classList.remove('active');
    elements.finishModal.classList.remove('active');
}

function hideAllModals() {
    hideExitModal();
    hideFinishModal();
}

function exitTest() {
    hideExitModal();
    showScreen('welcome');
    resetTest();
}

function resetTest() {
    state.currentQuestionIndex = 0;
    state.answers = {};
    state.flagged = {};
    state.startTime = null;
    state.moduleStartTimes = {};
    state.currentModule = 'rw1';
    state.timeRemaining = { ...state.moduleTimes };
    state.testCompleted = false;
    state.testStartTime = null;
    
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    
    elements.timerEl.classList.remove('warning', 'danger');
    renderQuestionNav();
}

function finishTest() {
    hideFinishModal();
    clearInterval(state.timerInterval);
    state.testCompleted = true;
    
    calculateAndShowResults();
}

function calculateAndShowResults() {
    let rwCorrect = 0, rwWrong = 0, rwBlank = 0;
    let mathCorrect = 0, mathWrong = 0, mathBlank = 0;
    
    TEST_QUESTIONS.forEach(q => {
        const userAnswer = state.answers[q.id];
        const isCorrect = userAnswer === q.correct;
        const isBlank = userAnswer === undefined;
        
        if (q.section === 'R&W') {
            if (isBlank) rwBlank++;
            else if (isCorrect) rwCorrect++;
            else rwWrong++;
        } else {
            if (isBlank) mathBlank++;
            else if (isCorrect) mathCorrect++;
            else mathWrong++;
        }
    });
    
    const rwRaw = rwCorrect;
    const mathRaw = mathCorrect;
    
    // Get scaled scores
    const rwScaled = SCORING_DATA.rw.rawToScaled[rwRaw] || 200;
    const mathScaled = SCORING_DATA.math.rawToScaled[mathRaw] || 200;
    const totalScaled = rwScaled + mathScaled;
    
    // Update summary cards
    document.getElementById('total-score').textContent = totalScaled;
    document.getElementById('rw-score').textContent = rwScaled;
    document.getElementById('math-score').textContent = mathScaled;
    
    // Update stats
    const totalCorrect = rwCorrect + mathCorrect;
    const totalWrong = rwWrong + mathWrong;
    const totalBlank = rwBlank + mathBlank;
    const totalAnswered = totalCorrect + totalWrong;
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    
    document.getElementById('correct-count').textContent = totalCorrect;
    document.getElementById('wrong-count').textContent = totalWrong;
    document.getElementById('blank-count').textContent = totalBlank;
    document.getElementById('accuracy-rate').textContent = `%${accuracy}`;
    
    // Set date
    document.getElementById('test-date').textContent = new Date().toLocaleDateString('tr-TR', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    // Render review panels
    renderReviewPanel('review', TEST_QUESTIONS);
    renderReviewPanel('wrong', TEST_QUESTIONS.filter(q => {
        const userAnswer = state.answers[q.id];
        return userAnswer !== undefined && userAnswer !== q.correct;
    }));
    renderReviewPanel('flagged', TEST_QUESTIONS.filter(q => state.flagged[q.id]));
    renderSummary(rwCorrect, rwWrong, rwBlank, mathCorrect, mathWrong, mathBlank, rwScaled, mathScaled, totalScaled);
    
    showScreen('results');
}

function renderReviewPanel(panelId, questions) {
    const container = document.getElementById(`questions-${panelId}`);
    container.innerHTML = '';
    
    questions.forEach(q => {
        const userAnswer = state.answers[q.id];
        const isCorrect = userAnswer === q.correct;
        const isBlank = userAnswer === undefined;
        
        let statusClass = '';
        if (isBlank) statusClass = 'blank';
        else if (isCorrect) statusClass = 'correct';
        else statusClass = 'wrong';
        
        const card = document.createElement('div');
        card.className = `review-card ${statusClass} ${state.flagged[q.id] ? 'flagged' : ''}`;
        
        let optionsHtml = '';
        q.options.forEach((opt, i) => {
            const isUserAnswer = userAnswer === i;
            const isCorrectAnswer = i === q.correct;
            let optClass = '';
            if (isCorrectAnswer) optClass += ' correct';
            if (isUserAnswer) optClass += ' user-answer';
            
            optionsHtml += `
                <div class="review-option${optClass}">
                    <div class="review-option-letter">${String.fromCharCode(65 + i)}</div>
                    <div>${opt}</div>
                </div>
            `;
        });
        
        // If blank, show no answer
        if (isBlank) {
            optionsHtml = '<div class="review-option" style="color: var(--warning);">Cevaplanmadı</div>';
        }
        
        card.innerHTML = `
            <div class="review-header">
                <div class="review-number ${statusClass}">${q.id}</div>
                <span class="review-type">${q.type}</span>
                <span class="review-module">${q.module}</span>
            </div>
            <div class="review-body">
                <div class="review-question">${q.question}</div>
                <div class="review-options">${optionsHtml}</div>
                <div class="review-explanation">
                    <strong>Açıklama:</strong> ${q.explanation}
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function renderSummary(rwC, rwW, rwB, mathC, mathW, mathB, rwS, mathS, totalS) {
    const container = document.getElementById('summary-content');
    
    container.innerHTML = `
        <div class="summary-section">
            <h3>Reading & Writing (54 Soru)</h3>
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>Doğru</h4>
                    <div class="value" style="color: var(--success);">${rwC}</div>
                </div>
                <div class="summary-card">
                    <h4>Yanlış</h4>
                    <div class="value" style="color: var(--danger);">${rwW}</div>
                </div>
                <div class="summary-card">
                    <h4>Boş</h4>
                    <div class="value" style="color: var(--warning);">${rwB}</div>
                </div>
                <div class="summary-card">
                    <h4>Ham Puan</h4>
                    <div class="value">${rwC}/54</div>
                </div>
                <div class="summary-card">
                    <h4>Ölçeklenmiş Puan</h4>
                    <div class="value" style="color: #6B2DBD;">${rwS}</div>
                </div>
                <div class="summary-card">
                    <h4>Doğruluk</h4>
                    <div class="value">%${Math.round((rwC / (54 - rwB)) * 100) || 0}</div>
                </div>
            </div>
        </div>
        
        <div class="summary-section">
            <h3>Math (44 Soru)</h3>
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>Doğru</h4>
                    <div class="value" style="color: var(--success);">${mathC}</div>
                </div>
                <div class="summary-card">
                    <h4>Yanlış</h4>
                    <div class="value" style="color: var(--danger);">${mathW}</div>
                </div>
                <div class="summary-card">
                    <h4>Boş</h4>
                    <div class="value" style="color: var(--warning);">${mathB}</div>
                </div>
                <div class="summary-card">
                    <h4>Ham Puan</h4>
                    <div class="value">${mathC}/44</div>
                </div>
                <div class="summary-card">
                    <h4>Ölçeklenmiş Puan</h4>
                    <div class="value" style="color: var(--success);">${mathS}</div>
                </div>
                <div class="summary-card">
                    <h4>Doğruluk</h4>
                    <div class="value">%${Math.round((mathC / (44 - mathB)) * 100) || 0}</div>
                </div>
            </div>
        </div>
        
        <div class="summary-section">
            <h3>Genel Sonuç</h3>
            <div class="summary-grid">
                <div class="summary-card" style="border-color: var(--primary); background: var(--primary-light);">
                    <h4>Toplam Puan</h4>
                    <div class="value" style="color: var(--primary); font-size: 36px;">${totalS}</div>
                </div>
                <div class="summary-card">
                    <h4>Toplam Doğru</h4>
                    <div class="value">${rwC + mathC}/98</div>
                </div>
                <div class="summary-card">
                    <h4>Genel Doğruluk</h4>
                    <div class="value">%${Math.round(((rwC + mathC) / (98 - rwB - mathB)) * 100) || 0}</div>
                </div>
            </div>
        </div>
        
        <div class="summary-section">
            <h3>Puan Değerlendirmesi</h3>
            <div class="summary-card" style="background: var(--bg);">
                <p><strong>Bu test Modül 2 Kolay (Easy) versiyonu kullanılarak hesaplanmıştır.</strong></p>
                <p>R&W: ${rwC}/54 ham → ${rwS} ölçek | Math: ${mathC}/44 ham → ${mathS} ölçek</p>
                <p>Toplam: ${totalS}/1600</p>
                <p><em>Not: Gerçek SAT'de aynı ham puan, test zorluğuna göre farklı ölçeklenmiş puan verebilir. Bu tahmini puanlardır.</em></p>
            </div>
        </div>
    `;
}

function switchTab(tabId) {
    // Update buttons
    elements.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    // Update panels
    elements.tabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });
}

function retakeTest() {
    resetTest();
    showScreen('welcome');
}

function downloadReport() {
    const report = {
        testDate: new Date().toISOString(),
        totalScore: parseInt(document.getElementById('total-score').textContent),
        rwScore: parseInt(document.getElementById('rw-score').textContent),
        mathScore: parseInt(document.getElementById('math-score').textContent),
        correct: parseInt(document.getElementById('correct-count').textContent),
        wrong: parseInt(document.getElementById('wrong-count').textContent),
        blank: parseInt(document.getElementById('blank-count').textContent),
        accuracy: document.getElementById('accuracy-rate').textContent,
        answers: state.answers,
        flagged: state.flagged,
        details: TEST_QUESTIONS.map(q => ({
            id: q.id,
            module: q.module,
            type: q.type,
            correct: q.correct,
            userAnswer: state.answers[q.id],
            isCorrect: state.answers[q.id] === q.correct,
            flagged: state.flagged[q.id]
        }))
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sat-practice-test-5-results-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Make selectOption globally accessible for onclick handlers
window.selectOption = selectOption;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);