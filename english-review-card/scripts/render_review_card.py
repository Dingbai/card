#!/usr/bin/env python3
"""Validate quiz JSON and render a self-contained Codex HTML fragment."""

from __future__ import annotations

import hashlib
import html
import json
import sys
from pathlib import Path
from typing import Any

ALLOWED_TYPES = {"multiple_choice", "fill_in", "short_answer"}
REQUIRED_FIELDS = {"id", "type", "knowledge_point", "prompt", "accepted_answers", "explanation_en", "explanation_zh"}


def _text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be a non-empty string")
    return value.strip()


def validate_quiz(data: Any) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise ValueError("quiz must be a JSON object")
    _text(data.get("title"), "title")
    _text(data.get("source_summary"), "source_summary")
    questions = data.get("questions")
    if not isinstance(questions, list) or not 1 <= len(questions) <= 20:
        raise ValueError("questions must contain 1–20 items")
    ids: set[str] = set()
    types: set[str] = set()
    for index, question in enumerate(questions):
        label = f"questions[{index}]"
        if not isinstance(question, dict):
            raise ValueError(f"{label} must be an object")
        missing = REQUIRED_FIELDS - question.keys()
        if missing:
            raise ValueError(f"{label} is missing: {', '.join(sorted(missing))}")
        question_id = _text(question["id"], f"{label}.id")
        if question_id in ids:
            raise ValueError(f"duplicate question id: {question_id}")
        ids.add(question_id)
        question_type = question["type"]
        if question_type not in ALLOWED_TYPES:
            raise ValueError(f"{label}.type must be one of {sorted(ALLOWED_TYPES)}")
        types.add(question_type)
        for field in ("knowledge_point", "prompt", "explanation_en", "explanation_zh"):
            _text(question[field], f"{label}.{field}")
        answers = question["accepted_answers"]
        if not isinstance(answers, list) or not answers:
            raise ValueError(f"{label}.accepted_answers must be a non-empty list")
        cleaned_answers = [_text(value, f"{label}.accepted_answers") for value in answers]
        if len({value.casefold() for value in cleaned_answers}) != len(cleaned_answers):
            raise ValueError(f"{label}.accepted_answers must be unique")
        if question_type == "multiple_choice":
            options = question.get("options")
            if not isinstance(options, list) or not 2 <= len(options) <= 6:
                raise ValueError(f"{label}.options must contain 2–6 items")
            cleaned_options = [_text(value, f"{label}.options") for value in options]
            if len(set(cleaned_options)) != len(cleaned_options):
                raise ValueError(f"{label}.options must be unique")
            if not any(answer in cleaned_options for answer in cleaned_answers):
                raise ValueError(f"{label} needs an accepted answer matching an option")
        elif "options" in question:
            raise ValueError(f"{label}.options is only valid for multiple_choice")
    return data


def _safe_json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e")


def render_fragment(data: dict[str, Any]) -> str:
    digest = hashlib.sha256(_safe_json(data).encode()).hexdigest()[:10]
    root_id = f"english-review-{digest}"
    quiz_json = _safe_json(data)
    question_count = len(data["questions"])
    return f'''<section id="{root_id}" class="erc-shell" aria-label="English review card">
<style>
#{root_id}{{color-scheme:light dark;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:light-dark(#172033,#eef2ff);width:100%;max-width:680px;margin:8px auto}}#{root_id} *{{box-sizing:border-box}}#{root_id} .erc-panel{{display:flex;min-height:720px;flex-direction:column;background:light-dark(#fff,#171a23);border:1px solid light-dark(#dce2ee,#343948);border-radius:20px;box-shadow:0 14px 36px light-dark(rgba(35,52,90,.1),rgba(0,0,0,.28));overflow:hidden}}#{root_id} .erc-hero{{padding:24px;background:light-dark(linear-gradient(135deg,#f7f9ff,#eef2ff),linear-gradient(135deg,#1d2230,#202640))}}#{root_id} .erc-kicker{{margin:0 0 8px;color:light-dark(#315cff,#9fb2ff);font-size:12px;font-weight:500;letter-spacing:.08em;text-transform:uppercase}}#{root_id} h2{{margin:0;font-size:clamp(22px,4vw,30px);line-height:1.2}}#{root_id} .erc-source{{margin:10px 0 0;color:light-dark(#5e687c,#b4bdd1);font-size:14px;line-height:1.55}}#{root_id} .erc-body{{display:flex;flex:1;flex-direction:column;padding:24px}}#{root_id} .erc-start{{display:grid;gap:16px;text-align:center;padding:14px 0 6px}}#{root_id} .erc-start p{{margin:0;color:light-dark(#5e687c,#b4bdd1)}}#{root_id} button{{font:inherit}}#{root_id} .erc-primary,#{root_id} .erc-secondary{{min-height:44px;border-radius:12px;padding:11px 18px;font-weight:500;cursor:pointer}}#{root_id} .erc-primary{{border:0;color:#fff;background:#315cff;box-shadow:0 8px 18px rgba(49,92,255,.25)}}#{root_id} .erc-primary:hover{{background:#244de6}}#{root_id} .erc-primary:disabled{{cursor:default;opacity:.55;box-shadow:none}}#{root_id} .erc-progress-row{{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;color:light-dark(#5e687c,#b4bdd1);font-size:13px}}#{root_id} .erc-progress{{height:7px;background:light-dark(#e7ebf3,#2a3040);border-radius:99px;overflow:hidden;margin-bottom:22px}}#{root_id} .erc-progress>span{{display:block;height:100%;background:#315cff;transition:width .25s ease}}#{root_id} .erc-type{{color:light-dark(#315cff,#9fb2ff);font-size:12px;font-weight:500}}#{root_id} .erc-prompt{{margin:8px 0 18px;font-size:20px;line-height:1.45}}#{root_id} .erc-options{{display:grid;gap:10px;border:0;padding:0;margin:0 0 18px}}#{root_id} .erc-option{{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border:1px solid light-dark(#d7ddea,#41485a);border-radius:12px;cursor:pointer;line-height:1.4}}#{root_id} .erc-option:has(input:checked){{border-color:#315cff;background:light-dark(#f1f4ff,#242c49)}}#{root_id} input[type=radio]{{margin-top:3px;accent-color:#315cff}}#{root_id} .erc-text{{width:100%;min-height:46px;border:1px solid light-dark(#cfd6e5,#4a5266);border-radius:12px;padding:11px 13px;color:inherit;background:light-dark(#fff,#11141c);font:inherit;margin-bottom:18px}}#{root_id} textarea.erc-text{{min-height:92px;resize:vertical}}#{root_id} .erc-feedback{{margin:16px 0;padding:14px;border-radius:12px;line-height:1.5}}#{root_id} .erc-feedback[data-correct=true]{{background:light-dark(#eaf8f0,#173428);border:1px solid light-dark(#a9dfbe,#286846)}}#{root_id} .erc-feedback[data-correct=false]{{background:light-dark(#fff0ef,#402221);border:1px solid light-dark(#f0b5b0,#7c3d39)}}#{root_id} .erc-feedback strong{{display:block;margin-bottom:6px}}#{root_id} .erc-feedback p{{margin:5px 0}}#{root_id} .erc-actions{{display:flex;justify-content:flex-end;gap:10px}}#{root_id} .erc-result{{text-align:center;padding:8px 0 20px}}#{root_id} .erc-score{{font-size:48px;font-weight:500;letter-spacing:-.04em;margin:8px 0 30px}}#{root_id} .erc-result-list{{display:grid;gap:10px;text-align:left;margin:22px 0}}#{root_id} .erc-result-item{{padding:12px 14px;border:1px solid light-dark(#dce2ee,#343948);border-radius:12px}}#{root_id} .erc-result-item p{{margin:5px 0 0;color:light-dark(#5e687c,#b4bdd1);font-size:13px}}#{root_id} .erc-status{{min-height:20px;margin-top:10px;color:light-dark(#5e687c,#b4bdd1);font-size:13px}}#{root_id} [data-view=quiz],#{root_id} [data-view=result]{{width:100%}}#{root_id} [hidden]{{display:none!important}}@media(max-width:480px){{#{root_id} .erc-panel{{min-height:760px}}#{root_id} .erc-hero,#{root_id} .erc-body{{padding:18px}}#{root_id} .erc-actions{{flex-direction:column}}#{root_id} .erc-actions button{{width:100%}}}}
#{root_id} .erc-hero{{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}}#{root_id} .erc-heading{{min-width:0}}#{root_id} .erc-settings-button{{flex:0 0 auto;min-height:40px;border:1px solid light-dark(#cfd6e5,#4a5266);border-radius:12px;padding:9px 14px;color:inherit;background:light-dark(rgba(255,255,255,.72),rgba(17,20,28,.62));font-weight:500;cursor:pointer}}#{root_id} .erc-settings{{display:grid;gap:22px}}#{root_id} .erc-settings h3{{margin:0;font-size:22px}}#{root_id} .erc-settings-group{{display:grid;gap:10px;border:0;margin:0;padding:0}}#{root_id} .erc-settings-group legend{{margin-bottom:10px;font-weight:600}}#{root_id} .erc-check{{display:flex;align-items:center;gap:10px;padding:11px 13px;border:1px solid light-dark(#d7ddea,#41485a);border-radius:12px}}#{root_id} .erc-check input{{width:18px;height:18px;accent-color:#315cff}}#{root_id} .erc-count{{display:block;width:100%;min-height:46px;margin-top:8px;border:1px solid light-dark(#cfd6e5,#4a5266);border-radius:12px;padding:10px 12px;color:inherit;background:light-dark(#fff,#11141c);font:inherit}}#{root_id} [data-view=settings]{{width:100%}}
#{root_id} .erc-panel{{min-height:0}}
</style>
<div class="erc-panel"><header class="erc-hero"><div class="erc-heading"><p class="erc-kicker">Daily English Review</p><h2>{html.escape(data['title'])}</h2><p class="erc-source">{html.escape(data['source_summary'])}</p></div><button type="button" class="erc-settings-button" data-action="settings" aria-label="复习卡片设置">设置</button></header><div class="erc-body"><div data-view="start" class="erc-start"><p>{question_count} questions · Configurable practice · Bilingual feedback</p><button type="button" class="erc-primary" data-action="start">开始今日复习</button></div><div data-view="settings" hidden></div><div data-view="quiz" aria-live="polite" hidden></div><div data-view="result" aria-live="polite" hidden></div></div></div>
<script>(()=>{{const root=document.getElementById("{root_id}"),quiz={quiz_json},state={{index:0,answers:[],locked:false}},startView=root.querySelector('[data-view="start"]'),quizView=root.querySelector('[data-view="quiz"]'),resultView=root.querySelector('[data-view="result"]');const esc=v=>String(v).replace(/[&<>"']/g,c=>({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}}[c]));const norm=v=>String(v).normalize('NFKC').toLocaleLowerCase().replace(/[“”‘’]/g,"'").replace(/[^\\p{{L}}\\p{{N}}']+/gu,' ').trim();const labels={{multiple_choice:'Multiple choice · 选择题',fill_in:'Fill in the blank · 填空题',short_answer:'Short answer · 简答题'}};
function show(view){{root.querySelectorAll('[data-view]').forEach(item=>item.hidden=item!==view)}}
function openSettings(){{const settingsView=root.querySelector('[data-view="settings"]'),currentTypes=[...new Set(quiz.questions.map(q=>q.type))];settingsView.dataset.previous=!resultView.hidden?'result':!quizView.hidden?'quiz':'start';settingsView.innerHTML=`<div class="erc-settings"><div><p class="erc-kicker">Review settings</p><h3>更新复习方式</h3></div><label>题目数量（1–20）<input class="erc-count" type="number" min="1" max="20" value="${{quiz.questions.length}}" data-setting-count></label><fieldset class="erc-settings-group"><legend>题型</legend>${{Object.entries(labels).map(([value,label])=>`<label class="erc-check"><input type="checkbox" value="${{value}}" data-setting-type ${{currentTypes.includes(value)?'checked':''}}><span>${{label}}</span></label>`).join('')}}</fieldset><div class="erc-actions"><button type="button" class="erc-secondary" data-action="cancel-settings">取消</button><button type="button" class="erc-primary" data-action="apply-settings">更新卡片</button></div><div class="erc-status" role="status"></div></div>`;show(settingsView)}}
async function applySettings(){{const settingsView=root.querySelector('[data-view="settings"]'),count=Math.max(1,Math.min(20,Number(settingsView.querySelector('[data-setting-count]').value)||quiz.questions.length)),types=[...settingsView.querySelectorAll('[data-setting-type]:checked')].map(input=>input.value),status=settingsView.querySelector('.erc-status');if(!types.length){{status.textContent='请至少选择一种题型。';return}}if(!window.openai?.sendFollowUpMessage){{status.textContent='当前客户端不支持更新，请在对话中告诉 Codex 题型和数量。';return}}const button=settingsView.querySelector('[data-action="apply-settings"]');button.disabled=true;status.textContent='正在按新设置生成…';const typeNames=types.map(type=>labels[type].split(' · ')[1]).join('、'),prompt=`使用 $english-review-card 根据当前英语学习对话重新生成复习卡片。生成 ${{count}} 道题；只使用这些题型：${{typeNames}}。题目仍须严格依据当前对话材料。`;try{{await window.openai.sendFollowUpMessage({{prompt,title:'更新英语复习卡片'}});status.textContent='设置已发送。'}}catch(error){{button.disabled=false;status.textContent='更新失败，请稍后重试。'}}}}
function selected(q){{if(q.type==='multiple_choice')return quizView.querySelector('input[name="erc-answer"]:checked')?.value||'';return quizView.querySelector('[data-answer-input]')?.value.trim()||''}}
function renderQuestion(){{const q=quiz.questions[state.index],total=quiz.questions.length;const input=q.type==='multiple_choice'?`<fieldset class="erc-options">${{q.options.map((o,i)=>`<label class="erc-option"><input type="radio" name="erc-answer" value="${{esc(o)}}"><span>${{String.fromCharCode(65+i)}}. ${{esc(o)}}</span></label>`).join('')}}</fieldset>`:q.type==='short_answer'?'<textarea class="erc-text" data-answer-input aria-label="Your answer" placeholder="Write your answer in English…"></textarea>':'<input class="erc-text" data-answer-input aria-label="Your answer" placeholder="Type your answer…">';quizView.innerHTML=`<div class="erc-progress-row"><span>Question ${{state.index+1}} of ${{total}}</span><span>${{state.answers.filter(a=>a.correct).length}} correct</span></div><div class="erc-progress" aria-hidden="true"><span style="width:${{state.index/total*100}}%"></span></div><div class="erc-type">${{labels[q.type]}}</div><h3 class="erc-prompt">${{esc(q.prompt)}}</h3>${{input}}<div data-feedback></div><div class="erc-actions"><button type="button" class="erc-primary" data-action="submit">提交答案</button></div>`;state.locked=false}}
function submit(){{if(state.locked)return;const q=quiz.questions[state.index],answer=selected(q);if(!answer){{quizView.querySelector('[data-answer-input]')?.focus();return}}const correct=q.accepted_answers.some(expected=>norm(expected)===norm(answer));state.answers.push({{id:q.id,answer,correct,knowledgePoint:q.knowledge_point,prompt:q.prompt}});state.locked=true;quizView.querySelectorAll('input,textarea').forEach(el=>el.disabled=true);quizView.querySelector('[data-feedback]').innerHTML=`<div class="erc-feedback" data-correct="${{correct}}"><strong>${{correct?'Correct! 答对了':'Keep going! 再想一想'}}</strong>${{correct?'':`<p><b>Answer:</b> ${{esc(q.accepted_answers[0])}}</p>`}}<p>${{esc(q.explanation_en)}}</p><p>${{esc(q.explanation_zh)}}</p></div>`;quizView.querySelector('.erc-actions').innerHTML=`<button type="button" class="erc-primary" data-action="next">${{state.index===quiz.questions.length-1?'查看成绩':'下一题'}}</button>`}}
function renderResult(){{quizView.hidden=true;resultView.hidden=false;const total=quiz.questions.length,correctCount=state.answers.filter(a=>a.correct).length,missed=state.answers.filter(a=>!a.correct),detail=quiz.questions.map((q,i)=>`<div class="erc-result-item"><strong>${{state.answers[i].correct?'✓':'○'}} ${{esc(q.knowledge_point)}}</strong><p>${{esc(q.explanation_en)}} / ${{esc(q.explanation_zh)}}</p></div>`).join('');resultView.innerHTML=`<div class="erc-result"><p class="erc-kicker">Review complete</p><div class="erc-score">${{correctCount}}/${{total}}</div><p>${{correctCount===total?'Excellent — 全部答对！':'Nice work — 错题会变成下一轮练习。'}}</p></div><div class="erc-result-list">${{detail}}</div><div class="erc-actions"><button type="button" class="erc-primary" data-action="followup">${{missed.length?'复练错题':'再来一组'}}</button></div><div class="erc-status" role="status"></div>`}}
async function followup(){{const missed=state.answers.filter(a=>!a.correct),types=[...new Set(quiz.questions.map(q=>labels[q.type].split(' · ')[1]))].join('、'),config=`保持 ${{quiz.questions.length}} 道题，只使用这些题型：${{types}}。`,prompt=missed.length?`使用 $english-review-card 再生成一轮不同的英语复习题。${{config}}只围绕这些错题知识点：${{missed.map(a=>a.knowledgePoint).join('；')}}。依据仍限于当前学习对话，不要重复原题措辞。`:`使用 $english-review-card 根据当前学习对话再生成一组不同的英语复习题。${{config}}不要重复原题措辞。`,status=resultView.querySelector('.erc-status');if(!window.openai?.sendFollowUpMessage){{status.textContent='当前客户端不支持跟进消息，请在对话中输入“复练错题”。';return}}const button=resultView.querySelector('[data-action="followup"]');button.disabled=true;status.textContent='正在交给 Codex 生成下一轮…';try{{await window.openai.sendFollowUpMessage({{prompt,title:missed.length?'生成错题复练':'再生成一组'}});status.textContent='已发送。'}}catch(error){{button.disabled=false;status.textContent='发送失败，请稍后重试。'}}}}
root.addEventListener('click',event=>{{const action=event.target.closest('[data-action]')?.dataset.action;if(action==='settings')openSettings();if(action==='cancel-settings')show(root.querySelector(`[data-view="${{root.querySelector('[data-view="settings"]').dataset.previous}}"]`));if(action==='apply-settings')applySettings();if(action==='start'){{show(quizView);renderQuestion()}}if(action==='submit')submit();if(action==='next'){{state.index+=1;state.index<quiz.questions.length?renderQuestion():renderResult()}}if(action==='followup')followup()}});root.addEventListener('keydown',event=>{{if(event.key==='Enter'&&!event.shiftKey&&event.target.matches('input[data-answer-input]')){{event.preventDefault();submit()}}}})}})();</script></section>'''


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("usage: render_review_card.py QUESTIONS.json OUTPUT.html", file=sys.stderr)
        return 2
    try:
        data = validate_quiz(json.loads(Path(argv[1]).read_text(encoding="utf-8")))
        destination = Path(argv[2]).resolve()
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(render_fragment(data), encoding="utf-8")
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    print(destination)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
