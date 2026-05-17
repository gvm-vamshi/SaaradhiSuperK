'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronRight, Search, Send } from 'lucide-react';
import { priorityColor, type Category, type KbEntry } from '@/lib/types';
import { createTicket } from '../actions';

function groupByCategory(cats: Category[]) {
  const map: Record<string, { items: Category[]; te: string | null }> = {};
  for (const c of cats) {
    if (!map[c.category]) map[c.category] = { items: [], te: c.category_te };
    map[c.category].items.push(c);
  }
  return map;
}

function searchKB(query: string, kb: KbEntry[]) {
  if (!query || query.trim().length < 3) return [];
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter(t => t.length > 2);
  return kb
    .map(item => {
      const hay = `${item.question} ${item.answer} ${item.keywords || ''} ${item.category} ${item.sub_category || ''} ${item.question_te || ''} ${item.answer_te || ''}`.toLowerCase();
      const score = tokens.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
      return { ...item, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

type Step = 'category' | 'subcategory' | 'describe' | 'suggestions';

export function NewTicketWizard({ categories, kb }: { categories: Category[]; kb: KbEntry[] }) {
  const grouped = useMemo(() => groupByCategory(categories), [categories]);
  const categoryNames = Object.keys(grouped);

  const [step, setStep]         = useState<Step>('category');
  const [category, setCategory] = useState('');
  const [sub, setSub]           = useState('');
  const [otherTitle, setOtherTitle] = useState('');
  const [desc, setDesc]         = useState('');
  const [expandedKb, setExpandedKb] = useState<number | null>(null);
  const [error, setError]       = useState('');
  const [isPending, startTransition] = useTransition();

  const isOther = sub === 'Other';
  const subRow = grouped[category]?.items.find(c => c.sub_category === sub);
  const effectivePriority = subRow?.default_priority ?? 'Medium';

  // Minimum description = 15 chars only when "Other" picked, else 1 char is enough
  const minDesc = isOther ? 15 : 1;
  const descOk = desc.trim().length >= minDesc;

  const searchQuery = `${category} ${sub} ${desc}`;
  const suggestions = useMemo(() => searchKB(searchQuery, kb), [searchQuery, kb]);

  const submit = () => {
    setError('');
    startTransition(async () => {
      const res = await createTicket({
        category,
        sub_category: sub,
        other_title: isOther ? otherTitle.trim() : null,
        description: desc.trim(),
      });
      if (res && 'error' in res) setError(res.error || 'Failed to create ticket.');
    });
  };

  const stepNum = { category: 1, subcategory: 2, describe: 3, suggestions: 4 }[step];

  return (
    <div>
      <Link href="/sp" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Back</Link>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-3xl">
        {/* Step progress */}
        <div className="flex items-center gap-2 mb-6">
          {['Category', 'Sub-category', 'Describe', 'Review'].map((label, i) => {
            const n = i + 1;
            const done = n < stepNum;
            const active = n === stepNum;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    done ? 'bg-red-600 text-white'
                         : active ? 'bg-red-100 text-red-700 border-2 border-red-600'
                                  : 'bg-slate-100 text-slate-400'
                  }`}>
                    {done ? <CheckCircle2 size={14}/> : n}
                  </div>
                  <div className={`text-xs font-medium ${active ? 'text-red-700' : done ? 'text-slate-700' : 'text-slate-400'}`}>{label}</div>
                </div>
                {n < 4 && <div className={`flex-1 h-px ${done ? 'bg-red-600' : 'bg-slate-200'}`}/>}
              </div>
            );
          })}
        </div>

        {/* STEP 1: Category */}
        {step === 'category' && (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">What&apos;s the issue?</h2>
            <p className="text-slate-500 mb-6 text-sm">ఏ సమస్య? Pick the area that best matches.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categoryNames.map(c => (
                <button key={c} type="button" onClick={() => { setCategory(c); setSub(''); setOtherTitle(''); setStep('subcategory'); }}
                  className={`p-4 border-2 rounded-xl text-left transition hover:border-red-500 hover:bg-red-50 ${category === c ? 'border-red-600 bg-red-50' : 'border-slate-200'}`}>
                  <div className="font-semibold text-slate-900">{c}</div>
                  {grouped[c].te && <div className="text-sm text-slate-600 mt-0.5">{grouped[c].te}</div>}
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 2: Sub-category */}
        {step === 'subcategory' && (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Pick a sub-category</h2>
            <p className="text-slate-500 mb-6 text-sm">Under <strong>{category}</strong>. If none fit, pick &quot;Other&quot;.</p>

            <div className="space-y-2 mb-4">
              {grouped[category].items.map(c => (
                <button key={c.id} type="button" onClick={() => setSub(c.sub_category)}
                  className={`w-full p-3 border-2 rounded-lg text-left transition hover:border-red-500 hover:bg-red-50 ${sub === c.sub_category ? 'border-red-600 bg-red-50' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-900">{c.sub_category}</span>
                      {c.sub_category_te && <span className="text-sm text-slate-600 ml-2">· {c.sub_category_te}</span>}
                    </div>
                    {sub === c.sub_category && <CheckCircle2 className="text-red-600" size={18}/>}
                  </div>
                </button>
              ))}
            </div>

            {isOther && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <label htmlFor="other-title" className="text-xs font-semibold text-amber-900 uppercase">
                  Brief title · చిన్న టైటిల్
                </label>
                <input
                  id="other-title"
                  value={otherTitle} onChange={e => setOtherTitle(e.target.value)} autoFocus
                  placeholder="e.g. Cold storage temperature alert"
                  className="w-full mt-1 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setStep('category')} className="text-sm text-slate-600 hover:text-slate-900 px-4 py-2">← Back</button>
              <button type="button" onClick={() => setStep('describe')} disabled={!sub || (isOther && !otherTitle.trim())}
                className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2">
                Continue <ChevronRight size={16}/>
              </button>
            </div>
          </>
        )}

        {/* STEP 3: Describe */}
        {step === 'describe' && (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Describe the issue</h2>
            <p className="text-slate-700 text-sm mb-1">సమస్య గురించి చెప్పండి</p>
            <p className="text-slate-500 mb-6 text-sm">
              <span className="text-red-700 font-medium">{category}</span> · <span className="text-red-700 font-medium">{isOther && otherTitle ? `Other: ${otherTitle}` : sub}</span>
            </p>

            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={6} autoFocus
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
              placeholder={isOther
                ? 'What exactly is happening? When did it start? Any details? · ఏం జరుగుతోంది? ఎప్పుడు మొదలైంది?'
                : 'Add any extra detail (optional). · అదనపు వివరాలు (ఐచ్ఛికం).'} />
            <div className="text-xs text-slate-500 mt-1">
              {isOther
                ? `${desc.length} characters · minimum 15 for "Other"`
                : `${desc.length} characters`}
            </div>

            <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setStep('subcategory')} className="text-sm text-slate-600 hover:text-slate-900 px-4 py-2">← Back</button>
              <button type="button" onClick={() => setStep('suggestions')} disabled={!descOk}
                className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2">
                <Search size={16}/> Check answers
              </button>
            </div>
          </>
        )}

        {/* STEP 4: Suggestions + submit */}
        {step === 'suggestions' && (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              {suggestions.length > 0 ? `${suggestions.length} possible answer${suggestions.length !== 1 ? 's' : ''}` : 'Ready to submit'}
            </h2>
            <p className="text-slate-500 mb-6 text-sm">
              {suggestions.length > 0
                ? 'Tap to expand. If one of these solves it, you don\'t need a ticket.'
                : 'No matches in our knowledge base — we\'ll route this to an agent.'}
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Your ticket</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Category:</span> <span className="font-medium">{category}</span></div>
                <div><span className="text-slate-500">Sub-category:</span> <span className="font-medium">{isOther && otherTitle ? `Other: ${otherTitle}` : sub}</span></div>
                <div><span className="text-slate-500">Priority:</span> <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(effectivePriority)}`}>{effectivePriority}</span></div>
              </div>
              {desc.trim() && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="text-xs text-slate-500 mb-1">Description</div>
                  <div className="text-sm text-slate-800 whitespace-pre-line">{desc}</div>
                </div>
              )}
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-3 mb-6">
                <div className="text-xs font-semibold text-slate-500 uppercase">Possible answers · సాధ్యమైన సమాధానాలు</div>
                {suggestions.map(s => (
                  <div key={s.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button type="button" onClick={() => setExpandedKb(expandedKb === s.id ? null : s.id)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 text-left">
                      <div>
                        <div className="text-xs text-red-700 font-medium">{s.category} · {s.sub_category}</div>
                        <div className="font-medium text-slate-900 mt-0.5">{s.question}</div>
                        {s.question_te && <div className="text-sm text-slate-600">{s.question_te}</div>}
                      </div>
                      <ChevronRight className={`text-slate-400 transition ${expandedKb === s.id ? 'rotate-90' : ''}`} size={20}/>
                    </button>
                    {expandedKb === s.id && (
                      <div className="px-4 py-4 bg-red-50 border-t border-red-200">
                        <div className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{s.answer}</div>
                        {s.answer_te && (
                          <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed mt-3 pt-3 border-t border-red-200">{s.answer_te}</div>
                        )}
                        <div className="mt-4 flex gap-2">
                          <Link href="/sp" className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2"><CheckCircle2 size={16}/> This solved it · పరిష్కారమైంది</Link>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {error && <div className="text-rose-600 text-sm bg-rose-50 p-2 rounded mb-4">{error}</div>}

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setStep('describe')} className="text-sm text-slate-600 hover:text-slate-900 px-4 py-2">← Edit</button>
              <button type="button" onClick={submit} disabled={isPending} className="bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2">
                <Send size={16}/> {isPending ? 'Submitting…' : 'Submit ticket · టికెట్ ఇవ్వండి'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}