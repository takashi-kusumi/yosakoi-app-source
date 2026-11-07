"use client";

import { useState } from "react";
import { SurveyQuestionBuilder } from "@/components/SurveyQuestionBuilder";
import type { SurveyQuestionType } from "@/lib/labels";

export function SurveyForm({
  action,
  submitLabel,
  defaultValues,
  initialQuestions,
  hasExistingResponses,
}: {
  action: string;
  submitLabel: string;
  defaultValues?: {
    title?: string;
    description?: string;
    closesAtLocal?: string;
  };
  initialQuestions?: {
    type: SurveyQuestionType;
    questionText: string;
    required: boolean;
    options: string[];
  }[];
  hasExistingResponses?: boolean;
}) {
  const [clientError, setClientError] = useState<string | null>(null);

  // サーバー側のバリデーション（質問内容）でエラーになると、送信済みフォームは
  // 破棄されて質問の入力内容がすべて消えてしまう。これを防ぐため、送信前にここで同じ内容を
  // チェックし、問題があればブラウザ側で止める（=ページ遷移が起きないので入力内容は消えない）。
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(e.currentTarget);
    const questionsJson = String(data.get("questionsJson") || "[]");
    let questions: { type: string; questionText: string; options: string[] }[];
    try {
      questions = JSON.parse(questionsJson);
    } catch {
      e.preventDefault();
      setClientError("質問の内容が不正です");
      return;
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      e.preventDefault();
      setClientError("質問を1つ以上追加してください");
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        e.preventDefault();
        setClientError(`質問${i + 1}: 質問内容を入力してください`);
        return;
      }
      if (q.type !== "TEXT") {
        const nonEmpty = q.options.filter((o) => o.trim());
        if (nonEmpty.length < 2) {
          e.preventDefault();
          setClientError(`質問${i + 1}: 選択肢を2つ以上入力してください`);
          return;
        }
      }
    }
    setClientError(null);
  }

  return (
    <form action={action} method="POST" className="space-y-4" onSubmit={handleSubmit}>
      {hasExistingResponses && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          ⚠️ すでに回答が集まっています。ここで質問内容を保存すると、これまでの回答はすべて削除されます。
        </p>
      )}
      {clientError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {clientError}
        </p>
      )}

      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">タイトル</label>
          <input
            type="text"
            name="title"
            required
            defaultValue={defaultValues?.title ?? ""}
            placeholder="例: 次回の練習メニューについてのアンケート"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">説明（任意）</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={defaultValues?.description ?? ""}
            placeholder="アンケートの目的や補足事項など"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">
            回答締切（任意）
          </label>
          <input
            type="datetime-local"
            name="closesAt"
            defaultValue={defaultValues?.closesAtLocal ?? ""}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
          <p className="mt-1 text-[11px] text-neutral-400">
            設定すると、この日時を過ぎた回答は自動的に受け付けなくなります（「締め切る」を手動で押す必要はありません）。
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-700">質問</p>
        <SurveyQuestionBuilder fieldName="questionsJson" initialQuestions={initialQuestions} />
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white"
      >
        {submitLabel}
      </button>
    </form>
  );
}
