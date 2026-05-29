function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.focus();
}

document.addEventListener('DOMContentLoaded', () => {
  const titleInput = document.getElementById('title');
  const slugDisplay = document.getElementById('slug-display');
  const contentTypeRadios = document.querySelectorAll('input[name="content_type"]');
  const editorHint = document.getElementById('editor-mode-hint');

  const hints = {
    markdown: '마크다운 형식으로 작성합니다.',
    html: 'HTML 형식으로 작성합니다.',
  };

  function updateHint() {
    const selected = document.querySelector('input[name="content_type"]:checked');
    if (selected && editorHint) {
      editorHint.textContent = hints[selected.value] || '';
    }
  }

  contentTypeRadios.forEach(radio => radio.addEventListener('change', updateHint));
  updateHint();

  function toSlug(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Image upload
  const imgBtn = document.getElementById('img-upload-btn');
  const imgInput = document.getElementById('img-file-input');
  const imgStatus = document.getElementById('img-upload-status');
  const contentArea = document.getElementById('content');

  if (imgBtn && imgInput && contentArea) {
    imgBtn.addEventListener('click', () => imgInput.click());

    imgInput.addEventListener('change', async () => {
      const file = imgInput.files[0];
      if (!file) return;

      imgBtn.disabled = true;
      imgStatus.textContent = '업로드 중...';

      const formData = new FormData();
      formData.append('image', file);

      try {
        const res = await fetch('/admin/api/upload/image', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '업로드 실패');

        const contentType = document.querySelector('input[name="content_type"]:checked')?.value;
        const tag = contentType === 'html'
          ? `<img src="${data.url}" alt="${file.name}">`
          : `![${file.name}](${data.url})`;

        insertAtCursor(contentArea, tag);
        imgStatus.textContent = '업로드 완료!';
        setTimeout(() => { imgStatus.textContent = ''; }, 2000);
      } catch (err) {
        imgStatus.textContent = `오류: ${err.message}`;
      } finally {
        imgBtn.disabled = false;
        imgInput.value = '';
      }
    });
  }

  // Only auto-fill slug if post is new (slug display is empty)
  const isNew = document.getElementById('post-form')?.dataset.mode !== 'edit';

  if (titleInput && slugDisplay && isNew) {
    titleInput.addEventListener('input', () => {
      slugDisplay.value = toSlug(titleInput.value);
    });
  }
});
