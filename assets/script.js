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

        this.init();
    }

    init() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        this.copyBtn.addEventListener('click', this.copyToClipboard.bind(this));
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