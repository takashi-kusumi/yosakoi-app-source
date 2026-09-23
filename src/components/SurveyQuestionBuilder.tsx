"use client";

import { useState } from "react";
import { SURVEY_QUESTION_TYPE_OPTIONS, type SurveyQuestionType } from "@/lib/labels";

type BuilderQuestion = {
  clientId: string;
  type: SurveyQuestionType;
  questionText: string;
  required: boolean;
  options: string[];
};

let clientIdSeq = 0;
function newClientId() {
  clientIdSeq += 1;
  return `q${Date.now()}_${clientIdSeq}`;
}

function emptyQuestion(): BuilderQuestion {
  return { clientId: newClientId(), type: "TEXT", questionText: "", required: true, options: [] };
}

export function SurveyQuestionBuilder({
  fieldName,
  initialQuestions,
}: {
  fieldName: string;
  initialQuestions?: {
    type: SurveyQuestionType;
    questionText: string;
    required: boolean;
    options: string[];
  }[];
}) {
  const [questions, setQuestions] = useState<BuilderQuestion[]>(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      return initialQuestions.map((q) => ({ ...q, clientId: newClientId() }));
    }
    return [emptyQuestion()];
  });

  function updateQuestion(clientId: string, patch: Partial<BuilderQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.clientId === clientId ? { ...q, ...patch } : q)));
  }

  function removeQuestion(clientId: string) {
    setQuestions((qs) => (qs.length <= 1 ? qs : qs.filter((q) => q.clientId !== clientId)));
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion()]);
  }

  function addOption(clientId: string) {
    setQuestions((qs) =>
      qs.map((q) => (q.clientId === clientId ? { ...q, options: [...q.options, ""] } : q))
    );
  }

  function updateOption(clientId: string, index: number, value: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.clientId === clientId
          ? { ...q, options: q.options.map((o, i) => (i === index ? value : o)) }
          : q
      )
    );
  }

  function removeOption(clientId: string, index: number) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.clientId === clientId ? { ...q, options: q.options.filter((_, i) => i !== index) } : q
      )
    );
  }

  const serialized = questions.map(({ clientId, ...rest }) => {
    void clientId;
    return rest;
  });

  return (
    <div className="space-y-3">
      <input type="hidden" name={fieldName} value={JSON.stringify(serialized)} readOnly />

      {questions.map((q, qIndex) => (
        <div key={q.clientId} className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-neutral-500">質問 {qIndex + 1}</p>
            {questions.length > 1 && (
              <button
                type="button"
                onClick={() => removeQuestion(q.clientId)}
                className="text-xs font-semibold text-red-500"
              >
                この質問を削除
              </button>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600">質問内容</label>
            <input
              type="text"
              value={q.questionText}
              onChange={(e) => updateQuestion(q.clientId, { questionText: e.target.value })}
              placeholder="例: 次回の練習、参加できますか？"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-neutral-600">回答形式</label>
              <select
                value={q.type}
                onChange={(e) =>
                  updateQuestion(q.clientId, {
                    type: e.target.value as SurveyQuestionType,
                    options: e.target.value === "TEXT" ? [] : q.options.length ? q.options : ["", ""],
                  })
                }
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                {SURVEY_QUESTION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex shrink-0 items-center gap-1.5 pt-4 text-xs text-neutral-600">
              <input
                type="checkbox"
                checked={q.required}
                onChange={(e) => updateQuestion(q.clientId, { required: e.target.checked })}
                className="h-4 w-4"
              />
              回答必須
            </label>
          </div>

          {q.type !== "TEXT" && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-600">選択肢</label>
              {q.options.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(q.clientId, optIndex, e.target.value)}
                    placeholder={`選択肢 ${optIndex + 1}`}
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                  {q.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(q.clientId, optIndex)}
                      className="shrink-0 text-xs font-semibold text-neutral-400"
                    >
                      削除
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addOption(q.clientId)}
                className="text-xs font-semibold text-orange-600"
              >
                ＋ 選択肢を追加
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="w-full rounded-xl border border-dashed border-orange-300 bg-orange-50 py-2.5 text-sm font-semibold text-orange-700"
      >
        ＋ 質問を追加
      </button>
    </div>
  );
}
