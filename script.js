// グローバル変数と定数
let allMountains = [];
const userAnswers = { difficulty: null, area: null, tags: [] };
const TAGS = ["景色・眺望", "高山植物", "アクセス", "温泉", "岩場・鎖場", "歴史・信仰"];
let currentQuestionIndex = 0;

// DOM要素の取得
const titleArea = document.getElementById('title-area');
const questionsArea = document.getElementById('questions-area');
const resultArea = document.getElementById('result-area');
const questions = document.querySelectorAll('.question');
const tagsContainer = document.getElementById('tags-container');
const submitBtn = document.getElementById('submit-btn');

// ページの読み込みが完了したら実行
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('./mountains.json');
        if (!response.ok) throw new Error('JSONの読み込みに失敗');
        allMountains = await response.json();
        initializeApp();
    } catch (error) {
        console.error(error);
        questionsArea.innerHTML = '<p>エラーが発生しました。データの読み込みに失敗した可能性があります。</p>';
    }
});

// アプリの初期設定
function initializeApp() {
    TAGS.forEach(tag => {
        const button = document.createElement('button');
        button.className = 'tag-option';
        button.textContent = tag;
        button.dataset.tag = tag;
        tagsContainer.appendChild(button);
    });

    document.getElementById('start-btn').addEventListener('click', startDiagnosis);
    document.getElementById('retry-btn').addEventListener('click', resetDiagnosis);
    submitBtn.addEventListener('click', showResult);
    document.querySelectorAll('.option').forEach(btn => btn.addEventListener('click', (e) => handleOptionClick(e, false)));
    // initializeAppの中でイベントリスナーを設定しないと、動的に生成したボタンにイベントが付かない
    tagsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-option')) {
            handleOptionClick(e, true);
        }
    });
}

// 診断開始
function startDiagnosis() {
    titleArea.classList.add('hidden');
    questionsArea.classList.remove('hidden');
    questions[0].classList.remove('hidden');
}

// 選択肢クリック処理
function handleOptionClick(event, isMultipleChoice) {
    const button = event.target;
    if (isMultipleChoice) {
        const tag = button.dataset.tag;
        button.classList.toggle('selected');
        if (userAnswers.tags.includes(tag)) {
            userAnswers.tags = userAnswers.tags.filter(t => t !== tag);
        } else {
            userAnswers.tags.push(tag);
        }
        submitBtn.disabled = userAnswers.tags.length === 0;
    } else {
        userAnswers[button.dataset.q] = button.dataset.v;
        moveToNextQuestion();
    }
}

// 次の質問へ
function moveToNextQuestion() {
    questions[currentQuestionIndex].classList.add('hidden');
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        questions[currentQuestionIndex].classList.remove('hidden');
    }
}

// リセット処理
function resetDiagnosis() {
    userAnswers.difficulty = null;
    userAnswers.area = null;
    userAnswers.tags = [];
    currentQuestionIndex = 0;
    document.querySelectorAll('.tag-option.selected').forEach(btn => btn.classList.remove('selected'));
    submitBtn.disabled = true;
    resultArea.classList.add('hidden');
    questions.forEach(q => q.classList.add('hidden'));
    titleArea.classList.remove('hidden');
}

// 結果表示
function showResult() {
    const bestMountain = diagnose();
    if (bestMountain) {
        document.getElementById('result-image').src = bestMountain.imageUrl;
        document.getElementById('result-image').alt = bestMountain.name;
        document.getElementById('result-name').textContent = `【${bestMountain.name}】`;
        document.getElementById('result-catchphrase').textContent = bestMountain.catchphrase;
        document.getElementById('result-area-span').textContent = bestMountain.area;
        document.getElementById('result-difficulty').textContent = bestMountain.difficulty;
        const reason = userAnswers.tags.length > 0 ? `あなたが選んだ「${userAnswers.tags.join('」「')}」の条件にピッタリの山です！` : 'あなたのレベルと希望エリアから、この山をおすすめします！';
        document.getElementById('result-reason').textContent = reason;
    } else {
        document.getElementById('result-name').textContent = '残念！';
        document.getElementById('result-catchphrase').textContent = '条件に合う山が見つかりませんでした。';
        document.getElementById('result-reason').textContent = '条件を変えてもう一度試してみてください。';
        document.getElementById('result-image').src = 'https://via.placeholder.com/600x400.png?text=Not+Found';
    }
    questionsArea.classList.add('hidden');
    resultArea.classList.remove('hidden');
}

// 診断ロジック
function diagnose() {
    const difficultyLevels = userAnswers.difficulty.split(',');
    let candidates = allMountains.filter(mt => difficultyLevels.includes(mt.difficulty) && mt.area === userAnswers.area);
    if (candidates.length === 0) return null;
    if (userAnswers.tags.length > 0) {
        candidates.forEach(mt => {
            mt.score = 0;
            userAnswers.tags.forEach(tag => {
                if (mt.tags.includes(tag)) mt.score++;
            });
        });
        let scoredCandidates = candidates.filter(mt => mt.score > 0);
        if (scoredCandidates.length > 0) {
            scoredCandidates.sort((a, b) => b.score - a.score);
            const topScore = scoredCandidates[0].score;
            const topMountains = scoredCandidates.filter(mt => mt.score === topScore);
            return topMountains[Math.floor(Math.random() * topMountains.length)];
        }
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
}
