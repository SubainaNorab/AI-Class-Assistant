# Backend/utils/explainer_llm.py
import os, requests, textwrap
from typing import List, Dict

SYSTEM_PROMPT = (
    "You are a teaching assistant. Explain complex ideas simply for university students. "
    "Give a concise explanation, one short concrete example, and an optional analogy."
)

def _together_chat(prompt: str) -> str:
    api_key = os.getenv("TOGETHER_API_KEY")
    if not api_key:
        return ("- Core idea: (no LLM key set)\n"
                "- Simple explanation (2-3 lines): This sentence seems dense; break it into smaller ideas and define jargon.\n"
                "- Example: e.g., compare each ‘layer’ to steps in a recipe.\n"
                "- Analogy (optional): Like translating technical terms into everyday language.")
    url = "https://api.together.xyz/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    data = {
        "model": "mistralai/Mixtral-8x7B-Instruct-v0.1",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 400
    }
    r = requests.post(url, json=data, headers=headers, timeout=60)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip()

def explain_sentence(sentence: str) -> str:
    prompt = textwrap.dedent(f"""
    Identify the key idea and explain it simply in 2-3 lines.
    Then provide ONE short example and (optional) an analogy.

    Sentence:
    \"\"\"{sentence}\"\"\"

    Format:
    - Core idea:
    - Simple explanation (2-3 lines):
    - Example:
    - Analogy (optional):
    """)
    try:
        return _together_chat(prompt)
    except Exception as e:
        return f"- Core idea: (error)\n- Simple explanation: {e}\n- Example: —\n- Analogy (optional): —"

def explain_difficult_parts(parts: List[Dict]) -> List[Dict]:
    results = []
    for item in parts:
        exp = explain_sentence(item["sentence"])
        results.append({
            "difficult_part": item["sentence"],
            "reasons": item["reasons"],
            "score": item["score"],
            "explanation": exp
        })
    return results
