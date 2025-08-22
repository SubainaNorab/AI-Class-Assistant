# Backend/utils/complexity_analyzer.py
import re
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords

# Ensure NLTK resources are available
try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt")

try:
    nltk.data.find("corpora/stopwords")
except LookupError:
    nltk.download("stopwords")


class ComplexityAnalyzer:
    def __init__(self):
        self.stop_words = set(stopwords.words("english"))
        self.academic_terms = self._load_academic_terms()

    def _load_academic_terms(self):
        """Load a set of uncommon academic terms for heuristic complexity scoring"""
        academic_terms = [
            "paradigm", "epistemology", "ontology", "methodology",
            "heuristic", "algorithm", "quantum", "theorem", "hypothesis",
            "empirical", "theoretical", "framework", "construct", "variable",
            "correlation", "causation", "quantitative", "qualitative",
            "metaphysics", "phenomenology", "hermeneutics", "dialectic",
        ]
        return set(academic_terms)

    def _calculate_sentence_complexity(self, sentence: str) -> float:
        """Calculate a heuristic complexity score for a sentence"""
        words = word_tokenize(sentence.lower())
        content_words = [
            word for word in words if word.isalpha() and word not in self.stop_words
        ]

        if not content_words:
            return 0

        word_count = len(content_words)
        academic_term_count = sum(1 for word in content_words if word in self.academic_terms)
        avg_word_length = sum(len(word) for word in content_words) / len(content_words)

        # Weighted heuristic formula
        complexity_score = (
            (word_count * 0.3)
            + (academic_term_count * 2.0)
            + (avg_word_length * 0.5)
        )
        return complexity_score

    def find_difficult_parts(self, text: str, threshold: float = 5.0):
        """
        Identify difficult parts of text using heuristics.

        Args:
            text: Input text
            threshold: Minimum complexity score for a sentence to be flagged

        Returns:
            List[Dict] of difficult sentences
        """
        sentences = sent_tokenize(text)
        difficult_parts = []

        for sentence in sentences:
            if len(sentence.split()) < 5:  # skip trivial sentences
                continue

            complexity_score = self._calculate_sentence_complexity(sentence)

            if complexity_score >= threshold:
                difficult_parts.append({
                    "sentence": sentence.strip(),
                    "score": round(complexity_score, 2),
                    "reasons": [
                        "High word count" if len(sentence.split()) > 15 else None,
                        "Contains academic terms" if any(
                            word in sentence.lower() for word in self.academic_terms
                        ) else None,
                        "Uses long words" if complexity_score > 8 else None,
                    ],
                })

        # remove None values from reasons
        for part in difficult_parts:
            part["reasons"] = [r for r in part["reasons"] if r]

        return difficult_parts
