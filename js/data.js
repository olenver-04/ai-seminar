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
  subtitle: "Учебная тема «Циклы в Java»: 9 материалов от ChatGPT, NotebookLM и Claude. Угадайте, кто что сделал.",
  author: "", // например: "Иванов И. И., кафедра ..."
  topic: "Циклы в Java · 3 нейросети × 3 формата (PDF, PowerPoint, видео)",

  // Голосование с телефонов по QR-коду (бесплатная база Firebase Realtime Database).
  // Как получить эти значения — раздел «Голосование с телефонов» в README.
  // Пока databaseURL пустой, голосование с телефонов выключено, а голоса руками работают.
  firebase: {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    appId: ""
  },
  // Название сессии: для новой группы слушателей поменяйте (например "java-loops-2"),
  // и голоса начнутся с нуля, а старые сохранятся в базе.
  session: "java-loops",

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

  // Тема у всех работ одна — «Циклы в Java». У каждого ИИ по 3 работы: PDF, PowerPoint, видео.
  // Порядок специально перемешан, чтобы аудитория не угадала закономерность.
  //
  //   Файл                     ИИ            Формат
  //   01.pdf                   Claude        PDF
  //   02.webm                  NotebookLM    видео
  //   03.pptx (+03.pdf)        ChatGPT       PowerPoint
  //   04.pdf                   NotebookLM    PDF
  //   05.pptx (+05.pdf)        Claude        PowerPoint
  //   06.webm                  ChatGPT       видео
  //   07.pdf                   ChatGPT       PDF
  //   08.webm                  Claude        видео
  //   09.pptx (+09.pdf)        NotebookLM    PowerPoint
  //
  // В поле prompt можно вписать промпт, который вы давали ИИ (покажется после раскрытия ответа).
  works: [
    { id: "w1", title: "Циклы в Java · Работа 1", format: "pdf",  file: "presentations/01.pdf",  ai: "claude",     prompt: "", notes: "" },
    { id: "w2", title: "Циклы в Java · Работа 2", format: "webm", file: "presentations/02.webm", ai: "notebooklm", prompt: "", notes: "" },
    { id: "w3", title: "Циклы в Java · Работа 3", format: "pptx", file: "presentations/03.pptx", pdf: "presentations/03.pdf", ai: "chatgpt", prompt: "", notes: "" },
    { id: "w4", title: "Циклы в Java · Работа 4", format: "pdf",  file: "presentations/04.pdf",  ai: "notebooklm", prompt: "", notes: "" },
    { id: "w5", title: "Циклы в Java · Работа 5", format: "pptx", file: "presentations/05.pptx", pdf: "presentations/05.pdf", ai: "claude", prompt: "", notes: "" },
    { id: "w6", title: "Циклы в Java · Работа 6", format: "webm", file: "presentations/06.webm", ai: "chatgpt",    prompt: "", notes: "" },
    { id: "w7", title: "Циклы в Java · Работа 7", format: "pdf",  file: "presentations/07.pdf",  ai: "chatgpt",    prompt: "", notes: "" },
    { id: "w8", title: "Циклы в Java · Работа 8", format: "webm", file: "presentations/08.webm", ai: "claude",     prompt: "", notes: "" },
    { id: "w9", title: "Циклы в Java · Работа 9", format: "pptx", file: "presentations/09.pptx", pdf: "presentations/09.pdf", ai: "notebooklm", prompt: "", notes: "" }
  ]
};
