/*
 * ============================================================
 *  НАСТРОЙКИ САЙТА — редактируйте только этот файл
 * ============================================================
 *
 *  Как добавить презентацию:
 *   1. Положите файл в папку presentations/
 *      ВАЖНО: называйте файлы нейтрально (01.pdf, 02.webm, 03.pptx),
 *      а НЕ chatgpt.pdf — иначе имя файла выдаст ответ в просмотрщике.
 *   2. Добавьте/измените запись в списке works ниже.
 *
 *  format:  "pdf" | "pptx" | "webm"
 *  ai:      "chatgpt" | "notebooklm" | "claude"   (правильный ответ, скрыт до раскрытия)
 *  pdf:     (необязательно, только для pptx) PDF-копия той же презентации —
 *           будет показана, если онлайн-просмотр PowerPoint недоступен.
 *  prompt:  (необязательно) промпт, который вы использовали — показывается после раскрытия.
 *  notes:   (необязательно) ваши комментарии — показываются после раскрытия.
 */

window.SEMINAR = {
  title: "Создание наглядных учебных материалов с помощью искусственного интеллекта",
  subtitle: "Семинар для преподавателей: сравниваем ChatGPT, NotebookLM и Claude вслепую",
  author: "", // например: "Иванов И. И., кафедра ..."
  topic: "Одна и та же учебная тема — три нейросети — три формата",

  // Необязательно: ссылка на Google Form / Mentimeter для голосования с телефонов.
  // Если указать — на странице опроса появится QR-код.
  pollUrl: "",

  tools: [
    {
      id: "chatgpt",
      name: "ChatGPT",
      maker: "OpenAI",
      color: "#10a37f",
      strengths: [
        "Генерирует структуру и текст слайдов по короткому запросу",
        "Может собрать файл .pptx / .pdf и нарисовать иллюстрации",
        "Удобен для быстрых итераций «поправь слайд 3»"
      ],
      limits: [
        "Дизайн слайдов часто шаблонный",
        "Факты нужно проверять — возможны неточности"
      ]
    },
    {
      id: "notebooklm",
      name: "NotebookLM",
      maker: "Google",
      color: "#4285f4",
      strengths: [
        "Работает строго по загруженным источникам (учебник, лекция, статьи)",
        "Делает видеообзоры, аудиопересказы, слайды и карточки",
        "Даёт ссылки на источник для каждого утверждения"
      ],
      limits: [
        "Меньше контроля над дизайном и структурой",
        "Качество зависит от качества загруженных материалов"
      ]
    },
    {
      id: "claude",
      name: "Claude",
      maker: "Anthropic",
      color: "#d97757",
      strengths: [
        "Создаёт готовые файлы .pptx / .pdf и интерактивные HTML-материалы",
        "Хорошо держит структуру длинного учебного текста",
        "Точно следует подробным методическим требованиям"
      ],
      limits: [
        "Для видео нужны дополнительные инструменты",
        "Факты также требуют проверки преподавателем"
      ]
    }
  ],

  // Порядок специально перемешан, чтобы аудитория не угадала закономерность.
  works: [
    { id: "w1", title: "Работа 1", format: "pdf",  file: "presentations/01.pdf",  ai: "claude",     prompt: "", notes: "" },
    { id: "w2", title: "Работа 2", format: "webm", file: "presentations/02.webm", ai: "notebooklm", prompt: "", notes: "" },
    { id: "w3", title: "Работа 3", format: "pptx", file: "presentations/03.pptx", pdf: "presentations/03.pdf", ai: "chatgpt", prompt: "", notes: "" },
    { id: "w4", title: "Работа 4", format: "pdf",  file: "presentations/04.pdf",  ai: "notebooklm", prompt: "", notes: "" },
    { id: "w5", title: "Работа 5", format: "pptx", file: "presentations/05.pptx", pdf: "presentations/05.pdf", ai: "claude", prompt: "", notes: "" },
    { id: "w6", title: "Работа 6", format: "webm", file: "presentations/06.webm", ai: "chatgpt",    prompt: "", notes: "" },
    { id: "w7", title: "Работа 7", format: "pdf",  file: "presentations/07.pdf",  ai: "chatgpt",    prompt: "", notes: "" },
    { id: "w8", title: "Работа 8", format: "webm", file: "presentations/08.webm", ai: "claude",     prompt: "", notes: "" },
    { id: "w9", title: "Работа 9", format: "pptx", file: "presentations/09.pptx", pdf: "presentations/09.pdf", ai: "notebooklm", prompt: "", notes: "" }
  ]
};
