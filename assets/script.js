class SLink {
    constructor() {
        this.form = document.getElementById('shortenForm');
        this.originalUrl = document.getElementById('originalUrl');
        this.customSlug = document.getElementById('customSlug');
        this.shortenBtn = document.getElementById('shortenBtn');
        this.btnText = document.querySelector('.btn-text');
        this.loading = document.querySelector('.loading');
        this.result = document.getElementById('result');
        this.shortUrl = document.getElementById('shortUrl');
        this.originalUrlDisplay = document.getElementById('originalUrlDisplay');
        this.createdTime = document.getElementById('createdTime');
        this.copyBtn = document.getElementById('copyBtn');
        this.error = document.getElementById('error');

        // 便签功能元素
        this.noteForm = document.getElementById('noteForm');
        this.noteTitle = document.getElementById('noteTitle');
        this.noteContent = document.getElementById('noteContent');
        this.noteBtn = document.getElementById('noteBtn');
        
        // 选项卡元素
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');

        this.init();
    }

    init() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        this.copyBtn.addEventListener('click', this.copyToClipboard.bind(this));
        
        // 便签功能事件监听
        this.noteForm.addEventListener('submit', this.handleNoteSubmit.bind(this));
        
        // 选项卡切换事件监听
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', this.switchTab.bind(this));
        });
    }

    switchTab(e) {
        const targetTab = e.target.dataset.tab;
        
        // 更新选项卡按钮状态
        this.tabBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        // 更新选项卡内容
        this.tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(`${targetTab}-tab`).classList.add('active');
        
        // 隐藏结果和错误
        this.hideResult();
        this.hideError();
    }

    async handleNoteSubmit(e) {
        e.preventDefault();
        
        const title = this.noteTitle.value.trim();
        const content = this.noteContent.value.trim();

        if (!content) {
            this.showError('便签内容不能为空');
            return;
        }

        this.setNoteLoading(true);
        this.hideError();
        this.hideResult();

        try {
            const response = await fetch('/note', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: title,
                    content: content
                })
            });

            const responseText = await response.text();
            if (!responseText) {
                throw new Error('服务器响应为空');
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                throw new Error('服务器响应格式错误');
            }

            if (!response.ok) {
                throw new Error(data.error || '创建便签失败');
            }

            this.showNoteResult(data);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.setNoteLoading(false);
        }
    }

    setNoteLoading(loading) {
        this.noteBtn.disabled = loading;
        const btnText = this.noteBtn.querySelector('.btn-text');
        const loadingText = this.noteBtn.querySelector('.loading');
        btnText.style.display = loading ? 'none' : 'inline';
        loadingText.style.display = loading ? 'inline' : 'none';
    }

    showNoteResult(data) {
        this.shortUrl.value = `${window.location.origin}/${data.slug}`;
        this.originalUrlDisplay.textContent = data.title || '便签预览';
        this.createdTime.textContent = new Date(data.createdAt).toLocaleString('zh-CN');
        this.result.style.display = 'block';
        this.result.scrollIntoView({ behavior: 'smooth' });
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const url = this.originalUrl.value.trim();
        const slug = this.customSlug.value.trim();

        if (!this.isValidUrl(url)) {
            this.showError('请输入有效的网址');
            return;
        }

        this.setLoading(true);
        this.hideError();
        this.hideResult();

        try {
            const response = await fetch('/shorten', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url,
                    customSlug: slug || undefined
                })
            });

            // 检查响应是否有内容
            const responseText = await response.text();
            if (!responseText) {
                throw new Error('服务器响应为空');
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                throw new Error('服务器响应格式错误');
            }

            if (!response.ok) {
                throw new Error(data.error || '生成短链失败');
            }

            this.showResult(data);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.setLoading(false);
        }
    }

    isValidUrl(string) {
        if (!string || string.length === 0) {
            return false;
        }
        
        // 规范化URL：如果没有协议，自动添加https://（与后端逻辑保持一致）
        let normalizedUrl = string.trim();
        if (!/^https?:\/\//i.test(normalizedUrl)) {
            normalizedUrl = 'https://' + normalizedUrl;
        }
        
        // 使用浏览器原生URL构造函数验证
        try {
            new URL(normalizedUrl);
            return true;
        } catch {
            return false;
        }
    }

    setLoading(loading) {
        this.shortenBtn.disabled = loading;
        this.btnText.style.display = loading ? 'none' : 'inline';
        this.loading.style.display = loading ? 'inline' : 'none';
    }

    showResult(data) {
        this.shortUrl.value = `${window.location.origin}/${data.slug}`;
        this.originalUrlDisplay.textContent = data.originalUrl;
        this.createdTime.textContent = new Date(data.createdAt).toLocaleString('zh-CN');
        this.result.style.display = 'block';
        this.result.scrollIntoView({ behavior: 'smooth' });
    }

    hideResult() {
        this.result.style.display = 'none';
    }

    showError(message) {
        this.error.textContent = message;
        this.error.style.display = 'block';
        this.error.scrollIntoView({ behavior: 'smooth' });
    }

    hideError() {
        this.error.style.display = 'none';
    }

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.shortUrl.value);
            
            const originalText = this.copyBtn.textContent;
            this.copyBtn.textContent = '已复制!';
            this.copyBtn.classList.add('copied');
            
            setTimeout(() => {
                this.copyBtn.textContent = originalText;
                this.copyBtn.classList.remove('copied');
            }, 2000);
        } catch (error) {
            // 如果clipboard API不可用，使用传统方法
            this.shortUrl.select();
            document.execCommand('copy');
            
            const originalText = this.copyBtn.textContent;
            this.copyBtn.textContent = '已复制!';
            this.copyBtn.classList.add('copied');
            
            setTimeout(() => {
                this.copyBtn.textContent = originalText;
                this.copyBtn.classList.remove('copied');
            }, 2000);
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new SLink();
});