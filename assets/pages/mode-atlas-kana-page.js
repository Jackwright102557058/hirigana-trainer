const modeAtlasKanaCloudReady = (window.KanaCloudSync?.beforePageLoad?.() || Promise.resolve())
    .then(() => window.KanaCloudSync?.hydrateFromCloud?.())
    .catch((err) => { console.warn('Kana hub cloud hydration failed', err); });

(function ModeAtlasKanaHub(){
    const M = () => window.ModeAtlasKanaMetrics;
    const Store = window.ModeAtlasStorage;
    const $ = (sel, root = document) => root.querySelector(sel);

    function storeGet(key, fallback = '') {
        return Store?.get?.(key, fallback) ?? localStorage.getItem(key) ?? fallback;
    }

    function storeSet(key, value) {
        return Store?.set?.(key, value) ?? localStorage.setItem(key, String(value));
    }

    function loadJSON(key, fallback) {
        try {
            if (window.ModeAtlasStorage?.json) return window.ModeAtlasStorage.json(key, fallback);
            const raw = storeGet(key, null);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    }

    function loadNumber(key, fallback = 0) {
        try {
            if (window.ModeAtlasStorage?.number) return window.ModeAtlasStorage.number(key, fallback);
            const value = Number(storeGet(key, fallback));
            return Number.isFinite(value) ? value : fallback;
        } catch {
            return fallback;
        }
    }


    function kanaEl(tag, className = '', text = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== '') el.textContent = String(text);
        return el;
    }

    function kanaButton(className = '', text = '') {
        const button = kanaEl('button', className, text);
        button.type = 'button';
        return button;
    }

    function kanaLink(className = '', text = '', href = '') {
        const link = kanaEl('a', className, text);
        link.href = href;
        return link;
    }

    function progressBar(percent) {
        const bar = document.createElement('i');
        const fill = document.createElement('b');
        fill.dataset.maProgress = String(percent);
        bar.append(fill);
        return bar;
    }

    function appendLabelValue(parent, label, value) {
        const item = document.createElement('div');
        item.append(kanaEl('span','',label), kanaEl('strong','',value));
        parent.append(item);
        return item;
    }

    function todayKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }

    function normaliseScoreHistory(data) {
        return {
            endlessBest: { total: 0, correct: 0, wrong: 0, ...((data || {}).endlessBest || {}) },
            speedRunTop3: Array.isArray((data || {}).speedRunTop3) ? data.speedRunTop3 : [],
            comboKanaBest: { same_row: 0, random: 0, ...((data || {}).comboKanaBest || {}) },
            timeTrialTop3: Array.isArray((data || {}).timeTrialTop3) ? data.timeTrialTop3 : []
        };
    }

    function formatMs(ms) {
        const n = Number(ms || 0);
        if (!Number.isFinite(n) || n <= 0) return '—';
        return n < 1000 ? `${Math.round(n)}ms` : `${(n / 1000).toFixed(1)}s`;
    }

    function modeTotals(stats) {
        let correct = 0, wrong = 0, seen = 0;
        Object.values(stats || {}).forEach(item => {
            if (!item || typeof item !== 'object') return;
            const c = Number(item.correct || item.right || 0);
            const w = Number(item.wrong || item.incorrect || 0);
            if (c + w > 0) seen += 1;
            correct += c;
            wrong += w;
        });
        const attempts = correct + wrong;
        return { correct, wrong, attempts, seen, accuracy: attempts ? Math.round((correct / attempts) * 100) : 0 };
    }

    function dailyEntries(history) {
        return Object.entries(history || {})
            .map(([date, entry]) => ({ date, entry: entry || {} }))
            .sort((a, b) => b.date.localeCompare(a.date));
    }

    function dailyStatus(history) {
        const today = history?.[todayKey()] || null;
        const entries = dailyEntries(history);
        const best = entries.reduce((pick, item) => {
            const score = Number(item.entry.officialScore || 0);
            if (!pick || score > pick.score) return { ...item, score };
            return pick;
        }, null);
        return { today, entries, best };
    }

    function collectSummaries() {
        const readingStats = Store.readModeJSON('reading', 'charStats', {});
        const writingStats = Store.readModeJSON('writing', 'charStats', {});
        const readingDaily = Store.readModeJSON('reading', 'dailyHistory', {});
        const writingDaily = Store.readModeJSON('writing', 'dailyHistory', {});
        return {
            reading: {
                mode: 'reading',
                label: 'Reading',
                href: '../reading/',
                totals: modeTotals(readingStats),
                highScore: Store.readModeNumber('reading', 'highScore', 0),
                scoreHistory: normaliseScoreHistory(Store.readModeJSON('reading', 'scoreHistory', {})),
                daily: dailyStatus(readingDaily)
            },
            writing: {
                mode: 'writing',
                label: 'Writing',
                href: '../writing/',
                totals: modeTotals(writingStats),
                highScore: Store.readModeNumber('writing', 'highScore', 0),
                scoreHistory: normaliseScoreHistory(Store.readModeJSON('writing', 'scoreHistory', {})),
                daily: dailyStatus(writingDaily)
            }
        };
    }

    function allKana() {
        return Array.isArray(M()?.ALL) ? M().ALL : [];
    }

    function masteryFor(ch) {
        const metrics = M();
        const correct = Number(metrics?.charCorrect?.(ch) || 0);
        const wrong = Number(metrics?.charWrong?.(ch) || 0);
        const attempts = correct + wrong;
        const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
        const avg = Number(metrics?.charAvg?.(ch) || 0);
        let stage = 'New';
        if (attempts > 0) {
            if (correct >= 50 && accuracy >= 95 && avg > 0 && avg <= 1000) stage = 'Mastered';
            else if (correct >= 10 && accuracy >= 85 && (!avg || avg <= 2500)) stage = 'Reviewing';
            else stage = 'Learning';
        }
        const priority = attempts
            ? (stage === 'Learning' ? 4 : stage === 'Reviewing' ? 3 : stage === 'Mastered' ? 1 : 5)
                + (wrong * 0.18)
                + (avg ? Math.min(avg / 2500, 2) : 1)
                - (accuracy / 100)
            : 0;
        return { ch, correct, wrong, attempts, accuracy, avg, stage, priority };
    }

    function masterySummary() {
        const items = allKana().map(masteryFor);
        const counts = { New: 0, Learning: 0, Reviewing: 0, Mastered: 0 };
        items.forEach(item => { counts[item.stage] += 1; });
        const seen = items.filter(item => item.attempts > 0).length;
        const timed = items.filter(item => item.avg > 0);
        const average = timed.length ? timed.reduce((sum, item) => sum + item.avg, 0) / timed.length : 0;
        const weak = items
            .filter(item => item.attempts > 0 && item.stage !== 'Mastered')
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 6);
        const slowest = timed
            .slice()
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 4);
        return { items, counts, seen, total: items.length, average, weak, slowest };
    }

    function trainerStreak() {
        const dateSet = new Set();
        const addHistory = (history) => Object.keys(history || {}).forEach(key => {
            const date = String(key || '').slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) dateSet.add(date);
        });
        addHistory(Store.readModeJSON('reading', 'dailyHistory', {}));
        addHistory(Store.readModeJSON('writing', 'dailyHistory', {}));

        const resultKeys = [
            'testModeResults','readingTestModeResults','kanaTrainerReadingTestModeResults',
            'writingTestModeResults','kanaTrainerWritingTestModeResults','reverseTestModeResults'
        ];
        resultKeys.forEach(key => {
            const arr = loadJSON(key, []);
            if (!Array.isArray(arr)) return;
            arr.forEach(item => {
                const raw = item?.date || item?.completedAt || item?.createdAt || item?.startedAt || '';
                const parsed = String(raw).slice(0, 10);
                if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) dateSet.add(parsed);
            });
        });

        const lastVisit = storeGet('modeAtlasLastVisitStudyDate', '');
        if (/^\d{4}-\d{2}-\d{2}$/.test(lastVisit || '')) dateSet.add(lastVisit);

        let count = 0;
        const d = new Date();
        for (;;) {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            if (!dateSet.has(key)) break;
            count += 1;
            d.setDate(d.getDate() - 1);
        }
        return count;
    }

    function formalTestCount() {
        return M()?.formalTestCount?.() || 0;
    }

    function pct(value, total) {
        return Math.max(0, Math.min(100, total ? Math.round((Number(value || 0) / total) * 100) : 0));
    }

    function applyHubVisuals(root = document) {
        window.ModeAtlasUi?.applyProgressWidths?.(root);
        const scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll('[data-ma-progress]').forEach(el => {
            const value = Math.max(0, Math.min(100, Number(el.dataset.maProgress || 0)));
            el.style.setProperty('--ma-progress', `${value}%`);
            el.style.width = `${value}%`;
        });
        scope.querySelectorAll('[data-ring-pct]').forEach(el => {
            const value = Math.max(0, Math.min(100, Number(el.dataset.ringPct || 0)));
            el.style.setProperty('--pct', String(value));
            if (el.dataset.ringColor) el.style.setProperty('--ring-color', el.dataset.ringColor);
        });
    }


    function compactKanaList(items, limit = 4) {
        const list = Array.isArray(items) ? items : [];
        const visible = list.slice(0, limit).map(item => item.ch || item).join(' · ');
        return list.length > limit ? `${visible} +${list.length - limit}` : (visible || 'Build more history');
    }

    function stageCopy(stage) {
        return {
            New: 'Not started yet',
            Learning: 'Building confidence',
            Reviewing: 'Reliable, building speed',
            Mastered: 'Fast, accurate, proven'
        }[stage] || '';
    }

    function bestRunCards(reading, writing) {
        const readingSpeed = reading.scoreHistory.speedRunTop3[0]?.score || 0;
        const writingSpeed = writing.scoreHistory.speedRunTop3[0]?.score || 0;
        const readingTrial = reading.scoreHistory.timeTrialTop3[0]?.score || 0;
        const writingTrial = writing.scoreHistory.timeTrialTop3[0]?.score || 0;
        return [
            ['Endless', Math.max(reading.scoreHistory.endlessBest.correct || 0, writing.scoreHistory.endlessBest.correct || 0), 'best correct streak'],
            ['Speed Run', Math.max(readingSpeed, writingSpeed), 'top speed score'],
            ['Time Trial', Math.max(readingTrial, writingTrial), 'best listed score'],
            ['Combo', Math.max(reading.scoreHistory.comboKanaBest.same_row || 0, writing.scoreHistory.comboKanaBest.same_row || 0, reading.scoreHistory.comboKanaBest.random || 0, writing.scoreHistory.comboKanaBest.random || 0), 'best combo streak']
        ];
    }

    function recommendedAction(summaries, mastery) {
        const weak = mastery.weak.slice(0, 4);
        if (weak.length) {
            return {
                title: `Review ${weak.map(item => item.ch).join(' · ')}`,
                text: 'These kana are currently holding back accuracy, speed, or reliable reps.',
                href: '../reading/?focusWeak=1',
                label: 'Start smart review',
                kind: 'review'
            };
        }
        if (mastery.counts.New > 0) {
            return {
                title: 'Start with fresh kana',
                text: 'You still have new kana waiting. Build a little history, then the hub will suggest smarter reviews.',
                href: '../reading/',
                label: 'Start Reading',
                kind: 'new'
            };
        }
        const readingAcc = summaries.reading.totals.accuracy || 0;
        const writingAcc = summaries.writing.totals.accuracy || 0;
        if (readingAcc - writingAcc > 12) {
            return { title: 'Balance recall practice', text: 'Writing is behind Reading. A short Writing session will strengthen active recall.', href: '../writing/', label: 'Go to Writing', kind: 'writing' };
        }
        return { title: 'Take a formal test', text: 'You have enough history for a useful check-in. Test mode will show weak rows and timing clearly.', href: '../results/', label: 'Open Results', kind: 'test' };
    }

    function renderHero(summaries, mastery, action) {
        const continueLink = $('#kanaContinueAction');
        const continueHint = $('#kanaContinueHint');
        if (continueLink) continueLink.href = action.href;
        if (continueHint) continueHint.textContent = action.label;

        const card = $('#kanaTodayCard');
        if (!card) return;
        const masteredPct = pct(mastery.counts.Mastered, mastery.total);
        const reviewingPct = pct(mastery.counts.Mastered + mastery.counts.Reviewing, mastery.total);
        const seenPct = pct(mastery.seen, mastery.total);

        const map = kanaEl('div', 'kana-hero-map');
        map.setAttribute('aria-label', 'Kana progress map');
        [
            ['Seen', seenPct],
            ['Review+', reviewingPct],
            ['Mastered', masteredPct]
        ].forEach(([label, value]) => {
            const row = kanaEl('div', 'kana-map-row');
            row.append(kanaEl('span','',label), progressBar(value), kanaEl('em','',`${value}%`));
            map.append(row);
        });

        const mini = kanaEl('div','kana-hero-mini');
        [
            [trainerStreak(), 'day trainer streak'],
            [mastery.counts.Learning, 'learning'],
            [mastery.counts.Reviewing, 'reviewing']
        ].forEach(([value, label]) => {
            const item = document.createElement('div');
            item.append(kanaEl('strong','',value), kanaEl('span','',label));
            mini.append(item);
        });

        card.replaceChildren(
            kanaEl('span','kana-card-kicker','Progress map'),
            kanaEl('h2','',`${mastery.seen}/${mastery.total} kana seen`),
            kanaEl('p','','A quick visual check-in before you jump back into practice.'),
            map,
            mini
        );
    }

    function renderNextPanel(summaries, mastery, action) {
        const target = $('#kanaNextPanel');
        if (!target) return;
        const weak = mastery.weak.slice(0, 5);
        const weakText = compactKanaList(weak, 4);
        const readingDone = !!summaries.reading.daily.today;
        const writingDone = !!summaries.writing.daily.today;
        const todayCount = Number(readingDone) + Number(writingDone);

        const head = kanaEl('div','kana-section-head compact');
        const copy = document.createElement('div');
        copy.append(
            kanaEl('span','kana-section-kicker','Start here'),
            kanaEl('h2','','Your next best step'),
            kanaEl('p','','A simple place to start, with daily review and weak-kana focus close by.')
        );
        const guide = kanaButton('kana-ghost-action','How to use this hub');
        guide.dataset.maKanaGuide = '';
        head.append(copy, guide);

        const grid = kanaEl('div','kana-next-grid');

        const recommended = kanaLink(`kana-next-card primary ${action.kind}`, '', action.href);
        recommended.append(
            kanaEl('span','','Recommended'),
            kanaEl('strong','',action.title),
            kanaEl('p','',action.text),
            kanaEl('em','',`${action.label} →`)
        );

        const daily = kanaEl('div','kana-next-card compact');
        daily.append(kanaEl('span','','Daily check-in'));
        const dailyTitle = kanaEl('strong','');
        dailyTitle.append(
            document.createTextNode(readingDone ? 'Reading ✓' : 'Reading ready'),
            document.createElement('br'),
            document.createTextNode(writingDone ? 'Writing ✓' : 'Writing ready')
        );
        const dailyBtn = kanaButton('kana-inline-btn','View history');
        dailyBtn.dataset.maDailyHistory = '';
        daily.append(dailyTitle, kanaEl('p','',`${todayCount}/2 daily challenges complete today.`), dailyBtn);

        const focus = kanaEl('div','kana-next-card compact');
        const review = kanaLink('kana-inline-btn','Focus these rows','../reading/?focusWeak=1');
        review.dataset.maWeakReview = '';
        focus.append(
            kanaEl('span','','Focus set'),
            kanaEl('strong','kana-focus-kana',weakText),
            kanaEl('p','',weak.length ? 'Weakest kana by accuracy, speed, and reps.' : 'Finish a few sessions to unlock useful weak-kana focus.'),
            review
        );

        grid.append(recommended, daily, focus);
        target.replaceChildren(head, grid);
    }

    function renderMastery(mastery) {
        const grid = $('#kanaMasteryGrid');
        if (!grid) return;
        const stages = ['New', 'Learning', 'Reviewing', 'Mastered'];
        grid.replaceChildren(...stages.map(stage => {
            const button = kanaButton(`kana-stage-card ${stage.toLowerCase()}`);
            button.dataset.maMasteryOpen = '';
            button.append(
                kanaEl('span','',stage),
                kanaEl('strong','',mastery.counts[stage]),
                kanaEl('p','',stage === 'New' ? 'Waiting for first practice' : stageCopy(stage)),
                progressBar(pct(mastery.counts[stage], mastery.total))
            );
            return button;
        }));

        const weak = compactKanaList(mastery.weak, 4);
        const slow = mastery.slowest.slice(0, 3).map(item => `${item.ch} ${formatMs(item.avg)}`).join(' · ') || 'No timing yet';
        const focus = $('#kanaMasteryFocus');
        if (focus) {
            const focusNow = kanaEl('div','kana-focus-card');
            focusNow.append(
                kanaEl('span','','Focus now'),
                kanaEl('strong','',mastery.weak.length ? `Review ${weak}` : 'Build first attempts'),
                kanaEl('p','',mastery.weak.length ? 'Build steady correct answers first. Mastery means fast, accurate recall over many reps.' : 'Complete a few sessions so the hub can find useful focus kana.')
            );
            const avg = kanaEl('div','kana-focus-card');
            avg.append(kanaEl('span','','Average recognition'), kanaEl('strong','',mastery.average ? formatMs(mastery.average) : '—'), kanaEl('p','','Across kana with saved timing history.'));
            const slowest = kanaEl('div','kana-focus-card');
            slowest.append(kanaEl('span','','Slowest kana'), kanaEl('strong','',slow), kanaEl('p','','Practise these slowly first, then build speed once they feel reliable.'));
            const map = kanaButton('kana-map-card');
            map.dataset.maMasteryOpen = '';
            map.append(kanaEl('strong','','Open the full Mastery Map'), kanaEl('span','','See every kana by stage, speed, accuracy, and review priority.'));
            focus.replaceChildren(focusNow, avg, slowest, map);
        }
        window.ModeAtlasUi?.applyProgressWidths?.(grid);
    }

    function presetProgress() {
        const metrics = M();
        return (metrics?.PRESET_TRACKERS || []).map(item => {
            const value = Math.min(100, item.chars.reduce((sum, ch) => sum + Number(metrics.charCorrect?.(ch) || 0), 0));
            return { ...item, value, done: value >= 100, remaining: Math.max(0, 100 - value) };
        });
    }

    function renderPresets() {
        const target = $('#kanaPresetPanel');
        if (!target) return;
        const items = presetProgress();

        const head = kanaEl('div','kana-section-head compact');
        const copy = document.createElement('div');
        copy.append(
            kanaEl('h2','','Preset achievements')
        );
        head.append(copy);

        const grid = kanaEl('div','kana-preset-grid');
        items.forEach(item => {
            const card = kanaEl('article', `kana-preset-card ${item.done ? 'done' : ''}`.trim());
            const top = document.createElement('div');
            top.append(kanaEl('strong','',item.name), kanaEl('span','',`${item.value}/100`));
            card.append(top, kanaEl('p','',item.desc), progressBar(item.value), kanaEl('em','',item.done ? 'Complete' : 'In progress'));
            grid.append(card);
        });

        target.replaceChildren(head, grid);
        window.ModeAtlasUi?.applyProgressWidths?.(target);
    }

    function renderRecords(summaries, mastery) {
        const target = $('#kanaRecordsPanel');
        if (!target) return;
        const records = bestRunCards(summaries.reading, summaries.writing);
        const totalAnswers = summaries.reading.totals.attempts + summaries.writing.totals.attempts;

        const head = kanaEl('div','kana-section-head');
        const copy = document.createElement('div');
        copy.append(
            kanaEl('span','kana-section-kicker','Performance highlights'),
            kanaEl('h2','','Records & progress'),
            kanaEl('p','','Your best scores, accuracy, and practice volume in one place.')
        );
        head.append(copy, kanaLink('kana-ghost-action','View test results','../results/'));

        const layout = kanaEl('div','kana-record-layout');

        const accuracyPair = kanaEl('div','kana-accuracy-pair');
        accuracyPair.append(
            accuracyCardNode('Reading', summaries.reading.totals.accuracy, summaries.reading.highScore, summaries.reading.totals.attempts, 'reading'),
            accuracyCardNode('Writing', summaries.writing.totals.accuracy, summaries.writing.highScore, summaries.writing.totals.attempts, 'writing')
        );

        const recordGrid = kanaEl('div','kana-record-grid');
        records.forEach(([label, value, sub]) => {
            const card = kanaEl('article','kana-record-card');
            card.append(kanaEl('span','',label), kanaEl('strong','',value), kanaEl('em','',sub));
            recordGrid.append(card);
        });

        const totalCard = kanaEl('article','kana-record-card total');
        totalCard.append(
            kanaEl('span','','Total answers'),
            kanaEl('strong','',totalAnswers),
            kanaEl('em','',`${mastery.seen}/${mastery.total} kana seen`)
        );

        const right = kanaEl('div','kana-record-side');
        right.append(recordGrid, totalCard);

        layout.append(accuracyPair, right);
        target.replaceChildren(head, layout);
        window.ModeAtlasUi?.applyProgressWidths?.(target);
    }

    function accuracyCardNode(label, accuracy, highScore, attempts, mode) {
        const card = kanaEl('article', `kana-accuracy-card ${mode}`);
        const ring = kanaEl('div','kana-ring');
        ring.dataset.ringPct = String(accuracy || 0);
        if (mode === 'writing') ring.dataset.ringColor = '#66a8ff';
        ring.append(kanaEl('strong','',`${accuracy || 0}%`), kanaEl('span','','accuracy'));

        const details = document.createElement('div');
        details.append(kanaEl('h3','',label));
        const grid = kanaEl('div','kana-mini-grid');
        appendLabelValue(grid, 'High score', highScore || 0);
        appendLabelValue(grid, 'Attempts', attempts || 0);
        details.append(grid);

        card.append(ring, details);
        return card;
    }



    function openInfoModal(type, context = {}) {
        let modal = $('#kanaHubModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'kanaHubModal';
            modal.className = 'kana-hub-modal';

            const backdrop = kanaEl('div','kana-modal-backdrop');
            backdrop.dataset.maKanaModalClose = '';

            const panel = kanaEl('div','kana-modal-panel');
            panel.setAttribute('role','dialog');
            panel.setAttribute('aria-modal','true');

            const head = kanaEl('div','kana-modal-head');
            const titleWrap = document.createElement('div');
            const kicker = kanaEl('span','kana-section-kicker');
            kicker.id = 'kanaModalKicker';
            const title = kanaEl('h2');
            title.id = 'kanaModalTitle';
            titleWrap.append(kicker, title);
            const close = kanaButton('kana-modal-close','Close');
            close.dataset.maKanaModalClose = '';

            head.append(titleWrap, close);
            const body = kanaEl('div','kana-modal-body');
            body.id = 'kanaModalBody';
            panel.append(head, body);
            modal.append(backdrop, panel);

            document.body.appendChild(modal);
            modal.addEventListener('click', (event) => {
                if (event.target.closest('[data-ma-kana-modal-close]')) modal.classList.remove('open');
            });
        }
        const title = $('#kanaModalTitle', modal);
        const kicker = $('#kanaModalKicker', modal);
        const body = $('#kanaModalBody', modal);
        if (type === 'daily') renderDailyModal(kicker, title, body, context);
        else if (type === 'guide') renderGuideModal(kicker, title, body);
        else renderMasteryHelpModal(kicker, title, body);
        modal.classList.add('open');
    }

    function kanaModalGrid(items) {
        const grid = kanaEl('div','kana-modal-grid');
        items.forEach(([heading, copy]) => {
            const item = document.createElement('div');
            item.append(kanaEl('strong','',heading), kanaEl('p','',copy));
            grid.append(item);
        });
        return grid;
    }

    function renderGuideModal(kicker, title, body) {
        kicker.textContent = 'Quick guide';
        title.textContent = 'How to use the Kana hub';
        body.replaceChildren(kanaModalGrid([
            ['1. Start with the recommendation', 'The hub chooses review, writing, new kana, or testing based on your saved progress.'],
            ['2. Check mastery stages', 'New, Learning, Reviewing, and Mastered show where your kana currently sit.'],
            ['3. Use details only when needed', 'Daily history and the full Mastery Map are in popups so the main page stays clear.']
        ]));
    }

    function renderMasteryHelpModal(kicker, title, body) {
        kicker.textContent = 'Mastery rules';
        title.textContent = 'How mastery works';
        body.replaceChildren(kanaModalGrid([
            ['New', 'You have not practised this kana yet.'],
            ['Learning', 'You have started it, but attempts, accuracy, or speed are still low.'],
            ['Reviewing', 'You are mostly correct and building faster recognition, usually around the 1.5–2.5s stage.'],
            ['Mastered', 'Requires 50+ correct answers, 95%+ accuracy, and 1.0s or faster average recognition.']
        ]));
    }



    function renderDailyModal(kicker, title, body, { summaries }) {
        kicker.textContent = 'Daily challenge';
        title.textContent = 'Daily challenge history';
        const grid = kanaEl('div','kana-daily-modal-grid');
        grid.append(dailyModePanelNode('Reading', summaries.reading, 'reading'), dailyModePanelNode('Writing', summaries.writing, 'writing'));
        body.replaceChildren(grid);
    }

    function dailyModePanelNode(label, summary, mode) {
        const today = summary.daily.today;
        const best = summary.daily.best;
        const history = summary.daily.entries.slice(0, 12);

        const section = kanaEl('section', `kana-daily-modal-card ${mode}`);
        section.append(kanaEl('h3','',label));

        const summaryGrid = kanaEl('div','kana-daily-summary');
        appendLabelValue(summaryGrid, 'Today', today ? `${today.officialScore || 0}/${today.total || 20}` : 'Ready');
        appendLabelValue(summaryGrid, 'Best', best ? `${best.score}/${best.entry.total || 20}` : '—');
        appendLabelValue(summaryGrid, 'High score', summary.highScore || 0);

        const historyWrap = kanaEl('div','kana-daily-history');
        if (history.length) {
            history.forEach(item => {
                const row = document.createElement('div');
                row.append(
                    kanaEl('span','',item.date),
                    kanaEl('strong','',`${item.entry.officialScore || 0}/${item.entry.total || 20}`),
                    kanaEl('em','',`${formatMs(item.entry.timeMs)} · ${item.entry.attempts || 1} attempt${Number(item.entry.attempts || 1) === 1 ? '' : 's'}`)
                );
                historyWrap.append(row);
            });
        } else {
            historyWrap.append(kanaEl('p','','No daily challenge history yet.'));
        }

        section.append(summaryGrid, historyWrap);
        return section;
    }



    function bindActions() {
        if (window.__maKanaHubActionsBound) return;
        window.__maKanaHubActionsBound = true;
        document.addEventListener('click', event => {
            if (event.target.closest('[data-ma-daily-history]')) {
                event.preventDefault();
                openInfoModal('daily', { summaries: collectSummaries() });
            }
            if (event.target.closest('[data-ma-kana-guide]')) {
                event.preventDefault();
                openInfoModal('guide');
            }
            if (event.target.closest('[data-ma-mastery-help]')) {
                event.preventDefault();
                openInfoModal('mastery-help');
            }
            if (event.target.closest('[data-ma-weak-review]')) {
                const current = Store.readModeJSON('reading', 'settings', {});
                Object.assign(current, { focusWeak: true, srs: true, endless: false, timeTrial: false, speedRun: false, dailyChallenge: false, testMode: false });
                try { window.ModeAtlasStorage?.setJSON?.('settings', current); } catch {}
                storeSet('modeAtlasLastKanaPage', '../reading/');
            }
        }, true);
    }

    function renderAll() {
        if (!M()) return;
        const summaries = collectSummaries();
        const mastery = masterySummary();
        const action = recommendedAction(summaries, mastery);
        renderHero(summaries, mastery, action);
        renderNextPanel(summaries, mastery, action);
        renderMastery(mastery);
        renderPresets();
        renderRecords(summaries, mastery);
        applyHubVisuals(document);
    }

    function requestKanaHubRender(source = 'unknown') {
        try { window.ModeAtlasLifecycle?.emit?.('kana-hub-render', { source }); } catch {}
        renderAll();
    }

    bindActions();
    renderAll();

    modeAtlasKanaCloudReady.then(() => {
        requestKanaHubRender('cloud-ready');
    }).catch(() => {
        requestKanaHubRender('cloud-error');
    });

    document.addEventListener('ma:ui-refresh', () => requestKanaHubRender('ui-refresh'));
    document.addEventListener('ma:kana-hub-render', renderAll);
    document.addEventListener('ma:preset-progress-updated', () => requestKanaHubRender('preset-progress'));
    document.addEventListener('ma:profile-updated', () => requestKanaHubRender('profile-updated'));
    window.addEventListener('kanaCloudSyncStatusChanged', () => requestKanaHubRender('cloud-status'));
    window.addEventListener('pageshow', () => requestKanaHubRender('pageshow'));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) requestKanaHubRender('visible'); });
    window.addEventListener('focus', () => requestKanaHubRender('focus'));
    document.addEventListener('ma:trainer-ready', () => requestKanaHubRender('trainer-ready'));
})();
