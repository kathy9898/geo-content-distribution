export function openGzhStandalonePreview(html: string, title = '公众号排版预览') {
  const previewWindow = window.open('', '_blank');
  if (!previewWindow) return false;

  previewWindow.document.open();
  previewWindow.document.write(buildGzhStandalonePreviewHtml(html, title));
  previewWindow.document.close();
  return true;
}

export function buildGzhStandalonePreviewHtml(html: string, title = '公众号排版预览') {
  const clipboardHtml = JSON.stringify(html);
  const pageTitle = escapeHtml(title);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${pageTitle}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f2f3f5;
      color: #1f2329;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    }
    .toolbar {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 10;
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .copy-button {
      border: 0;
      border-radius: 6px;
      padding: 9px 14px;
      background: #1f2329;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0,0,0,.14);
    }
    .copy-button:active { transform: translateY(1px); }
    .shell {
      width: min(100%, 760px);
      margin: 0 auto;
      padding: 32px 16px 48px;
    }
    .article {
      width: min(100%, 677px);
      margin: 0 auto;
      background: #fff;
      min-height: 100vh;
      overflow: hidden;
    }
    .toast {
      display: none;
      color: #1f7a3f;
      background: #ecfdf3;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 7px 10px;
      font-size: 13px;
      box-shadow: 0 8px 24px rgba(0,0,0,.08);
    }
    .toast.show { display: block; }
    @media (max-width: 720px) {
      .toolbar { top: 10px; right: 10px; }
      .shell { padding: 56px 0 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span id="toast" class="toast">已复制</span>
    <button id="copyButton" class="copy-button" type="button">复制到公众号</button>
  </div>
  <main class="shell">
    <article id="copy-source" class="article">${html}</article>
  </main>
  <script>
    const sourceHtml = ${clipboardHtml};
    const button = document.getElementById('copyButton');
    const toast = document.getElementById('toast');

    async function copyHtml() {
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/html': new Blob([sourceHtml], { type: 'text/html' }),
              'text/plain': new Blob([sourceHtml], { type: 'text/plain' })
            })
          ]);
        } else {
          const range = document.createRange();
          range.selectNodeContents(document.getElementById('copy-source'));
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          document.execCommand('copy');
          selection.removeAllRanges();
        }
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1800);
      } catch (error) {
        button.textContent = '复制失败，请手动全选';
        setTimeout(() => { button.textContent = '复制到公众号'; }, 2200);
      }
    }

    button.addEventListener('click', copyHtml);
  </script>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
