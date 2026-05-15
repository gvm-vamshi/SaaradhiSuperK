'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronRight, Search, Send } from 'lucide-react';
import { priorityColor, type Category, type KbEntry } from '@/lib/types';
import { createTicket } from '../actions';

// Group categories by parent category for the UI
function groupByCategory(cats: Category[]) {
  const map: Record<string, Category[]> = {};
  for (const c of cats) {
    if (!map[c.category]) map[c.category] = [];
    map[c.category].push(c);
  }
  return map;
}

// Token-based KB search (same idea as before, runs client-side over the seeded list)
function searchKB(query: string, kb: KbEntry[]) {
  if (!query || query.trim().length < 3) return [];
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter(t => t.length > 2);
  return kb
    .map(item => {
      const hay = `${item.question} ${item.answer} ${item.keywords || ''} ${item.category} ${item.sub_category || ''}`.toLowerCase();
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
  const subRow = grouped[category]?.find(c => c.sub_category === sub);
  const effectivePriority = subRow?.default_priority ?? 'Medium';
  const effectiveTeam = subRow?.routed_to_team ?? 'ASM';

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

  // Step progress indicator
  const stepNum = { category: 1, subcategory: 2, describe: 3, suggestions: 4 }[step];

  return (
    <div>
      <Link href="/sp" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Back</Link>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-3xl">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {['Category', 'Sub-category', 'Describe', 'Review'].map((label, i) => {
            const n = i + 1;
            const done = n < stepNum;
            const active = n === stepNum;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    done ? 'bg-emerald-600 text-white'
                         : active ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-600'
                                  : 'bg-slate-100 text-slate-400'
                  }`}>
                    {done ? <CheckCircle2 size={14}/> : n}
                  </div>
                  <div className={`text-xs font-medium ${active ? 'text-emerald-700' : done ? 'text-slate-700' : 'text-slate-400'}`}>{label}</div>
                </div>
                {n < 4 && <div className={`flex-1 h-px ${done ? 'bg-emerald-600' : 'bg-slate-200'}`}/>}
              </div>
            );
          })}
        </div>

        {/* STEP 1: Category */}
        {step === 'category' && (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">What&apos;s the issue category?</h2>
            <p className="text-slate-500 mb-6">Pick the area that best matches your concern.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categoryNames.map(c => (
                <button key={c} type="button" onClick={() => { setCategory(c); setSub(''); setOtherTitle(''); setStep('subcategory'); }}
                  className={`p-4 border-2 rounded-xl text-left transition hover:border-emerald-500 hover:bg-emerald-50 ${category === c ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200'}`}>
                  <div className="font-semibold text-slate-900">{c}</div>
                  <div className="text-xs text-slate-500 mt-1">{(grouped[c].length - 1)} sub-categories</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 2: Sub-category */}
        {step === 'subcategory' && (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Pick a sub-category</h2>
            <p className="text-slate-500 mb-6">Under <strong>{category}</strong>. If none fit, pick &quot;Other&quot;.</p>

            <div className="space-y-2 mb-4">
              {grouped[category].map(c => (
                <button key={c.id} type="button" onClick={() => setSub(c.sub_category)}
                  className={`w-full p-3 border-2 rounded-lg text-left transition hover:border-emerald-500 hover:bg-emerald-50 ${sub === c.sub_category ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{c.sub_category}</span>
                    {sub === c.sub_category && <CheckCircle2 className="text-emerald-600" size={18}/>}
                  </div>
                </button>
              ))}
            </div>

            {isOther && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <label htmlFor="other-title" className="text-xs font-semibold text-amber-900 uppercase">Brief title for your issue</label>
                <input
                  id="other-title"
                  value={otherTitle} onChange={e => setOtherTitle(e.target.value)} autoFocus
                  placeholder="e.g. Cold storage temperature alert"
                  className="w-full mt-1 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <div className="text-xs text-amber-800 mt-1">A few words. You&apos;ll describe it in detail next.</div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setStep('category')} className="text-sm text-slate-600 hover:text-slate-900 px-4 py-2">← Back</button>
              <button type="button" onClick={() => setStep('describe')} disabled={!sub || (isOther && !otherTitle.trim())}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2">
                Continue <ChevronRight size={16}/>
              </button>
            </div>
          </>
        )}

        {/* STEP 3: Describe */}
        {step === 'describe' && (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Describe the issue</h2>
            <p className="text-slate-500 mb-6">
              <span className="text-emerald-700 font-medium">{category}</span> · <span className="text-emerald-700 font-medium">{isOther && otherTitle ? `Other: ${otherTitle}` : sub}</span> — give as much detail as possible.
            </p>

            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={6} autoFocus
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
              placeholder="What exactly is happening? When did it start? Any error messages? Any specific SKU / amount / staff name involved?" />
            <div className="text-xs text-slate-500 mt-1">{desc.length} characters · minimum 15 to continue</div>

            <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setStep('subcategory')} className="text-sm text-slate-600 hover:text-slate-900 px-4 py-2">← Back</button>
              <button type="button" onClick={() => setStep('suggestions')} disabled={desc.trim().length < 15}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2">
                <Search size={16}/> Check knowledge base
              </button>
            </div>
          </>
        )}

        {/* STEP 4: Suggestions + submit */}
        {step === 'suggestions' && (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              {suggestions.length > 0 ? `We found ${suggestions.length} possible answer${suggestions.length !== 1 ? 's' : ''}` : 'Ready to raise your ticket'}
            </h2>
            <p className="text-slate-500 mb-6">
              {suggestions.length > 0
                ? 'Click to expand. If one of these solves it, you don\'t need to raise a ticket.'
                : 'No matches in our knowledge base — we\'ll route this to the right team.'}
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Your ticket</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Category:</span> <span className="font-medium">{category}</span></div>
                <div><span className="text-slate-500">Sub-category:</span> <span className="font-medium">{isOther && otherTitle ? `Other: ${otherTitle}` : sub}</span></div>
                <div><span className="text-slate-500">Priority:</span> <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(effectivePriority)}`}>{effectivePriority}</span></div>
                <div><span className="text-slate-500">Routes to:</span> <span className="font-medium">{effectiveTeam}</span></div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="text-xs text-slate-500 mb-1">Description</div>
                <div className="text-sm text-slate-800 whitespace-pre-line">{desc}</div>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-3 mb-6">
                <div className="text-xs font-semibold text-slate-500 uppercase">Possible answers from our knowledge base</div>
                {suggestions.map(s => (
                  <div key={s.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button type="button" onClick={() => setExpandedKb(expandedKb === s.id ? null : s.id)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 text-left">
                      <div>
                        <div className="text-xs text-emerald-700 font-medium">{s.category} · {s.sub_category}</div>
                        <div className="font-medium text-slate-900 mt-0.5">{s.question}</div>
                      </div>
                      <ChevronRight className={`text-slate-400 transition ${expandedKb === s.id ? 'rotate-90' : ''}`} size={20}/>
                    </button>
                    {expandedKb === s.id && (
                      <div className="px-4 py-4 bg-emerald-50 border-t border-emerald-200">
                        <div className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{s.answer}</div>
                        <div className="mt-4 flex gap-2">
                          <Link href="/sp" className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2"><CheckCircle2 size={16}/> This solved it</Link>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {error && <div className="text-rose-600 text-sm bg-rose-50 p-2 rounded mb-4">{error}</div>}

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setStep('describe')} className="text-sm text-slate-600 hover:text-slate-900 px-4 py-2">← Edit description</button>
              <button type="button" onClick={submit} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2">
                <Send size={16}/> {isPending ? 'Submitting…' : 'Submit ticket'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
