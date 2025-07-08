// ===================================================
// アプリケーションのメインロジック
// ===================================================

// --- グローバル変数と定数 ---
let allMountains = []; // 読み込んだ山の全データをここに入れる
const userAnswers = {
    difficulty: null,
    area: null,
    tags: []
};
const TAGS = ["景色・眺望", "高山植物", "アクセス", "温泉", "岩場・鎖場", "歴史・信仰"];
let currentQuestionIndex = 0;

// --- DOM要素の取得 ---
const titleArea = document.getElementById('title-area');
const questionsArea = document.getElementById('questions-area');
const resultArea = document.getElementById('result-area');
const questions = document.querySelectorAll('.question');
const tagsContainer = document.getElementById('tags-container');
const submitBtn = document.getElementById('submit-btn');

// ===================================================
// 初期化処理
// ===================================================

// ページの読み込みが完了したら、最初にこの関数が実行される
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 外部のJSONファイルを読み込む（非同期処理）
        const response = await fetch('./mountains.json');
        if (!response.ok) {
            throw new Error('データの読み込みに失敗しました。');
        }
        allMountains = await response.json();
        
        // データの準備ができたので、アプリの初期設定を行う
        initializeApp();
    } catch (error) {
        console.error(error);
        questionsArea.innerHTML = '<p>エラーが発生しました。ページを再読み込みしてください。</p>';
    }
});

// アプリの初期設定（イベントリスナーなど）
function initializeApp() {
    // Q3のタグボタンを動的に生成
    TAGS.forEach(tag => {
        const button = document.createElement('button');
        button.className = 'tag-option';
        button.textContent = tag;
        button.dataset.tag = tag;
        tagsContainer.appendChild(button);
    });

    // --- イベントリスナーの設定 ---
    document.getElementById('start-btn').addEventListener('click', startDiagnosis);
    document.getElementById('retry-btn').addEventListener('click', resetDiagnosis);
    submitBtn.addEventListener('click', showResult);

    // Q1, Q2の選択肢ボタン
    document.querySelectorAll('.option').forEach(btn => {
        btn.addEventListener('click', (e) => handleOptionClick(e, false));
    });

    // Q3のタグ選択ボタン
    document.querySelectorAll('.tag-option').forEach(btn => {
        btn.addEventListener('click', (e) => handleOptionClick(e, true));
    });
}


// ===================================================
// 画面遷移とイベントハンドラ
// ===================================================

// 「診断をはじめる」ボタン
function startDiagnosis() {
    titleArea.classList.add('hidden');
    questionsArea.classList.remove('hidden');
    questions[0].classList.remove('hidden');
}

// 選択肢ボタンがクリックされたときの処理
function handleOptionClick(event, isMultipleChoice) {
    const button = event.target;
    
    if (isMultipleChoice) { // Q3: 複数選択の場合
        const tag = button.dataset.tag;
        button.classList.toggle('selected');
        if (userAnswers.tags.includes(tag)) {
            userAnswers.tags = userAnswers.tags.filter(t => t !== tag);
        } else {
            userAnswers.tags.push(tag);
        }
        // 1つ以上選択されたら診断ボタンを有効化
        submitBtn.disabled = userAnswers.tags.length === 0;

    } else { // Q1, Q2: 単一選択の場合
        const questionType = button.dataset.q;
        const value = button.dataset.v;
        userAnswers[questionType] = value;
        
        // 次の質問へ
        moveToNextQuestion();
    }
}

// 次の質問を表示する
function moveToNextQuestion() {
    questions[currentQuestionIndex].classList.add('hidden');
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        questions[currentQuestionIndex].classList.remove('hidden');
    }
}

// 「もう一度診断する」ボタン
function resetDiagnosis() {
    // 回答をリセット
    userAnswers.difficulty = null;
    userAnswers.area = null;
    userAnswers.tags = [];
    currentQuestionIndex = 0;
    
    // 画面を初期状態に戻す
    document.querySelectorAll('.tag-option.selected').forEach(btn => btn.classList.remove('selected'));
    submitBtn.disabled = true;
    
    resultArea.classList.add('hidden');
    questions.forEach(q => q.classList.add('hidden'));
    
    titleArea.classList.remove('hidden');
}


// ===================================================
// 診断ロジックと結果表示
// ===================================================

// 診断を実行して結果を表示する
function showResult() {
    const bestMountain = diagnose();
    
    if (bestMountain) {
        // 結果カードに情報をセット
        document.getElementById('result-image').src = bestMountain.imageUrl;
        document.getElementById('result-image').alt = bestMountain.name;
        document.getElementById('result-name').textContent = `【${bestMountain.name}】`;
        document.getElementById('result-catchphrase').textContent = bestMountain.catchphrase;
        document.getElementById('result-area-span').textContent = bestMountain.area;
        document.getElementById('result-difficulty').textContent = bestMountain.difficulty;
        
        // おすすめ理由を生成
        const reason = userAnswers.tags.length > 0
            ? `あなたが選んだ「${userAnswers.tags.join('」「')}」の条件にピッタリの山です！`
            : 'あなたのレベルと希望エリアから、この山をおすすめします！';
        document.getElementById('result-reason').textContent = reason;

    } else {
        // 該当する山がなかった場合
        document.getElementById('result-name').textContent = '残念！';
        document.getElementById('result-image').src = 'https://via.placeholder.com/600x400.png?text=Not+Found';
        document.getElementById('result-catchphrase').textContent = '条件に合う山が見つかりませんでした。';
        document.getElementById('result-reason').textContent = '条件を変えてもう一度試してみてください。';
    }
    
    questionsArea.classList.add('hidden');
    resultArea.classList.remove('hidden');
}


// 診断のコアロジック
function diagnose() {
    // 1. 難易度で絞り込み
    const difficultyLevels = userAnswers.difficulty.split(',');
    let candidates = allMountains.filter(mt => difficultyLevels.includes(mt.difficulty));

    // 2. エリアで絞り込み
    candidates = candidates.filter(mt => mt.area === userAnswers.area);
    
    if (candidates.length === 0) return null; // この時点で候補がなければ終了

    // 3. こだわりポイントでスコアリング
    if (userAnswers.tags.length > 0) {
        candidates.forEach(mt => {
            mt.score = 0;
            userAnswers.tags.forEach(tag => {
                if (mt.tags.includes(tag)) {
                    mt.score++;
                }
            });
        });

        // スコアが1以上のものだけを候補に残す
        let scoredCandidates = candidates.filter(mt => mt.score > 0);
        if (scoredCandidates.length > 0) {
             // スコアで降順ソート
            scoredCandidates.sort((a, b) => b.score - a.score);
            const topScore = scoredCandidates[0].score;
            const topMountains = scoredCandidates.filter(mt => mt.score === topScore);
            // 最高得点の山の中からランダムで1つ選んで返す
            return topMountains[Math.floor(Math.random() * topMountains.length)];
        }
    }
    
    // タグに合致するものが一つもなかった場合、またはタグが選択されなかった場合は
    // 難易度とエリアで絞り込んだ候補からランダムで1つ返す
    return candidates[Math.floor(Math.random() * candidates.length)];
}