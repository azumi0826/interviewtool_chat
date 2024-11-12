class InterviewManager {
    constructor() {
        this.questions = [
            "{service_name}以外の電子書籍サービスや雑誌アプリを利用したことがありますか？それらのどの点が魅力的でしたか？",
            "{service_name}について、どのように知りましたか？その際、どのような印象を持ちましたか？",
            "{service_name}に入会することを考えた場合、どのような要素が入会の決め手になると思いますか？",
            "他の電子書籍サービスをどのくらいの頻度で利用していますか？その理由は何ですか？",
            "電子書籍や雑誌アプリを利用する際、どのようなシチュエーションで使いたいと思いますか？",
            "最近、特に注目している雑誌やコンテンツジャンルはありますか？その理由は何ですか？",
            "競合サービスを利用している友人や家族の意見を聞いたことがありますか？そのフィードバックはどのようなものでしたか？",
            "自分が興味を持つ分野で、どのような情報源から電子書籍や雑誌のサービスを見つけますか？",
            "{service_name}に入会する際、懸念や不安を感じる点はありますか？それに対する解決策があれば教えてください。"
        ];
        this.currentQuestion = 0;
        this.followUpCount = 0;
        this.lastResponse = "";
        this.isInterviewStarted = false;
        this.conversationHistory = [];
        this.isTransitioning = false;
        this.waitingForAnswer = false;

        this.initializeEventListeners();
    }

    async callGPT4(userInput) {
        try {
            if (this.followUpCount > 2) {
                return;
            }

            this.conversationHistory.push({ role: 'user', content: userInput });
            const systemPrompt = `あなたは熟練したインタビュアーです。これは${this.followUpCount}回目のフォローアップです。
                ${this.followUpCount === 1 || this.followUpCount === 2 ? 
                '回答の具体性を評価し、より詳しい情報を引き出すための質問を1つだけ簡潔に行ってください。' : 
                '初回の質問です。回答を確認してください。'}
                前回の回答：「${this.lastResponse}」`;

            const response = await $.ajax({
                url: CONFIG.API_ENDPOINT,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.API_KEY}`
                },
                data: JSON.stringify({
                    model: CONFIG.MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...this.conversationHistory
                    ],
                    max_tokens: 200,
                    temperature: 0.7
                })
            });

            this.conversationHistory.push({
                role: 'assistant',
                content: response.choices[0].message.content
            });
            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error:', error);
            return "申し訳ありません。エラーが発生しました。";
        }
    }

    addMessage(message, isUser) {
        const messageDiv = $('<div></div>')
            .addClass('message')
            .addClass(isUser ? 'user' : 'interviewer')
            .text(message);
        $('#chat-box').append(messageDiv);
        $('#chat-box').scrollTop($('#chat-box')[0].scrollHeight);
    }

    showQuestionNumber() {
        if (this.currentQuestion < this.questions.length) {
            this.addMessage(this.questions[this.currentQuestion], false);
        }
    }

    async handleResponse(response) {
        if (this.isTransitioning) return;

        let cleanResponse = response.trim();
        this.lastResponse = cleanResponse;
        
        // フォローアップ質問の場合のみ応答を表示
        if (this.followUpCount < 2) {
            this.addMessage(cleanResponse, false);
        }

        this.followUpCount++;

        if (this.followUpCount < 2) {
            this.enableInput();
        } else if (this.followUpCount === 2) {
            this.waitingForAnswer = true;
            this.enableInput();
        } else if (this.waitingForAnswer) {
            this.waitingForAnswer = false;
            await this.transitionToNextQuestion();
        }
    }

    async transitionToNextQuestion() {
        this.isTransitioning = true;
        this.followUpCount = 0;
        this.currentQuestion++;
        this.conversationHistory = [];
    
        if (this.currentQuestion < this.questions.length) {
            await new Promise(resolve => {
                setTimeout(() => {
                    this.addMessage("貴重なご意見ありがとうございます。それでは次の質問に進ませていただきます。", false);
                    setTimeout(() => {
                        this.isTransitioning = false;
                        this.askNextQuestion();
                        resolve();
                    }, 1500);
                }, 1000);
            });
        } else {
            this.addMessage("インタビューにご協力いただき、誠にありがとうございました。", false);
            this.disableInput();
            $('#start-interview').text('インタビュー終了').prop('disabled', true);
        }
    }
    
    askNextQuestion() {
        setTimeout(() => {
            this.showQuestionNumber();
            this.enableInput();
        }, 500);
    }

    startInterview() {
        if (!this.isInterviewStarted) {
            this.isInterviewStarted = true;
            this.addMessage("本日は、{service_name}に関するインタビューにご協力いただき、ありがとうございます。できるだけリラックスしてお答えください。", false);
            setTimeout(() => {
                this.askNextQuestion();
            }, 1500);
        }
    }

    enableInput() {
        $('#user-input').prop('disabled', false).focus();
        $('#send').prop('disabled', false);
    }

    disableInput() {
        $('#user-input').prop('disabled', true);
        $('#send').prop('disabled', true);
    }

    initializeEventListeners() {
        $('#start-interview').click(() => {
            $('#start-interview').prop('disabled', true);
            this.startInterview();
        });
    
        $('#send').click(async () => {
            const userInput = $('#user-input').val().trim();
            if (userInput && !this.isTransitioning) {
                this.addMessage(userInput, true);
                this.disableInput();
                $('#user-input').val('');

                const response = await this.callGPT4(userInput);
                await this.handleResponse(response);
            }
        });

        $('#user-input').keypress((e) => {
            if (e.which == 13 && !$('#send').prop('disabled')) {
                $('#send').click();
            }
        });
    }
}