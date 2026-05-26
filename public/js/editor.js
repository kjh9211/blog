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

  // Only auto-fill slug if post is new (slug display is empty)
  const isNew = slugDisplay && slugDisplay.value === '';

  if (titleInput && slugDisplay && isNew) {
    titleInput.addEventListener('input', () => {
      slugDisplay.value = toSlug(titleInput.value);
    });
  }
});
