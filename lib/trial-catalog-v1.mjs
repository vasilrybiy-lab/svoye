// New versioned contract for future submission; not a historical version claim.
export const trialCatalog = {
  "schema_version": "svoe-trial-reflection/v1",
  "question_version": "sha256:b41e97875491f66e398845353bd556b5b9e9a572b0775fdd6db6407f30fc16d3",
  "source_commit": "e51148d13fdc5cb7e6b68e7e693005512db6e69b",
  "tasks": {
    "phone-stand": {
      "id": "phone-stand",
      "category": "build",
      "title": "Підставка, яка тримає телефон",
      "task_version": "sha256:fea2d1b53e0fb7654376f81b490ed531e5703a804653ccdd896072ad14b19022"
    },
    "homework-product": {
      "id": "homework-product",
      "category": "build",
      "title": "Планер, яким захоче користуватися друг",
      "task_version": "sha256:ba4dc5ac8c294741f9f7a892e6af9c071234cae93c4778a78e663aa5c3423358"
    },
    "bag-algorithm": {
      "id": "bag-algorithm",
      "category": "build",
      "title": "Алгоритм «Що взяти завтра?»",
      "task_version": "sha256:62ed41891ba2b66b2d4deda5585d18552317274517329ca7e0f4b33e7dece6bb"
    },
    "event-investigation": {
      "id": "event-investigation",
      "category": "investigate",
      "title": "Чому команда запізнилася?",
      "task_version": "sha256:e5630e11a59b6b66fb87b62c8f511722b9f78f4428710a4dfe0f7bf48417251d"
    },
    "message-check": {
      "id": "message-check",
      "category": "investigate",
      "title": "Якому повідомленню можна довіряти?",
      "task_version": "sha256:acd1d025025b1fde17a186db31e42ab1df662960423a1fa2a905bcf220a939bc"
    },
    "list-research": {
      "id": "list-research",
      "category": "investigate",
      "title": "Чи допомагає порядок швидше знаходити речі?",
      "task_version": "sha256:4510d3276b5dc961a89c53a1ec01a9dde076fc4517ce49d57e01a3c775c05621"
    },
    "explain-example": {
      "id": "explain-example",
      "category": "explain",
      "title": "Поясни так, щоб інший зміг повторити",
      "task_version": "sha256:26d13ae1eb8e935d24a61e5215a552e9625552d8210f0d6a19eee9acd1657a99"
    },
    "clear-invitation": {
      "id": "clear-invitation",
      "category": "explain",
      "title": "Запрошення, яке зрозуміють з першого разу",
      "task_version": "sha256:eb858d6d27d48621f4d6292b5729b2bb6acd53da5dc2de38f078afcb4520f7f8"
    },
    "first-club-step": {
      "id": "first-club-step",
      "category": "explain",
      "title": "Допоможи новачку зробити перший крок",
      "task_version": "sha256:175ffd79ecc40c61a4d7a5fae175c2e616de9cb065b34c4292751862277322a2"
    }
  },
  "questions": {
    "interest": {
      "investigate": [
        {
          "id": "reason",
          "label": "Знаходити причини"
        },
        {
          "id": "test",
          "label": "Перевіряти й покращувати"
        },
        {
          "id": "idea",
          "label": "Придумувати рішення"
        }
      ],
      "build": [
        {
          "id": "idea",
          "label": "Придумувати рішення"
        },
        {
          "id": "make",
          "label": "Робити своїми руками"
        },
        {
          "id": "test",
          "label": "Перевіряти й покращувати"
        }
      ],
      "explain": [
        {
          "id": "people",
          "label": "Розуміти іншу людину"
        },
        {
          "id": "idea",
          "label": "Шукати зрозумілі слова"
        },
        {
          "id": "test",
          "label": "Перевіряти, чи зрозуміло"
        }
      ]
    },
    "difficulty": [
      {
        "id": "persist",
        "label": "Хотілося розібратися"
      },
      {
        "id": "help",
        "label": "Хотілося підказки"
      },
      {
        "id": "bored",
        "label": "Було нудно"
      }
    ],
    "continuation": [
      {
        "id": "repeat",
        "label": "Хочеться повторити подібну пробу"
      },
      {
        "id": "different",
        "label": "Цікаво спробувати інший напрям"
      }
    ]
  },
  "rating_labels": [
    "Зовсім ні",
    "Трохи",
    "Помірно",
    "Сильно",
    "Дуже сильно"
  ],
  "category_labels": {
    "investigate": "Досліджувати",
    "build": "Створювати",
    "explain": "Допомагати"
  }
};
